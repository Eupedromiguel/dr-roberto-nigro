import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../services/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { IMaskInput } from "react-imask";
import { useRef } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  getFirestore,
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import ConsultaCard from "../../components/ConsultaCard";



// Função de páginação

function Pagination({ current, total, onChange }) {
  if (total <= 1) return null;

  // Gera a sequência de páginas com reticências (…)
  const getPages = () => {
    const pages = [];
    const maxAround = 1; // quantas vizinhas mostrar de cada lado da atual
    const push = (v) => pages.push(v);

    // Sempre inclui 1 e total; usa janelas ao redor da atual
    const start = Math.max(2, current - maxAround);
    const end = Math.min(total - 1, current + maxAround);

    push(1);
    if (start > 2) push("...");
    for (let p = start; p <= end; p++) push(p);
    if (end < total - 1) push("...");
    if (total > 1) push(total);

    // Caso de poucas páginas, substitui pelos números diretos
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    return pages;
  };

  const pages = getPages();

  const baseBtn =
    "px-3 py-1 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400";
  const activeBtn = "bg-yellow-400 text-white";
  const idleBtn = "bg-gray-200 text-gray-800 hover:bg-gray-300";

  const go = (n) => {
    if (n < 1 || n > total || n === current) return;
    onChange(n);
  };

  return (
    <nav
      className="flex items-center justify-center gap-2 flex-wrap"
      role="navigation"
      aria-label="Paginação de consultas"
    >
      {/* Primeira / Anterior */}
      <button
        onClick={() => go(1)}
        disabled={current === 1}
        className={`${baseBtn} ${current === 1 ? "opacity-40 cursor-not-allowed" : idleBtn}`}
        aria-label="Primeira página"
      >
        «
      </button>
      <button
        onClick={() => go(current - 1)}
        disabled={current === 1}
        className={`${baseBtn} ${current === 1 ? "opacity-40 cursor-not-allowed" : idleBtn}`}
        aria-label="Página anterior"
      >
        ‹
      </button>

      {/* Botões numerados / reticências */}
      {pages.map((p, idx) =>
        p === "..." ? (
          <span key={`dots-${idx}`} className="px-2 text-gray-500 select-none">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => go(p)}
            className={`${baseBtn} ${p === current ? activeBtn : idleBtn}`}
            aria-current={p === current ? "page" : undefined}
            aria-label={`Ir para página ${p}`}
          >
            {p}
          </button>
        )
      )}

      {/* Próxima / Última */}
      <button
        onClick={() => go(current + 1)}
        disabled={current === total}
        className={`${baseBtn} ${current === total ? "opacity-40 cursor-not-allowed" : idleBtn}`}
        aria-label="Próxima página"
      >
        ›
      </button>
      <button
        onClick={() => go(total)}
        disabled={current === total}
        className={`${baseBtn} ${current === total ? "opacity-40 cursor-not-allowed" : idleBtn}`}
        aria-label="Última página"
      >
        »
      </button>
    </nav>
  );
}

// Fim da função de paginação


