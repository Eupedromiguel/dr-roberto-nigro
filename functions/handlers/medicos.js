const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Inicializa o Admin SDK apenas uma vez
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * ==========================================================
 * Criar slot de disponibilidade
 * ==========================================================
 */
exports.criarSlot = onCall(async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");

  const role = request.auth.token.role;
  if (role !== "doctor")
    throw new HttpsError("permission-denied", "Apenas médicos podem criar slots.");

  const uid = request.auth.uid;
  const { data, hora, status = "livre" } = request.data || {};

  if (!data || !hora) {
    throw new HttpsError("invalid-argument", "Campos obrigatórios: data e hora.");
  }

  try {
    // 🧩 Converte "YYYY-MM-DD" (input) para "DD-MM-YYYY" (formato humano)
    const partes = data.split("-");
    if (partes.length !== 3) {
      throw new HttpsError("invalid-argument", "Formato de data inválido (esperado YYYY-MM-DD).");
    }
    const dataFormatada = `${partes[2]}-${partes[1]}-${partes[0]}`; // DD-MM-YYYY

    // Bloqueia slots no passado
    const agora = new Date();
    const currentY = agora.getFullYear();
    const currentM = String(agora.getMonth() + 1).padStart(2, "0");
    const currentD = String(agora.getDate()).padStart(2, "0");
    const todayISO = `${currentY}-${currentM}-${currentD}`;
    const nowHM = `${String(agora.getHours()).padStart(2, "0")}:${String(agora.getMinutes()).padStart(2, "0")}`;
    const [ddF, mmF, yyyyF] = dataFormatada.split("-");
    const iso = `${yyyyF}-${mmF}-${ddF}`;
    if (iso < todayISO || (iso === todayISO && hora <= nowHM)) {
      throw new HttpsError("failed-precondition", "Não é permitido criar slot no passado.");
    }

    // Verifica conflito
    const conflitoSnap = await db
      .collection("availability_slots")
      .where("medicoId", "==", uid)
      .where("data", "==", dataFormatada)
      .where("hora", "==", hora)
      .limit(1)
      .get();

    if (!conflitoSnap.empty) {
      const doc = conflitoSnap.docs[0];
      const existente = { id: doc.id, ...doc.data() };

      // Reativa se estiver cancelado
      if (existente.status === "cancelado") {
        await doc.ref.update({
          status: "livre",
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log(`♻️ Slot reativado: ${dataFormatada} ${hora} — médico ${uid}`);
        return { sucesso: true, mensagem: "Slot reaberto com sucesso." };
      }

      throw new HttpsError("already-exists", "Já existe um slot para este dia e hora.");
    }

    // Cria novo slot
    await db.collection("availability_slots").add({
      medicoId: uid,
      data: dataFormatada,
      hora,
      status,
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Slot criado: ${dataFormatada} às ${hora} — médico ${uid}`);
    return { sucesso: true, mensagem: "Slot criado com sucesso." };
  } catch (error) {
    console.error("❌ Erro ao criar slot:", error);
    throw new HttpsError("internal", "Erro ao criar o slot.", error.message);
  }
});

/**
 * ==========================================================
 * Atualizar slot
 * ==========================================================
 */
exports.atualizarSlot = onCall(async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");

  const role = request.auth.token.role;
  if (role !== "doctor")
    throw new HttpsError("permission-denied", "Apenas médicos podem atualizar slots.");

  const uid = request.auth.uid;
  const { slotId, status, data, hora } = request.data || {};

  if (!slotId)
    throw new HttpsError("invalid-argument", "O campo 'slotId' é obrigatório.");

  try {
    const slotRef = db.collection("availability_slots").doc(slotId);
    const snap = await slotRef.get();

    if (!snap.exists) throw new HttpsError("not-found", "Slot não encontrado.");

    const slot = snap.data();
    if (slot.medicoId !== uid) {
      throw new HttpsError("permission-denied", "Você só pode atualizar seus próprios slots.");
    }

    const updates = {};
    if (typeof status === "string") updates.status = status;
    if (typeof data === "string") {
      const partes = data.split("-");
      updates.data =
        partes.length === 3 && partes[0].length === 4
          ? `${partes[2]}-${partes[1]}-${partes[0]}`
          : data;
    }
    if (typeof hora === "string") updates.hora = hora;
    updates.atualizadoEm = admin.firestore.FieldValue.serverTimestamp();

    await slotRef.update(updates);
    console.log(`✏️ Slot atualizado (${slotId}):`, updates);
    return { sucesso: true, mensagem: "Slot atualizado com sucesso." };
  } catch (error) {
    console.error("❌ Erro ao atualizar slot:", error);
    throw new HttpsError("internal", "Erro ao atualizar o slot.", error.message);
  }
});

/**
 * ==========================================================
 * Cancelar slot (sem excluir)
 * ==========================================================
 */
exports.deletarSlot = onCall(async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");

  const role = request.auth.token.role;
  if (role !== "doctor")
    throw new HttpsError("permission-denied", "Apenas médicos podem cancelar slots.");

  const uid = request.auth.uid;
  const { slotId } = request.data || {};

  if (!slotId)
    throw new HttpsError("invalid-argument", "O campo 'slotId' é obrigatório.");

  try {
    const slotRef = db.collection("availability_slots").doc(slotId);
    const snap = await slotRef.get();
    if (!snap.exists) throw new HttpsError("not-found", "Slot não encontrado.");

    const slot = snap.data();
    if (slot.medicoId !== uid)
      throw new HttpsError("permission-denied", "Você só pode cancelar seus próprios slots.");

    // Atualiza consultas associadas
    const consultasSnap = await db
      .collection("appointments")
      .where("slotId", "==", slotId)
      .get();

    if (!consultasSnap.empty) {
      for (const doc of consultasSnap.docs) {
        await doc.ref.update({
          status: "cancelada",
          atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
    }

    // Marca slot como cancelado
    await slotRef.update({
      status: "cancelado",
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`🟡 Slot ${slotId} cancelado (médico ${uid})`);
    return { sucesso: true, mensagem: "Slot cancelado com sucesso." };
  } catch (error) {
    console.error("❌ Erro ao cancelar slot:", error);
    throw new HttpsError("internal", "Erro ao cancelar o slot.", error.message);
  }
});

/**
 * ==========================================================
 * Reativar slot (cancelado → livre)
 * ==========================================================
 */
exports.reativarSlot = onCall(async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");

  const role = request.auth.token.role;
  if (role !== "doctor")
    throw new HttpsError("permission-denied", "Apenas médicos podem reabrir slots.");

  const uid = request.auth.uid;
  const { slotId } = request.data || {};
  if (!slotId)
    throw new HttpsError("invalid-argument", "O campo 'slotId' é obrigatório.");

  try {
    const slotRef = db.collection("availability_slots").doc(slotId);
    const snap = await slotRef.get();
    if (!snap.exists) throw new HttpsError("not-found", "Slot não encontrado.");

    const slot = snap.data();
    if (slot.medicoId !== uid)
      throw new HttpsError("permission-denied", "Você só pode alterar seus próprios slots.");

    if (slot.status !== "cancelado")
      throw new HttpsError("failed-precondition", "Slot não está cancelado.");

    await slotRef.update({
      status: "livre",
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`♻️ Slot ${slotId} reaberto (médico ${uid})`);
    return { sucesso: true, mensagem: "Slot reaberto com sucesso." };
  } catch (error) {
    console.error("❌ Erro ao reabrir slot:", error);
    throw new HttpsError("internal", "Erro ao reabrir o slot.", error.message);
  }
});

/**
 * ==========================================================
 * Listar slots do médico autenticado
 * ==========================================================
 */
exports.listarMeusSlots = onCall(async (request) => {
  if (!request.auth)
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");

  const role = request.auth.token.role;
  if (role !== "doctor")
    throw new HttpsError("permission-denied", "Apenas médicos podem listar slots.");

  const uid = request.auth.uid;

  try {
    const snap = await db
      .collection("availability_slots")
      .where("medicoId", "==", uid)
      .get();

    const slots = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log(`📅 ${slots.length} slots retornados para médico ${uid}`);
    return { sucesso: true, slots };
  } catch (error) {
    console.error("❌ Erro ao listar slots:", error);
    throw new HttpsError("internal", "Erro ao listar slots.", error.message);
  }
});

/**
 * ==========================================================
 * Listar slots públicos (para pacientes)
 * ==========================================================
 */
exports.listarSlotsPublicos = onCall(async (request) => {
  try {
    const snap = await db
      .collection("availability_slots")
      .where("status", "==", "livre")
      .get();

    const slots = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return { sucesso: true, slots };
  } catch (error) {
    console.error("Erro ao listar slots públicos:", error);
    throw new HttpsError("internal", "Erro ao listar slots públicos.");
  }
});
