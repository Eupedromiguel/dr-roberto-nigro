const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Criar consulta 
 */
exports.criarConsulta = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const role = request.auth.token.role;
  if (role !== "patient") {
    throw new HttpsError(
      "permission-denied",
      "Apenas pacientes podem agendar consultas."
    );
  }


  if (!request.auth.token.email_verified) {
    throw new HttpsError(
      "failed-precondition",
      "Você precisa verificar seu e-mail antes de agendar uma consulta."
    );
  }


  const pacienteId = request.auth.uid;
  const {
    medicoId,
    slotId,
    horario,
    sintomas,
    tipoAtendimento,
    convenio,
    tipoConsulta,
    unidade,
  } = request.data || {};


  // Validação de médico, slot e horário
  if (!medicoId || !slotId || !horario) {
    throw new HttpsError(
      "invalid-argument",
      "Campos obrigatórios: medicoId, slotId e horario."
    );
  }

  // Validação da unidade médica
  if (tipoConsulta !== "teleconsulta" && (!unidade || unidade.trim() === "")) {
    throw new HttpsError(
      "invalid-argument",
      "Unidade médica é obrigatória para consultas presenciais."
    );
  }

  // Se for teleconsulta, define unidade padrão
  const unidadeFinal =
    tipoConsulta === "teleconsulta"
      ? "Atendimento remoto - Teleconsulta"
      : unidade;


  try {
    // Verifica se o horário já está ocupado
    const conflitoSnap = await db
      .collection("appointments")
      .where("medicoId", "==", medicoId)
      .where("horario", "==", horario)
      .where("status", "in", ["agendado", "concluida"])
      .limit(1)
      .get();

    if (!conflitoSnap.empty) {
      throw new HttpsError("already-exists", "Esse horário já está ocupado.");
    }

    // Impede novo agendamento com o mesmo médico se houver retorno pendente ou consulta ativa
    const conflitoMesmoMedico = await db
      .collection("appointments")
      .where("pacienteId", "==", pacienteId)
      .where("medicoId", "==", medicoId)
      .where("status", "in", ["agendado", "confirmado", "retorno"])
      .limit(1)
      .get();

    if (!conflitoMesmoMedico.empty) {
      // Verifica se o conflito é um retorno
      const consultaConflito = conflitoMesmoMedico.docs[0].data();
      if (consultaConflito.status === "retorno") {
        throw new HttpsError(
          "failed-precondition",
          "Você já possui um retorno agendado com este médico. Aguarde a conclusão antes de marcar novamente."
        );
      } else {
        throw new HttpsError(
          "failed-precondition",
          "Você já possui uma consulta ativa com este médico. Aguarde a conclusão antes de marcar novamente."
        );
      }
    }
 

    // Cria a consulta
    const ref = await db.collection("appointments").add({
      pacienteId,
      medicoId,
      slotId,
      horario,
      tipoConsulta: tipoConsulta || "presencial", 
      sintomas: sintomas || null,
      tipoAtendimento: tipoAtendimento || "particular",
      convenio: tipoAtendimento === "convenio" ? convenio || null : null,
      unidade: unidadeFinal || "Não informado",
      status: "agendado",
      criadoEm: admin.firestore.FieldValue.serverTimestamp(),
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Atualiza o slot para "ocupado"
    await db.collection("availability_slots").doc(slotId).update({
      status: "ocupado",
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Retorna o ID do documento criado
    return {
      sucesso: true,
      id: ref.id,
      mensagem: "Consulta criada com sucesso.",
    };
  } catch (error) {
    console.error("Erro ao criar consulta:", error);
    throw new HttpsError("internal", "Erro ao criar a consulta.", error.message);
  }
});

/**

 * Cancelar consulta
 * ----------------------------------------------------------
 * - Paciente OU médico podem cancelar
 * - Marca como "cancelada" em vez de deletar
 */
exports.cancelarConsulta = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { consultaId } = request.data || {};
  if (!consultaId) {
    throw new HttpsError("invalid-argument", "O campo 'consultaId' é obrigatório.");
  }

  try {
    const consultaRef = db.collection("appointments").doc(consultaId);
    const snap = await consultaRef.get();

    if (!snap.exists) {
      throw new HttpsError("not-found", "Consulta não encontrada.");
    }

    const consulta = snap.data();
    const uid = request.auth.uid;

    // Permitir apenas médico ou paciente envolvidos
    if (consulta.pacienteId !== uid && consulta.medicoId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Apenas o médico ou o paciente podem cancelar esta consulta."
      );
    }

    // Atualiza o status
    await consultaRef.update({
      status: "cancelada",
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Libera o slot novamente (se existir)
    if (consulta.slotId) {
      await db.collection("availability_slots").doc(consulta.slotId).update({
        status: "livre",
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    console.log(`🟠 Consulta ${consultaId} marcada como cancelada.`);
    return { sucesso: true, mensagem: "Consulta cancelada com sucesso." };
  } catch (error) {
    console.error("Erro ao cancelar consulta:", error);
    throw new HttpsError("internal", "Erro ao cancelar a consulta.", error.message);
  }
});

/**
 * ==========================================================
 * Marcar como concluída
 * ----------------------------------------------------------
 * - Apenas o médico pode concluir
 * - Atualiza o status para "concluida"
 * ==========================================================
 */
exports.marcarComoConcluida = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { consultaId } = request.data || {};
  if (!consultaId) {
    throw new HttpsError("invalid-argument", "O campo 'consultaId' é obrigatório.");
  }

  try {
    const consultaRef = db.collection("appointments").doc(consultaId);
    const snap = await consultaRef.get();

    if (!snap.exists) {
      throw new HttpsError("not-found", "Consulta não encontrada.");
    }

    const consulta = snap.data();
    const uid = request.auth.uid;

    if (consulta.medicoId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Apenas o médico responsável pode concluir esta consulta."
      );
    }

    await consultaRef.update({
      status: "concluida",
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`🟢 Consulta ${consultaId} marcada como concluída.`);
    return {
      sucesso: true,
      mensagem: "Consulta marcada como concluída com sucesso.",
    };
  } catch (error) {
    console.error("Erro ao marcar como concluída:", error);
    throw new HttpsError("internal", "Erro ao concluir a consulta.", error.message);
  }
});

/**
 * ==========================================================
 * Listar consultas (para paciente, médico ou admin)
 * ----------------------------------------------------------
 * - Pacientes → vêem apenas as próprias
 * - Médicos → vêem apenas as suas
 * - Admin → vê TODAS as consultas
 * - Inclui dados de retorno (subcoleção)
 * ==========================================================
 */
exports.listarConsultas = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const uid = request.auth.uid;
  const role = request.auth.token.role || null;
  let query;

  try {
    if (role === "patient") {
      query = db.collection("appointments").where("pacienteId", "==", uid);
    } else if (role === "doctor") {
      query = db.collection("appointments").where("medicoId", "==", uid);
    } else if (role === "admin") {
      query = db.collection("appointments");
    } else {
      throw new HttpsError(
        "permission-denied",
        "Apenas pacientes, médicos ou administradores podem listar consultas."
      );
    }

    const snap = await query.get();
    const consultas = [];

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const consulta = { id: docSnap.id, ...data };

      // Buscar dados do paciente
      if (data.pacienteId) {
        try {
          const pacienteSnap = await db.collection("usuarios").doc(data.pacienteId).get();
          if (pacienteSnap.exists) {
            const p = pacienteSnap.data();
            consulta.paciente = {
              nome: p.nome || "Paciente sem nome",
              telefone: p.telefone || "",
              dataNascimento: p.dataNascimento || null,
            };
          } else {
            consulta.paciente = { nome: "Paciente não encontrado" };
          }
        } catch (err) {
          console.error("Erro ao buscar paciente:", err);
          consulta.paciente = { nome: "Erro ao buscar dados" };
        }
      }

      // Buscar dados do médico (para admins ou pacientes)
      if (role !== "doctor" && data.medicoId) {
        try {
          const medicoSnap = await db.collection("usuarios").doc(data.medicoId).get();
          if (medicoSnap.exists) {
            const m = medicoSnap.data();
            consulta.medico = {
              nome: m.nome || "Médico sem nome",
              especialidade: m.especialidade || "",
            };
          } else {
            consulta.medico = { nome: "Médico não encontrado" };
          }
        } catch (err) {
          console.error("Erro ao buscar médico:", err);
          consulta.medico = { nome: "Erro ao buscar dados" };
        }
      }

      // Buscar retorno agendado (subcoleção)
      try {
        const retornoSnap = await db
          .collection("appointments")
          .doc(consulta.id)
          .collection("retorno")
          .limit(1)
          .get();

        if (!retornoSnap.empty) {
          const r = retornoSnap.docs[0].data();
          consulta.retornoAgendado = {
            novaData: r.novaData,
            novoHorario: r.novoHorario,
            observacoes: r.observacoes || null,
          };
        } else {
          consulta.retornoAgendado = null;
        }
      } catch (err) {
        console.error("Erro ao buscar retorno:", err);
        consulta.retornoAgendado = null;
      }

      consultas.push(consulta);
    }

    console.log(`Usuário ${uid} (${role}) listou ${consultas.length} consultas.`);
    return { sucesso: true, consultas };
  } catch (error) {
    console.error("Erro ao listar consultas:", error);
    throw new HttpsError("internal", "Erro ao listar consultas.", error.message);
  }
});

