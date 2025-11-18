import { useEffect, useState } from "react";
import { db } from "../../services/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  getDoc,
  doc,
} from "firebase/firestore";
import { XCircle } from "lucide-react";

export default function AdminNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [removendo, setRemovendo] = useState({});


  // ================================
  // BUSCAR CONSULTAS PENDENTES
  // ================================
  useEffect(() => {
    const q = query(
      collection(db, "appointments"),
      where("tipoAtendimento", "==", "convenio"),
      where("status", "==", "agendado"),
      where("notificacaoStatus", "==", "pendente"),
      orderBy("criadoEm", "desc")
    );

    const unsub = onSnapshot(q, async (snapshot) => {
      const baseData = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

      // Enriquecer com dados de paciente e médico
      const completos = await Promise.all(
        baseData.map(async (item) => {
          let paciente = {};
          let medico = {};

          // Buscar paciente
          if (item.pacienteId) {
            const pSnap = await getDoc(doc(db, "usuarios", item.pacienteId));
            if (pSnap.exists()) paciente = pSnap.data();
          }

          // Buscar médico
          if (item.medicoId) {
            const mSnap = await getDoc(doc(db, "usuarios", item.medicoId));
            if (mSnap.exists()) medico = mSnap.data();
          }

          return {
            ...item,
            pacienteNome: paciente.nome || "Paciente não encontrado",
            pacienteCPF: paciente.cpf || "Não informado",
            medicoNome: medico.nome || "Médico não encontrado",
          };
        })
      );

      setNotificacoes(completos);
    });

    return () => unsub();
  }, []);


  // ================================
  // MARCAR OK (LIDA)
  // ================================
  const marcarOK = async (id) => {
    // Marca o item como “removendo”
    setRemovendo((prev) => ({ ...prev, [id]: true }));

    // Dá tempo da animação rodar (250ms)
    setTimeout(async () => {
      const ref = doc(db, "appointments", id);
      await updateDoc(ref, {
        notificacaoStatus: "lida",
      });
    }, 250);
  };


  // ================================
  // FUNÇÃO DE CANCELAR CONSULTA
  // ================================
  const recusarConsulta = async () => {
    if (!selectedId) return;

    const ref = doc(db, "appointments", selectedId);

    await updateDoc(ref, {
      status: "cancelada",
      notificacaoStatus: "recusado",
    });

    setModalOpen(false);
    setSelectedId(null);
  };

  const abrirModal = (id) => {
    setSelectedId(id);
    setModalOpen(true);
  };

  return (
    <div className="text-white px-4 py-4">
      <h1 className="text-3xl font-normal text-white mb-6">
        Consultas por Convênio
      </h1>

      {notificacoes.length === 0 ? (
        <p className="text-slate-400">Nenhuma consulta pendente.</p>
      ) : (
        <div className="space-y-4">
          {notificacoes.map((item) => (
            <div
              key={item.id}
              className={`bg-gray-800 p-4 rounded-lg shadow flex flex-col md:flex-row justify-between transition-all duration-300 ease-out
    ${removendo[item.id] ? "opacity-0 scale-95 translate-y-2" : "opacity-100 scale-100"}
  `}
            >

              <div>
                <p className="text-lg font-semibold">
                  Convênio: <span className="text-yellow-400">{item.convenio}</span>
                </p>

                <p>Paciente: {item.pacienteNome}</p>
                <p>CPF: {item.pacienteCPF}</p>

                <p>Médico: {item.medicoNome}</p>

                <p>Categoria: {item.categoria}</p>
                <p>Carteirinha: {item.carteirinha}</p>

                <p>
                  Status: <span className="text-green-400 ml-1">{item.status}</span>
                </p>

                <p className="text-slate-400 text-sm mt-2">
                  ID: {item.id}
                </p>
              </div>


              <div className="flex gap-3 items-center mt-4 md:mt-0">
                {/* MARCAR OK */}
                <button
                  onClick={() => marcarOK(item.id)}
                  className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg transition"
                >
                  OK
                </button>

                {/* BOTÃO RECUSAR */}
                <button
                  onClick={() => abrirModal(item.id)}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition"
                >
                  <XCircle size={18} />
                  Recusar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======================================== */}
      {/* MODAL DE CONFIRMAÇÃO */}
      {/* ======================================== */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-semibold text-gray-950 mb-4">
              Confirmar recusa
            </h2>

            <p className="text-gray-800 mb-6 leading-relaxed">
              Tem certeza que deseja recusar esta consulta?
              <br /><br />
              Esta ação vai cancelar a consulta e enviar um e-mail ao paciente
              informando que o convênio dele não foi aceito pela clínica.
            </p>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-500 hover:bg-gray-600 transition"
              >
                Voltar
              </button>

              <button
                onClick={recusarConsulta}
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 transition"
              >
                Confirmar recusa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
