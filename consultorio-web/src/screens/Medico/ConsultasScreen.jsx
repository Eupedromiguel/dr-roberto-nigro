import { useEffect, useState } from "react";
import { httpsCallable } from "firebase/functions";
import { functions } from "../../services/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { IMaskInput } from "react-imask";

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
  const [novaData, setNovaData] = useState("");
  const [novoHorario, setNovoHorario] = useState("");
  const [observacoes, setObservacoes] = useState("");  
  const [loadingConcluirId, setLoadingConcluirId] = useState(null);
  const [loadingCancelar, setLoadingCancelar] = useState(false);
  const [loadingRetorno, setLoadingRetorno] = useState(false);
  const [erroDataRetorno, setErroDataRetorno] = useState(false);
  const [erroHorarioRetorno, setErroHorarioRetorno] = useState(false);
  const [modalConcluirRetorno, setModalConcluirRetorno] = useState(false);
  const [consultaParaConcluirRetorno, setConsultaParaConcluirRetorno] = useState(null);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const consultasPorPagina = 20;
  const [buscaNome, setBuscaNome] = useState("");
  const [buscaData, setBuscaData] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  





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
    let ano, mes, dia;
    const partes = dataNascimento.split("-");
    if (partes[0].length === 4) [ano, mes, dia] = partes;
    else [dia, mes, ano] = partes;
    const nasc = new Date(`${ano}-${mes}-${dia}T00:00:00`);
    const hoje = new Date();
    let idade = hoje.getFullYear() - nasc.getFullYear();
    const m = hoje.getMonth() - nasc.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--;
    return idade;
  }

  async function carregarConsultas() {
    try {
      const listar = httpsCallable(functions, "consultas-listarConsultas");
      const res = await listar();
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
    carregarConsultas();
  }, []);

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

  async function handleConcluir(consultaId) {
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
  }
}


  // Agendar Retorno
  function handleAbrirModalRetorno(consultaId) {
    setConsultaParaRetorno(consultaId);
    setModalRetorno(true);
  }

  async function confirmarRetorno() {
  setErroDataRetorno(false);
  setErroHorarioRetorno(false);

  if (!consultaParaRetorno || !novaData || !novoHorario) {
    setErro("Preencha a data e o horário do retorno.");
    return;
  }

  // Validar e converter data (DD/MM/AAAA → YYYY-MM-DD)
  const partes = novaData.split("/");
  if (partes.length !== 3) {
    setErro("Formato de data inválido. Use DD/MM/AAAA.");
    setErroDataRetorno(true);
    return;
  }

  const [dia, mes, ano] = partes.map((p) => parseInt(p, 10));
  if (
    isNaN(dia) || isNaN(mes) || isNaN(ano) ||
    dia < 1 || dia > 31 || mes < 1 || mes > 12 || ano < 1900
  ) {
    setErro("Data inválida. Verifique o dia, mês e ano.");
    setErroDataRetorno(true);
    return;
  }

  // Verifica se a data realmente existe
  const dataObj = new Date(ano, mes - 1, dia);
  if (
    dataObj.getFullYear() !== ano ||
    dataObj.getMonth() + 1 !== mes ||
    dataObj.getDate() !== dia
  ) {
    setErro("Data inválida. Essa data não existe no calendário.");
    setErroDataRetorno(true);
    return;
  }

  const dataFormatada = `${ano}-${String(mes).padStart(2, "0")}-${String(
    dia
  ).padStart(2, "0")}`;

  // 🕓 Validar horário (HH:MM)
  const [hora, minuto] = novoHorario.split(":").map((p) => parseInt(p, 10));
  if (
    isNaN(hora) || isNaN(minuto) ||
    hora < 0 || hora > 23 || minuto < 0 || minuto > 59
  ) {
    setErro("Horário inválido. Use o formato HH:MM (00–23h / 00–59min).");
    setErroHorarioRetorno(true);
    return;
  }

  // 🧠 Buscar a consulta original para comparar datas
  const consultaOriginal = consultas.find((c) => c.id === consultaParaRetorno);
  if (!consultaOriginal) {
    setErro("Consulta original não encontrada.");
    return;
  }

  // Converter a data/hora original
  const [dataOriginalStr, horaOriginalStr] = consultaOriginal.horario.split(" ");
  const [anoO, mesO, diaO] = dataOriginalStr.split("-").map(Number);
  const [horaO, minutoO] = horaOriginalStr.split(":").map(Number);
  const dataHoraOriginal = new Date(anoO, mesO - 1, diaO, horaO, minutoO);

  // Converter a nova data/hora (retorno)
  const dataHoraRetorno = new Date(ano, mes - 1, dia, hora, minuto);

  // 🚫 Nova regra: bloquear retorno no mesmo dia da consulta original
const mesmaData =
  dataHoraRetorno.getFullYear() === dataHoraOriginal.getFullYear() &&
  dataHoraRetorno.getMonth() === dataHoraOriginal.getMonth() &&
  dataHoraRetorno.getDate() === dataHoraOriginal.getDate();

if (mesmaData) {
  setErro("O retorno não pode ser marcado para o mesmo dia da consulta.");
  setErroDataRetorno(true);
  return;
}

// 🚫 Bloquear se o retorno for anterior à consulta original
if (dataHoraRetorno < dataHoraOriginal) {
  setErro("A data do retorno deve ser posterior à data da consulta original.");
  setErroDataRetorno(true);
  return;
}




  // ✅ Tudo ok, prossegue
  setLoadingRetorno(true);
  try {
    const agendar = httpsCallable(functions, "consultas-agendarRetorno");
    const res = await agendar({
      consultaId: consultaParaRetorno,
      novaData: dataFormatada, // formato Firestore
      novoHorario,              // HH:MM
      observacoes,
    });

    if (res.data?.sucesso) {
      setConsultas((prev) =>
        prev.map((c) =>
          c.id === consultaParaRetorno
            ? {
                ...c,
                status: "retorno",
                retornoAgendado: { novaData: dataFormatada, novoHorario, observacoes },
              }
            : c
        )
      );
      setMensagem("Retorno agendado com sucesso.");
    } else {
      setErro("Erro ao agendar retorno.");
    }
  } catch (e) {
    console.error("Erro ao agendar retorno:", e);
    setErro("Erro ao agendar retorno.");
  } finally {
    setLoadingRetorno(false);
    setModalRetorno(false);
    setConsultaParaRetorno(null);
    setNovaData("");
    setNovoHorario("");
    setObservacoes("");
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

{/* 🔍 Barra de busca e filtro */}
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
              <li
                key={c.id}
                className="border p-4 rounded-md bg-white shadow-sm hover:bg-gray-50 transition"
              >
                <p>
                  <b>Paciente:</b>{" "}
                  <span className="text-gray-950">
                    {paciente?.nome || "Carregando..."}
                    {paciente?.idade && (
                      <span className="text-gray-600">
                        {" "}
                        ({paciente.idade} anos)
                      </span>
                    )}
                  </span>
                </p>

                {paciente?.telefone &&
                  paciente.telefone !== "(sem telefone)" && (
                    <p>
                      <b>Telefone:</b>{" "}
                      <a
                        href={gerarLinkTelefone(paciente.telefone)}
                        className="text-gray-950 font-medium underline"
                      >
                        {paciente.telefone}
                      </a>
                    </p>
                  )}

                <p>
                  <b>Data e hora:</b> {formatarDataHora(c.horario)}
                </p>
                <p>
                  <b>Tipo de consulta:</b>{" "}
                  {tipo === "teleconsulta" ? "Teleconsulta" : "Presencial"}
                </p>
                {c.sintomas && (
                  <p>
                    <b>Sintomas:</b> {c.sintomas}
                  </p>
                )}
                {c.tipoAtendimento && (
                  <p>
                    <b>Tipo de atendimento:</b> {c.tipoAtendimento}
                  </p>
                )}
                {c.convenio && (
                  <p>
                    <b>Convênio:</b> {c.convenio}
                  </p>
                )}

                {c.retornoAgendado && (
                  <p className="mt-2 text-blue-700">
                    <b>Retorno agendado:</b>{" "}
                    {formatarDataHora(
                      `${c.retornoAgendado.novaData} ${c.retornoAgendado.novoHorario}`
                      )}
                  </p>
                )}
                {c.retornoAgendado?.observacoes && (
                  <p>
                    <b>Observações:</b> {c.retornoAgendado.observacoes}
                  </p>
                )}


                <p>
                  <b>Status:</b>{" "}
                  <span
                    className={`font-medium ${
                      c.status === "cancelada"
                        ? "text-red-600"
                        : c.status === "concluida"
                        ? "text-green-600"
                        : c.status === "retorno"
                        ? "text-blue-600"
                        : "text-blue-700"
                    }`}
                  >
                    {formatarStatus(c.status)}
                  </span>
                </p>

                {c.status === "agendado" && (
                  <div className="flex gap-2 mt-3">
                    <button
                    onClick={() => handleConcluir(c.id)}
                    disabled={loadingConcluirId === c.id}
                    className={`${
                      loadingConcluirId === c.id
                        ? "bg-green-400 cursor-not-allowed"
                        : "bg-green-600 hover:bg-green-700"
                    } text-white px-3 py-1 rounded-md text-sm flex items-center gap-2`}
                  >
                    {loadingConcluirId === c.id && (
                      <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                    )}
                    {loadingConcluirId === c.id ? "Concluindo..." : "Concluir"}
                    </button>

                    <button
                      onClick={() => handleAbrirModal(c.id)}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {c.status === "concluida" && !c.retornoAgendado && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleAbrirModalRetorno(c.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                    >
                      Agendar Retorno
                    </button>
                  </div>
                )}

                {c.status === "retorno" && (
                  <div className="flex gap-2 mt-3">
                    {/* 🔁 Botão Remarcar Retorno */}
                    <button
                      onClick={() => {
                        setConsultaParaRetorno(c.id);
                        setNovaData(
                          c.retornoAgendado?.novaData
                            ? c.retornoAgendado.novaData.split("-").reverse().join("/")
                            : ""
                        );
                        setNovoHorario(c.retornoAgendado?.novoHorario || "");
                        setObservacoes(c.retornoAgendado?.observacoes || "");
                        setModalRetorno(true);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-md text-sm"
                    >
                      Remarcar Retorno
                    </button>

                    {/* ✅ Botão Marcar como Concluído */}
                    <button
                      onClick={() => {
                        setConsultaParaConcluirRetorno(c.id);
                        setModalConcluirRetorno(true);
                      }}
                      disabled={loadingConcluirId === c.id}
                      className={`${
                        loadingConcluirId === c.id
                          ? "bg-green-400 cursor-not-allowed"
                          : "bg-green-600 hover:bg-green-700"
                      } text-white px-3 py-1 rounded-md text-sm flex items-center gap-2`}
                    >
                      {loadingConcluirId === c.id && (
                        <span className="animate-spin border-2 border-white border-t-transparent rounded-full w-4 h-4"></span>
                      )}
                      {loadingConcluirId === c.id ? "Concluindo..." : "Concluir"}
                    </button>

                  </div>
                )}


              </li>
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


      {/* 🆕 Modal de confirmação */}
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
                  className={`${
                    loadingCancelar ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"
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


              <div className="space-y-3 mb-4 text-left">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data do Retorno
                </label>
                <IMaskInput
                  mask="00/00/0000"
                  placeholder="DD/MM/AAAA"
                  className={`border rounded-md w-full px-3 py-2 text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent
 ${
                    erroDataRetorno
                      ? "border-red-500 focus:border-red-600"
                      : "border-gray-300 focus:border-blue-600"
                  }`}
                  value={novaData}
                  onAccept={(v) => setNovaData(v)}
                />

              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Horário do Retorno
                </label>
                <IMaskInput
                  mask="00:00"
                  placeholder="HH:MM"
                  className={`border rounded-md w-full px-3 py-2 text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent
 ${
                    erroHorarioRetorno
                      ? "border-red-500 focus:border-red-600"
                      : "border-gray-300 focus:border-blue-600"
                  }`}
                  value={novoHorario}
                  onAccept={(v) => setNovoHorario(v)}
                />

              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observações (opcional)
                </label>
                <textarea
                  className="border border-gray-300 rounded-md w-full px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent
"
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
                className={`${
                  loadingRetorno
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

          {/* ✅ Modal de confirmação de conclusão de retorno */}
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
                  Deseja realmente marcar este retorno como <b>concluído</b>?
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
                    className={`${
                      loadingConcluirId === consultaParaConcluirRetorno
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



      </AnimatePresence>
    </div>
  );
}