/**
 * ==========================================================
 * Marcar como "retorno"
 * ----------------------------------------------------------
 * - Apenas o médico responsável pode definir uma consulta como retorno
 * - Atualiza o status para "retorno"
 * ==========================================================
 */
exports.marcarComoRetorno = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { consultaId } = request.data || {};
  if (!consultaId) {
    throw new HttpsError("invalid-argument", "O campo 'consultaId' é obrigatório.");
  }

  try {
    const consultaRef = db.collection("appointments").doc(consultaId);
    const snap = await consultaRef.get();

    if (!snap.exists) {
      throw new HttpsError("not-found", "Consulta não encontrada.");
    }

    const consulta = snap.data();
    const uid = request.auth.uid;

    // Apenas o médico responsável pode marcar como retorno
    if (consulta.medicoId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "Apenas o médico responsável pode marcar esta consulta como retorno."
      );
    }

    // Atualiza o status
    await consultaRef.update({
      status: "retorno",
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`🔵 Consulta ${consultaId} marcada como retorno pelo médico ${uid}.`);
    return {
      sucesso: true,
      mensagem: "Consulta marcada como retorno com sucesso.",
    };
  } catch (error) {
    console.error("Erro ao marcar como retorno:", error);
    throw new HttpsError("internal", "Erro ao marcar como retorno.", error.message);
  }
});

