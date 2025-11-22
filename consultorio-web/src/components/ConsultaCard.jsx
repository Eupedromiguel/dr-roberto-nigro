export default function ConsultaCard({
  consulta,
  paciente,
  onConcluir,
  onCancelar,
  onAgendarRetorno,
  onRemarcarRetorno,
  formatarStatus,
  formatarDataHora,
  gerarLinkTelefone
}) {
  const c = consulta;
  const tipo = c.tipoConsulta || "presencial";

  return (
    <div className="border border-gray-200 rounded-xl bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 p-5">

      {/* Cabeçalho */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {paciente?.nome || "Carregando..."}{" "}
            {paciente?.idade && (
              <span className="text-gray-500 text-sm font-normal">
                ({paciente.idade} anos)
              </span>
            )}
          </h3>

          {paciente?.sexoBiologico && (
            <p className="text-sm mt-0.5">
              <b>Sexo biológico:</b>{" "}
              <span
                className={`${
                  paciente.sexoBiologico === "Feminino"
                    ? "text-pink-600"
                    : paciente.sexoBiologico === "Masculino"
                    ? "text-blue-600"
                    : "text-gray-700"
                } font-medium`}
              >
                {paciente.sexoBiologico}
              </span>
            </p>
          )}
        </div>

        {/* Status */}
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-full self-start
            ${
              c.status === "cancelada"
                ? "bg-red-100 text-red-700"
                : c.status === "concluida"
                ? "bg-green-100 text-green-700"
                : c.status === "retorno"
                ? "bg-blue-100 text-blue-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
        >
          {formatarStatus(c.status)}
        </span>
      </div>

      {/* Informações */}
      <div className="space-y-1.5 text-sm text-gray-700">

        {paciente?.telefone && paciente.telefone !== "(sem telefone)" && (
          <p>
            <b>Telefone:</b>{" "}
            <a
              href={gerarLinkTelefone(paciente.telefone)}
              className="text-gray-900 underline"
            >
              {paciente.telefone}
            </a>
          </p>
        )}

        {paciente?.cpf && (
          <p>
            <b>CPF:</b> {paciente.cpf}
          </p>
        )}

        <p>
          <b>Data e hora:</b> {formatarDataHora(c.horario)}
        </p>

        <p>
          <b>Tipo de consulta:</b>{" "}
          {tipo === "teleconsulta" ? "Teleconsulta" : "Presencial"}
        </p>

        {/* Valores particulares */}
        {c.tipoAtendimento === "particular" && (
          <>
            {tipo === "teleconsulta" && c.valorteleConsulta && (
              <p>
                <b>Valor da teleconsulta:</b>{" "}
                <span className="font-semibold text-gray-900">
                  R$ {parseFloat(c.valorteleConsulta).toFixed(2)}
                </span>
              </p>
            )}

            {tipo === "presencial" && c.valorConsulta && (
              <p>
                <b>Valor presencial:</b>{" "}
                <span className="font-semibold text-gray-900">
                  R$ {parseFloat(c.valorConsulta).toFixed(2)}
                </span>
              </p>
            )}
          </>
        )}

        {c.unidade && <p><b>Unidade:</b> {c.unidade}</p>}
        {c.tipoAtendimento && <p><b>Tipo de atendimento:</b> {c.tipoAtendimento}</p>}
        {c.convenio && <p><b>Convênio:</b> {c.convenio}</p>}
        {c.categoria && <p><b>Categoria:</b> {c.categoria}</p>}
        {c.carteirinha && <p><b>Carteirinha:</b> {c.carteirinha}</p>}

        {c.sintomas && (
          <div className="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded-md border border-gray-100">
            <b>Sintomas / Alergias:</b> {c.sintomas}
          </div>
        )}
      </div>

      {/* Retorno agendado */}
      {c.retornoAgendado && (
        <div className="mt-4 border-t border-gray-200 bg-yellow-50 pt-3 pb-3 px-3 rounded-lg text-sm">
          <p className="font-semibold text-gray-900 mb-1">
            📋 Retorno agendado:
          </p>

          <p>
            <b>Data e horário:</b>{" "}
            {formatarDataHora(`${c.retornoAgendado.novaData} ${c.retornoAgendado.novoHorario}`)}
          </p>

          <p>
            <b>Tipo:</b>{" "}
            {c.retornoAgendado.tipoRetorno === "teleconsulta"
              ? "Teleconsulta"
              : "Presencial"}
          </p>

          {c.retornoAgendado.tipoRetorno === "presencial" &&
            c.retornoAgendado.unidade && (
              <p><b>Unidade:</b> {c.retornoAgendado.unidade}</p>
            )}

          {c.retornoAgendado.observacoes && (
            <p><b>Obs:</b> {c.retornoAgendado.observacoes}</p>
          )}
        </div>
      )}

      {/* Botões */}
      <div className="flex flex-wrap gap-2 mt-4">

        {c.status === "agendado" && (
          <>
            <button
              onClick={() => onConcluir(c.id)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-md text-sm"
            >
              Concluir
            </button>

            <button
              onClick={() => onCancelar(c.id)}
              className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm"
            >
              Cancelar consulta
            </button>
          </>
        )}

        {c.status === "concluida" && !c.retornoAgendado && (
          <button
            onClick={() => onAgendarRetorno(c.id)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm"
          >
            Agendar Retorno
          </button>
        )}

        {c.status === "retorno" && (
          <>
            <button
              onClick={() => onRemarcarRetorno(c.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md text-sm"
            >
              Remarcar Retorno
            </button>
          </>
        )}
      </div>

      {/* ID */}
      <div className="mt-3 text-[11px] text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded select-all w-fit">
        ID: {c.id}
      </div>
    </div>
  );
}