export default function ConsultasScreen() {
  const [consultas, setConsultas] = useState([]);
  const [pacientesInfo, setPacientesInfo] = useState({});
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [tipoRetorno, setTipoRetorno] = useState("presencial");
  const [unidade, setUnidade] = useState("");
  const toastRef = useRef(null);
  const [toastMsg, setToastMsg] = useState("");
  const { uid } = useParams();
  const { user, role } = useAuth();
  const [modalAvisoConclusao, setModalAvisoConclusao] = useState(false);
  const [consultaParaConcluir, setConsultaParaConcluir] = useState(null);
  const [slotsDisponiveis, setSlotsDisponiveis] = useState([]);
  const [slotSelecionado, setSlotSelecionado] = useState(null);
  const [carregandoSlots, setCarregandoSlots] = useState(false);



  const medicoId = role === "doctor" ? user?.uid : uid;

  const db = getFirestore();
  const navigate = useNavigate();
  const [nomeMedico, setNomeMedico] = useState("");
  const [especialidadeMedico, setEspecialidadeMedico] = useState("");
  const [erroUnidade, setErroUnidade] = useState(false);


  // Se o usuário for admin, busca o nome do médico
  useEffect(() => {
    async function carregarMedico() {
      if (role !== "admin" || !uid) return;
      try {
        const ref = doc(db, "usuarios", uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setNomeMedico(data.nome || "Médico sem nome");
          setEspecialidadeMedico(data.especialidade || "—");
        }
      } catch (e) {
        console.error("Erro ao buscar médico:", e);
      }
    }
    carregarMedico();
  }, [role, uid]);


  function showToast(message, duration = 3000) {
    setToastMsg(message);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToastMsg(""), duration);
  }



  // Faz mensagens sumirem automaticamente após 5 segundos
  useEffect(() => {
    if (mensagem || erro) {
      const timer = setTimeout(() => {
        setMensagem("");
        setErro("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [mensagem, erro]);

  // Controle dos modais
  const [modalAberto, setModalAberto] = useState(false);
  const [consultaParaCancelar, setConsultaParaCancelar] = useState(null);
  const [modalRetorno, setModalRetorno] = useState(false);
  const [consultaParaRetorno, setConsultaParaRetorno] = useState(null);
  const [observacoes, setObservacoes] = useState("");
  const [loadingConcluirId, setLoadingConcluirId] = useState(null);
  const [loadingCancelar, setLoadingCancelar] = useState(false);
  const [loadingRetorno, setLoadingRetorno] = useState(false);
  const [modalConcluirRetorno, setModalConcluirRetorno] = useState(false);
  const [consultaParaConcluirRetorno, setConsultaParaConcluirRetorno] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const consultasPorPagina = 20;
  const [buscaNome, setBuscaNome] = useState("");
  const [buscaData, setBuscaData] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [erroModalRetorno, setErroModalRetorno] = useState("");







  // Funções auxiliares
  function parseData(dataStr) {
    if (!dataStr) return null;
    const p = dataStr.split("-");
    if (p.length !== 3) return null;
    if (p[0].length === 4) return { y: +p[0], m: +p[1], d: +p[2] };
    return { d: +p[0], m: +p[1], y: +p[2] };
  }

  function formatarDataHora(horarioStr) {
    if (!horarioStr) return "";
    const [dataStr, hora] = horarioStr.split(" ");
    const parsed = parseData(dataStr);
    if (!parsed) return horarioStr;
    const { d, m, y } = parsed;
    const data = new Date(y, m - 1, d);
    const diaSemana = data.toLocaleDateString("pt-BR", { weekday: "long" });
    return `${diaSemana}, ${String(d).padStart(2, "0")}/${String(m).padStart(
      2,
      "0"
    )}/${y} , ${hora}`;
  }

  function formatarStatus(status) {
    const map = {
      agendado: "Agendado",
      cancelada: "Cancelada",
      concluida: "Concluída",
      retorno: "Retorno",
    };
    return map[status?.toLowerCase()] || status;
  }

  function calcularIdade(dataNascimento) {
    if (!dataNascimento) return null;

    const [ano, mes, dia] = dataNascimento.split("-");
    const nasc = new Date(`${ano}-${mes}-${dia}T00:00:00`);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  }

  async function carregarConsultas(medicoId) {
    try {
      const listar = httpsCallable(functions, "consultas-listarConsultas");
      const res = await listar({ medicoId });
      if (!res.data?.sucesso) {
        setErro("Erro ao carregar consultas.");
        return;
      }
      const consultasData = res.data.consultas || [];
      const ordenadas = [...consultasData].sort((a, b) => {
        const [dataA, horaA] = a.horario.split(" ");
        const [dataB, horaB] = b.horario.split(" ");
        const A = parseData(dataA);
        const B = parseData(dataB);
        if (A && B) {
          const dA = new Date(A.y, A.m - 1, A.d);
          const dB = new Date(B.y, B.m - 1, B.d);
          if (dA.getTime() !== dB.getTime()) return dA - dB;
        }
        return (horaA || "").localeCompare(horaB || "");
      });
      setConsultas(ordenadas);

      // Os dados do paciente já vêm do backend
      const info = {};
      for (const c of ordenadas) {
        if (c.paciente) {
          info[c.pacienteId] = {
            nome: c.paciente.nome,
            telefone: c.paciente.telefone || "(sem telefone)",
            idade: calcularIdade(c.paciente.dataNascimento),
            cpf: c.paciente.cpf || "—",
            sexoBiologico: c.paciente.sexoBiologico || "—",
          };
        }
      }
      setPacientesInfo(info);
    } catch (e) {
      setErro(e.message || "Erro ao carregar consultas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!medicoId) return;
    carregarConsultas(medicoId);
  }, [medicoId]);


  useEffect(() => {
    setPaginaAtual(1);
  }, [consultas.length]);


  // Cancelar consulta
  async function confirmarCancelamento() {
    if (!consultaParaCancelar) return;
    setLoadingCancelar(true);
    try {
      const cancelar = httpsCallable(functions, "consultas-cancelarConsulta");
      const res = await cancelar({ consultaId: consultaParaCancelar });
      if (res.data?.sucesso) {
        setConsultas((prev) =>
          prev.map((c) =>
            c.id === consultaParaCancelar ? { ...c, status: "cancelada" } : c
          )
        );
        setMensagem("Consulta cancelada com sucesso.");
      } else {
        setErro("Erro ao cancelar consulta.");
      }
    } catch {
      setErro("Erro ao cancelar consulta.");
    } finally {
      setLoadingCancelar(false);
      setModalAberto(false);
      setConsultaParaCancelar(null);
    }
  }


  function handleAbrirModal(consultaId) {
    setConsultaParaCancelar(consultaId);
    setModalAberto(true);
  }

  async function handleConcluir(consultaId, ignorarHorario = false) {
    const consulta = consultas.find((c) => c.id === consultaId);
    if (!consulta) return;

    // Verificação de data/hora — só bloqueia SE ignorarHorario for falso
    if (!ignorarHorario) {
      try {
        const [dataStr, horaStr] = consulta.horario.split(" ");
        const [ano, mes, dia] = dataStr.split("-").map(Number);
        const [hora, minuto] = horaStr.split(":").map(Number);
        const dataHoraConsulta = new Date(ano, mes - 1, dia, hora, minuto);
        const agora = new Date();

        if (agora < dataHoraConsulta) {
          // Abre modal de aviso
          setConsultaParaConcluir(consultaId);
          setModalAvisoConclusao(true);
          return;
        }
      } catch (err) {
        console.error("Erro ao validar data da consulta:", err);
      }
    }

    // Prossegue com a conclusão normalmente
    setLoadingConcluirId(consultaId);
    try {
      const concluir = httpsCallable(functions, "consultas-marcarComoConcluida");
      const res = await concluir({ consultaId });
      if (res.data?.sucesso) {
        setConsultas((prev) =>
          prev.map((c) =>
            c.id === consultaId ? { ...c, status: "concluida" } : c
          )
        );
        setMensagem("Consulta marcada como concluída.");
      } else {
        setErro("Erro ao concluir consulta.");
      }
    } catch {
      setErro("Erro ao marcar como concluída.");
    } finally {
      setLoadingConcluirId(null);
      setModalAvisoConclusao(false);
      setConsultaParaConcluir(null);
    }
  }




  // Agendar Retorno
  function handleAbrirModalRetorno(consultaId) {
    setConsultaParaRetorno(consultaId);
    setModalRetorno(true);
    carregarSlotsLivresFuturos();
  }


  async function confirmarRetorno() {
    setErroModalRetorno("");

    if (!consultaParaRetorno || !slotSelecionado) {
      setErro("Selecione um horário válido.");
      return;
    }

    if (tipoRetorno === "presencial" && !unidade) {
      setErroUnidade(true);
      setErroModalRetorno("Selecione uma unidade para o retorno presencial.");
      return;
    }

    setLoadingRetorno(true);

    try {
      const agendar = httpsCallable(functions, "consultas-agendarRetorno");
      const res = await agendar({
        consultaId: consultaParaRetorno,
        slotId: slotSelecionado,
        observacoes,
        tipoRetorno,
        unidade,
      });

      if (res.data?.sucesso) {
        showToast("Retorno agendado com sucesso.");


        // Atualiza a lista local com o novo retorno
        const slotData = slotsDisponiveis.find((s) => s.id === slotSelecionado);

        setConsultas((prev) =>
          prev.map((c) =>
            c.id === consultaParaRetorno
              ? {
                ...c,
                status: "retorno",
                retornoAgendado: {
                  novaData: slotData.data,
                  novoHorario: slotData.hora,
                  observacoes,
                  tipoRetorno,
                  unidade,
                },
              }
              : c
          )
        );
      } else {
        setErro("Erro ao agendar retorno.");
      }
    } catch (err) {
      console.error("Erro ao agendar retorno:", err);
      setErro("Erro ao agendar retorno.");
    } finally {
      setLoadingRetorno(false);
      setModalRetorno(false);
      setConsultaParaRetorno(null);
      setSlotSelecionado(null);
      setObservacoes("");
      setTipoRetorno("presencial");
      setUnidade("");
    }
  }





  async function carregarSlotsLivresFuturos() {
    setCarregandoSlots(true);
    setSlotsDisponiveis([]);
    setSlotSelecionado(null);

    try {
      const ref = collection(db, "availability_slots");

      const snap = await getDocs(
        query(
          ref,
          where("medicoId", "==", medicoId),
          where("status", "==", "livre")
        )
      );

      const agora = new Date(); // Data e hora atuais

      const lista = snap.docs
        .map((doc) => {
          const s = doc.data();

          // Converte "DD-MM-YYYY" → "YYYY-MM-DD"
          const [dd, mm, yyyy] = s.data.split("-");
          const dataISO = `${yyyy}-${mm}-${dd}`;


          const [hh, min] = s.hora.split(":");
          const dataHoraSlot = new Date(
            Number(yyyy),
            Number(mm) - 1,
            Number(dd),
            Number(hh),
            Number(min)
          );

          return {
            id: doc.id,
            ...s,
            dataISO,
            dataHoraSlot,
          };
        })
        .filter((slot) => slot.dataHoraSlot >= agora)
        .sort((a, b) => a.dataHoraSlot - b.dataHoraSlot);

      setSlotsDisponiveis(lista);
    } catch (error) {
      console.error("Erro ao carregar slots:", error);
    } finally {
      setCarregandoSlots(false);
    }
  }





  function gerarLinkTelefone(telefone) {
    if (!telefone) return "";
    const numeroLimpo = telefone.replace(/\D/g, "");
    return `tel:+55${numeroLimpo}`;
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 animate-pulse space-y-4">

        <div className="h-6 bg-slate-300 rounded w-1/3"></div>
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="border border-slate-200 rounded-md bg-white shadow-sm p-4 space-y-3"
          >
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
          </div>
        ))}


      </div>
    );
  }

  // Aplica filtros antes da paginação
  const consultasFiltradas = consultas.filter((c) => {
    const paciente = pacientesInfo[c.pacienteId];
    const nome = paciente?.nome?.toLowerCase() || "";
    const buscaLower = buscaNome.toLowerCase();

    // Verifica se nome combina
    const matchNome = nome.includes(buscaLower);

    // Verifica se data da consulta (DD/MM/AAAA) combina
    const [dataOriginalStr] = c.horario.split(" ");
    const [ano, mes, dia] = dataOriginalStr.split("-");
    const dataConsultaFormatada = `${String(dia).padStart(2, "0")}/${String(
      mes
    ).padStart(2, "0")}/${ano}`;
    const matchData = buscaData && dataConsultaFormatada.includes(buscaData);

    // Filtro de status
    const matchStatus =
      filtroStatus === "todos" || c.status === filtroStatus;

    // Se tiver busca de data, prioriza ela
    if (buscaData) return matchData && matchStatus;
    // Senão, busca por nome
    return matchNome && matchStatus;
  });

  // Depois, aplica paginação sobre o resultado filtrado
  const totalPaginas = Math.ceil(consultasFiltradas.length / consultasPorPagina);
  const indiceInicial = (paginaAtual - 1) * consultasPorPagina;
  const indiceFinal = indiceInicial + consultasPorPagina;
  const consultasPaginaAtual = consultasFiltradas.slice(indiceInicial, indiceFinal);


  return (
    <div className="max-w-4xl mx-auto p-6">

      {role === "admin" && (
        <div className="flex items-center justify-between mb-4">
          <div>
            {nomeMedico ? (
              <>
                <h2 className="text-xl font-semibold text-white">
                  Consultas de {nomeMedico}
                </h2>
                <p className="text-sm text-gray-400">{especialidadeMedico}</p>
              </>
            ) : (
              <div className="animate-pulse">
                <div className="h-5 bg-gray-700 rounded w-40 mb-1"></div>
                <div className="h-3 bg-gray-700 rounded w-28"></div>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate("/admin/agendas")}
            className="bg-gray-800 hover:bg-yellow-400 text-white font-medium px-4 py-2 rounded-md transition"
          >
            ← Voltar
          </button>
        </div>
      )}


      <h2 className="text-2xl font-semibold text-white mb-4">
        Consultas marcadas
      </h2>

      {!modalAberto && !modalRetorno && erro && (
        <p className="text-red-600 bg-red-50 border border-red-200 p-2 rounded mb-3">
          {erro}
        </p>
      )}
      {!modalAberto && !modalRetorno && mensagem && (
        <p className="text-green-700 bg-green-50 border border-green-200 p-2 rounded mb-3">
          {mensagem}
        </p>
      )}

      {/* Barra de busca e filtro */}
      <div className="flex flex-col md:flex-row !text-gray-500 items-center justify-between gap-3 mb-6">
        {/* Campo de nome */}
        <input
          type="text"
          placeholder="Pesquisar por nome..."
          value={buscaNome}
          onChange={(e) => {
            setBuscaNome(e.target.value);
            setPaginaAtual(1); // volta pra página 1 quando busca muda
          }}
          className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        {/* Campo de data com IMask */}
        <IMaskInput
          mask="00/00/0000"
          placeholder="Filtrar por data (DD/MM/AAAA)"
          value={buscaData}
          onAccept={(v) => {
            setBuscaData(v);
            setPaginaAtual(1);
          }}
          className="w-full md:w-1/3 px-3 py-2 border text-gray-500 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />

        {/* Dropdown de status */}
        <div className="relative w-full md:w-1/4">
          <select
            value={filtroStatus}
            onChange={(e) => {
              setFiltroStatus(e.target.value);
              setPaginaAtual(1);
            }}
            className="appearance-none w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400 pr-8"
          >
            <option value="todos">Todos os status</option>
            <option value="agendado">Agendadas</option>
            <option value="concluida">Concluídas</option>
            <option value="cancelada">Canceladas</option>
            <option value="retorno">Retornos</option>
          </select>

          {/* Ícone de seta customizado */}
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>





      </div>




      {totalPaginas > 1 && (
        <div className="mb-4">
          <Pagination
            current={paginaAtual}
            total={totalPaginas}
            onChange={(n) => {
              setPaginaAtual(n);
              // opcional: rolar até o título quando muda de página
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}




      {/* Exibição condicional dos resultados */}
      {consultas.length === 0 ? (
        // Caso não haja nenhuma consulta no sistema (vazio geral)
        <p className="text-slate-600">Nenhuma consulta agendada.</p>
      ) : consultasFiltradas.length === 0 ? (
        // Caso haja consultas, mas os filtros não encontraram nenhuma
        <p className="text-slate-500 text-normal">
          Nenhuma consulta encontrada para os filtros selecionados.
        </p>
      ) : (
        // Caso normal — há resultados após filtro
        <ul className="space-y-3">
          {consultasPaginaAtual.map((c) => {


            const paciente = pacientesInfo[c.pacienteId];
            const tipo = c.tipoConsulta || "presencial";

            return (
              <ConsultaCard
                key={c.id}
                consulta={c}
                paciente={paciente}
                onConcluir={(id) => handleConcluir(id)}
                onCancelar={(id) => handleAbrirModal(id)}
                onAgendarRetorno={(id) => handleAbrirModalRetorno(id)}
                onRemarcarRetorno={(id) => {
                  // Remarcar retorno faz o mesmo comportamento que você já usa
                  setConsultaParaRetorno(id);
                  setObservacoes(c.retornoAgendado?.observacoes || "");
                  setTipoRetorno(c.retornoAgendado?.tipoRetorno || "presencial");
                  setUnidade(c.retornoAgendado?.unidade || "");
                  setModalRetorno(true);
                  carregarSlotsLivresFuturos();
                }}
                formatarStatus={formatarStatus}
                formatarDataHora={formatarDataHora}
                gerarLinkTelefone={gerarLinkTelefone}
              />

            );
          })}
        </ul>
      )}

      {totalPaginas > 1 && (
        <div className="mt-6">
          <Pagination
            current={paginaAtual}
            total={totalPaginas}
            onChange={(n) => {
              setPaginaAtual(n);
              // opcional: rolar para o topo da lista
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </div>
      )}


      {/* Modal de confirmação */}
      <AnimatePresence>
        {modalAberto && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-[90%] max-w-sm shadow-2xl text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Confirmar cancelamento
              </h3>
              {/* NOVO ERRO NO MODAL */}
              {erro && (
                <p className="text-red-600 bg-red-50 border border-red-200 p-2 rounded mb-3">
                  {erro}
                </p>
              )}
              {mensagem && (
                <p className="text-green-700 bg-green-50 border border-green-200 p-2 rounded mb-3">
                  {mensagem}
                </p>
              )}

              <p className="text-gray-700 mb-5">
                Deseja realmente cancelar esta consulta?
              </p>
              <div className="flex justify-center gap-3">
                <button
                  onClick={confirmarCancelamento}
                  disabled={loadingCancelar}
                  className={`${loadingCancelar ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
                    } text-white px-4 py-2 rounded-md text-sm flex items-center gap-2`}
                >
                  {loadingCancelar && (
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                  )}
                  {loadingCancelar ? "Cancelando..." : "Confirmar"}
                </button>

                <button
                  onClick={() => setModalAberto(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal de Agendar Retorno */}
        {modalRetorno && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-[90%] max-w-sm shadow-2xl text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Agendar Retorno
              </h3>


              {erro && (
                <p className="text-red-600 bg-red-50 border border-red-200 p-2 rounded mb-3">
                  {erro}
                </p>
              )}
              {mensagem && (
                <p className="text-green-700 bg-green-50 border border-green-200 p-2 rounded mb-3">
                  {mensagem}
                </p>
              )}


              <div className="space-y-3 mb-4 text-left">
                {/* Tipo de Retorno */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Retorno
                  </label>

                  <div className="relative">
                    <select
                      value={tipoRetorno}
                      onChange={(e) => setTipoRetorno(e.target.value)}
                      className="appearance-none border border-gray-300 rounded-md w-full px-3 py-2 text-gray-900 
      focus:outline-none focus:ring-2 focus:ring-yellow-400 pr-8"
                    >
                      <option value="presencial">Presencial</option>
                      <option value="teleconsulta">Teleconsulta</option>
                    </select>

                    {/* Ícone da seta personalizada */}
                    <svg
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </div>


                </div>

                {/* Unidade — aparece apenas se tipo = presencial */}
                {tipoRetorno === "presencial" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidade Médica
                    </label>

                    <div className="relative">
                      <select
                        value={unidade}
                        onChange={(e) => {
                          setUnidade(e.target.value);
                          setErroUnidade(false);
                        }}
                        className={`appearance-none border rounded-md w-full px-3 py-2 text-gray-900 
      focus:outline-none focus:ring-2 focus:ring-yellow-400 pr-8
      ${erroUnidade ? "border-red-500" : "border-gray-300"}`}
                      >
                        <option value="">Selecione uma unidade</option>
                        <option value="Unidade Pompéia - Rua Apinajés, 1100 - Conj. 803/804">
                          Unidade Pompéia
                        </option>
                        <option value="Unidade Cayowaá - Rua Cayowaá, 1071 - 10º Andar Conj. 102/103">
                          Unidade Cayowaá
                        </option>
                      </select>

                      {/* Ícone da seta */}
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>


                  </div>
                )}

                {slotSelecionado && (
                  <p className="text-gray-700 text-sm bg-gray-100 p-2 rounded-md">
                    <b>Data selecionada:</b>{" "}
                    {slotsDisponiveis
                      .find((s) => s.id === slotSelecionado)
                      ?.data.replace(/-/g, "/")}
                    <br />
                    <b>Horário:</b>{" "}
                    {slotsDisponiveis.find((s) => s.id === slotSelecionado)?.hora}
                  </p>
                )}


                {/* Lista de horários disponíveis */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Slots disponíveis
                  </label>

                  {carregandoSlots ? (
                    <p className="text-gray-600 text-sm">Carregando horários...</p>
                  ) : slotsDisponiveis.length === 0 ? (
                    <p className="text-red-600 text-sm">Nenhum horário disponível.</p>
                  ) : (
                    <div className="relative">
                      <select
                        value={slotSelecionado || ""}
                        onChange={(e) => setSlotSelecionado(e.target.value)}
                        className="appearance-none w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900
               focus:outline-none focus:ring-2 focus:ring-yellow-400 pr-8"
                      >
                        <option value="">Selecione um horário</option>
                        {slotsDisponiveis.map((slot) => (
                          <option key={slot.id} value={slot.id}>
                            {slot.data.replace(/-/g, "/")} — {slot.hora}
                          </option>
                        ))}
                      </select>

                      {/* Ícone da setinha personalizada */}
                      <svg
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>

                  )}
                </div>



                {/* Observações */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações (opcional)
                  </label>
                  <textarea
                    className="border border-gray-300 rounded-md w-full px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    rows={2}
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                  />
                </div>
              </div>



              <div className="flex justify-center gap-3">
                <button
                  onClick={confirmarRetorno}
                  disabled={loadingRetorno}

                  className={`${loadingRetorno
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                    } text-white px-4 py-2 rounded-md text-sm flex items-center gap-2`}
                >
                  {loadingRetorno && (
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                  )}
                  {loadingRetorno ? "Agendando..." : "Confirmar"}
                </button>

                <button
                  onClick={() => setModalRetorno(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal de confirmação de conclusão de retorno */}
        {modalConcluirRetorno && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-[90%] max-w-sm shadow-2xl text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Confirmar Conclusão
              </h3>

              {erro && (
                <p className="text-red-600 bg-red-50 border border-red-200 p-2 rounded mb-3">
                  {erro}
                </p>
              )}
              {mensagem && (
                <p className="text-green-700 bg-green-50 border border-green-200 p-2 rounded mb-3">
                  {mensagem}
                </p>
              )}

              <p className="text-gray-700 mb-5">
                ⚠
                <br />
                Esta ação é irreversível e encerrará definitivamente o atendimento.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={async () => {
                    setModalConcluirRetorno(false);
                    if (consultaParaConcluirRetorno) {
                      await handleConcluir(consultaParaConcluirRetorno);
                    }
                  }}
                  disabled={loadingConcluirId === consultaParaConcluirRetorno}
                  className={`${loadingConcluirId === consultaParaConcluirRetorno
                    ? "bg-green-400 cursor-not-allowed"
                    : "bg-green-600 hover:bg-green-700"
                    } text-white px-4 py-2 rounded-md text-sm flex items-center gap-2`}
                >
                  {loadingConcluirId === consultaParaConcluirRetorno && (
                    <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                  )}
                  {loadingConcluirId === consultaParaConcluirRetorno
                    ? "Concluindo..."
                    : "Confirmar"}
                </button>

                <button
                  onClick={() => setModalConcluirRetorno(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Modal AVISO Conclusão antes do horário */}
        {modalAvisoConclusao && (
          <motion.div
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-xl p-6 w-[90%] max-w-sm shadow-2xl text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Atenção
              </h3>

              <p className="text-gray-700 mb-5">
                Esta consulta ainda <b>não atingiu o horário agendado</b>.
                Deseja realmente marcá-la como <b>concluída agora</b>?
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={() => handleConcluir(consultaParaConcluir, true)}
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-md text-sm"
                >
                  Confirmar
                </button>

                <button
                  onClick={() => setModalAvisoConclusao(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded-md text-sm"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}



      </AnimatePresence>

      {/* Toast simples */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-6 right-6 bg-green-100 text-gray-950 px-4 py-2 rounded-md shadow-lg z-50"
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>


    </div>
  );
}