/**
 * ==========================================================
 * Agendar Retorno
 * ----------------------------------------------------------
 * - Apenas o médico responsável pode agendar o retorno
 * - O paciente tem direito a 1 único retorno
 * - Salva nova data/hora em appointments/{id}/retorno
 * ==========================================================
 */
exports.agendarRetorno = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Usuário não autenticado.");
  }

  const { consultaId, novaData, novoHorario, observacoes } = request.data || {};
  if (!consultaId || !novaData || !novoHorario) {
    throw new HttpsError("invalid-argument", "Campos obrigatórios ausentes.");
  }

  try {
    const consultaRef = db.collection("appointments").doc(consultaId);
    const snap = await consultaRef.get();

    if (!snap.exists) throw new HttpsError("not-found", "Consulta não encontrada.");

    const consulta = snap.data();
    const uid = request.auth.uid;

    // Apenas médico responsável pode remarcar
    if (consulta.medicoId !== uid) {
      throw new HttpsError("permission-denied", "Apenas o médico responsável pode agendar o retorno.");
    }

    const retornoRef = consultaRef.collection("retorno");
    const retornoSnap = await retornoRef.limit(1).get();

    if (!retornoSnap.empty) {
      // Atualiza o retorno existente
      const docId = retornoSnap.docs[0].id;
      await retornoRef.doc(docId).update({
        novaData,
        novoHorario,
        observacoes: observacoes || null,
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
    } else {
      // Cria novo retorno
      await retornoRef.add({
        novaData,
        novoHorario,
        observacoes: observacoes || null,
        criadoEm: admin.firestore.FieldValue.serverTimestamp(),
        atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // Atualiza status da consulta principal
    await consultaRef.update({
      status: "retorno",
      atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`🔵 Retorno atualizado/remarcado para consulta ${consultaId}.`);
    return { sucesso: true, mensagem: "Retorno agendado com sucesso." };
  } catch (error) {
    console.error("Erro ao agendar retorno:", error);
    throw new HttpsError("internal", "Erro ao agendar o retorno.", error.message);
  }
});
