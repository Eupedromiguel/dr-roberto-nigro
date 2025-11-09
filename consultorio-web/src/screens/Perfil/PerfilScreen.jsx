import { useEffect, useState, useCallback } from "react";
import { httpsCallable } from "firebase/functions";
import { auth, functions } from "../../services/firebase";
import {
  getAuth,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updateEmail,
  sendEmailVerification,
} from "firebase/auth";
import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import Button from "../../components/Button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { IMaskInput } from "react-imask";

export default function PerfilScreen() {
  const { user, loading, logout } = useAuth();

  const [perfil, setPerfil] = useState(null);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [carregandoPerfil, setCarregandoPerfil] = useState(true);
  const [salvando, setSalvando] = useState(false);  
  const [modo, setModo] = useState(null);
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [novoEmail, setNovoEmail] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarSenhaConfirmar, setMostrarSenhaConfirmar] = useState(false);
  const [erroModal, setErroModal] = useState("");
  const [mensagemModal, setMensagemModal] = useState("");
  const [emailVerificado, setEmailVerificado] = useState(false);



  const [formData, setFormData] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    dataNascimento: "",
  });

  // Carregar perfil (reutilizável)
  const carregarPerfil = useCallback(async () => {
    try {
      setCarregandoPerfil(true);
      const meuPerfil = httpsCallable(functions, "usuarios-meuPerfil");
      const res = await meuPerfil({});
      setPerfil(res.data.perfil);
      setFormData({
        nome: res.data.perfil?.nome || "",
        telefone: res.data.perfil?.telefone || "",
        cpf: res.data.perfil?.cpf || "",
        dataNascimento: res.data.perfil?.dataNascimento || "",
      });
    } catch (e) {
      setErro(e.message || String(e));
    } finally {
      setCarregandoPerfil(false);
    }
  }, []);

  useEffect(() => {
  const carregar = async () => {
    if (!user) return;

    // Atualiza o estado de verificação do e-mail no Auth
    await auth.currentUser?.reload();
    const verificado = auth.currentUser?.emailVerified || false;
    setEmailVerificado(verificado);


    /// (Opcional) Atualiza também no Firestore se acabou de verificar
if (verificado) {
  try {
    const atualizar = httpsCallable(functions, "usuarios-atualizarUsuario");
    await atualizar({ emailVerificado: true });
  } catch (e) {
    // 🩶 Ignora apenas o erro esperado (campo não aceito)
    if (!e.message.includes("Nenhum campo válido")) {
      console.warn("⚠️ Falha real ao sincronizar emailVerificado no Firestore:", e.message);
    }
  }
}


        // 🔹 Carrega o restante do perfil
        await carregarPerfil();
      };
      carregar();
    }, [user, carregarPerfil]);


  // Ocultar mensagens após 5s
  useEffect(() => {
    if (!erro && !mensagem) return;
    const t = setTimeout(() => {
      setErro("");
      setMensagem("");
    }, 5000);
    return () => clearTimeout(t);
  }, [erro, mensagem]);

  // Formatadores
  function formatarDataCompleta(dataStr) {
    if (!dataStr) return "(não informado)";
    const p = dataStr.split(/[\/\-]/);
    let dd, mm, yyyy;
    if (p[0]?.length === 4) [yyyy, mm, dd] = p;
    else [dd, mm, yyyy] = p;
    if (!yyyy || !mm || !dd) return "(data inválida)";
    return `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${yyyy}`;
  }

  function dataParaISO(dataStr) {
    if (!dataStr) return "";
    const [dd, mm, yyyy] = dataStr.split("/");
    return `${yyyy}-${mm}-${dd}`;
  }

  // Ações
  
  async function handleAtualizar() {
    try {
      setErro("");
      setMensagem("");
      setErroModal("");
      setMensagemModal("");
      setSalvando(true);

      if (!senha.trim()) {
        setErro("Digite sua senha para confirmar a atualização.");
        return;
      }

      const currentAuth = auth;
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        setErro("Usuário inválido ou não autenticado.");
        return;
      }

      const cred = EmailAuthProvider.credential(currentUser.email, senha);
      await reauthenticateWithCredential(currentUser, cred).catch(() => {
        throw new Error("Senha incorreta.");
      });

      const atualizar = httpsCallable(functions, "usuarios-atualizarUsuario");
      const res = await atualizar({
        ...formData,
        dataNascimento: dataParaISO(formData.dataNascimento),
      });

      if (res.data?.sucesso) {
        setMensagemModal("Dados atualizados com sucesso!");
        setModo(null);
        setSenha("");
        await carregarPerfil();
      } else {
        setErro(res.data?.erro || "Erro ao atualizar perfil.");
      }
    } catch (e) {
  if (e.message.includes("already-exists")) {
    if (e.message.includes("Telefone")) setErroModal("❌ Telefone já cadastrado.");
    else if (e.message.includes("CPF")) setErroModal("❌ CPF já cadastrado.");
    else setErroModal("❌ Já existe um usuário com esses dados.");
  } else if (e.message.includes("Senha incorreta")) {
    setErroModal("❌ Senha incorreta. Tente novamente.");
  } else {
    setErroModal(e.message || String(e));
  }
} finally {
  setSalvando(false);
}


  }

async function handleAtualizarEmail() {
  try {
    setErro("");
    setMensagem("");
    setErroModal("");
    setMensagemModal("");
    setSalvando(true);

    if (!novoEmail.trim()) {
      setErroModal("Informe um novo e-mail.");
      return;
    }

    const currentAuth = auth;
    const currentUser = currentAuth.currentUser;


    if (!senha.trim()) {
      setErroModal("Digite sua senha para confirmar a alteração de e-mail.");
      return;
    }

    // Reautentica o usuário
    const cred = EmailAuthProvider.credential(currentUser.email, senha);
    await reauthenticateWithCredential(currentUser, cred);

    // Atualiza o e-mail imediatamente
    await updateEmail(currentUser, novoEmail);
    await sendEmailVerification(currentUser);


    // Atualiza também o Firestore (mantendo consistência)
    const atualizar = httpsCallable(functions, "usuarios-atualizarUsuario");
    await atualizar({ email: novoEmail });

    setMensagemModal(
      "✅ E-mail atualizado com sucesso! Um aviso foi enviado ao e-mail antigo por segurança."
    );

    await logout();

    setModo(null);
    setNovoEmail("");
    await carregarPerfil();
  } catch (e) {
    console.error("Erro ao atualizar e-mail:", e);
    const code = e.code || "";
    const msg = e.message || "";

    if (code === "auth/email-already-in-use" || msg.includes("already-exists")) {
      setErroModal("❌ Este e-mail já está em uso por outro usuário.");
    } else if (code === "auth/requires-recent-login") {
      setErroModal("⚠️ Sessão expirada. Faça login novamente para alterar o e-mail.");
    } else if (code === "auth/invalid-email") {
      setErroModal("❌ E-mail inválido. Verifique o formato e tente novamente.");
    } else {
      setErroModal("❌ Erro ao atualizar e-mail. " + (msg || "Tente novamente."));
    }
  } finally {
    setSalvando(false);
  }
}


  async function handleExcluirConta() {
    try {
      setErro("");
      setMensagem("");
      setSalvando(true);

      if (!senha || !confirmarSenha) {
        setErro("Preencha ambos os campos de senha.");
        return;
      }
      if (senha !== confirmarSenha) {
        setErro("As senhas não coincidem.");
        return;
      }

      const auth = getAuth();
      const currentUser = auth.currentUser;
      if (!currentUser?.email) {
        setErro("Usuário inválido ou não autenticado.");
        return;
      }

      const cred = EmailAuthProvider.credential(currentUser.email, senha);
      await reauthenticateWithCredential(currentUser, cred).catch(() => {
        throw new Error("Senha incorreta.");
      });

      const excluir = httpsCallable(functions, "usuarios-deletarUsuario");
      const res = await excluir({ senha });

      if (res.data?.sucesso) {
        setModo("excluido");
        setSenha("");
        setConfirmarSenha("");
        setMostrarSenha(false);
        setMostrarSenhaConfirmar(false);
      } else {
        setErro(res.data?.erro || "Erro ao excluir conta.");
      }
    } catch (e) {
      if (e.message.includes("Senha incorreta")) {
        setErro("❌ Senha incorreta. Tente novamente.");
      } else {
        setErro(e.message || String(e));
      }
    } finally {
      setSalvando(false);
    }
  }


  // Render

  if (loading)
    return <div className="p-4 text-center text-gray-600">Carregando...</div>;

  if (!user) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <p className="mb-3">Você não está logado.</p>
        <Link to="/" className="text-blue-700 hover:underline">
          Ir para Login
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-5 relative">
      <h2 className="text-2xl font-bold text-gray-900">Meu Perfil</h2>

      {/* Card do perfil */}
      <div className="rounded-md border border-slate-200 p-5 bg-white space-y-3 relative z-10">
        {carregandoPerfil ? (
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-slate-200 rounded w-2/3"></div>
            <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-4 bg-slate-200 rounded w-2/4"></div>
            <div className="h-4 bg-slate-200 rounded w-1/4"></div>
          </div>
        ) : perfil ? (
          <>
            <p>
            <b>Email:</b> {user.email}{" "}
            {emailVerificado ? (
              <span className="text-green-600 font-medium ml-2">Verificado</span>
            ) : (
              <>
                <span className="text-red-600 font-medium ml-2">Aguardando verificação</span>
                <Button
                  onClick={async () => {
                    try {
                      await sendEmailVerification(auth.currentUser);
                      setMensagem("📩 E-mail de verificação reenviado com sucesso!");
                    } catch (e) {
                      setErro("Erro ao reenviar e-mail: " + e.message);
                    }
                  }}
                  className="ml-3 mt-3 bg-blue-500 hover:bg-blue-600 text-white text-xs px-1 py-1"
                >
                  Reenviar e-mail de confirmação
                </Button>
              </>
            )}
          </p>




            <p><b>Nome:</b> {perfil.nome || "(sem nome)"}</p>
            <p><b>Telefone:</b> {perfil.telefone || "(sem telefone)"}</p>
            <p><b>CPF:</b> {perfil.cpf || "(não informado)"}</p>
            <p><b>Data de Nascimento:</b> {formatarDataCompleta(perfil.dataNascimento)}</p>
          </>
        ) : (
          <p className="text-slate-600 mt-2">Nenhum perfil carregado.</p>
        )}

        {erro && <p className="text-red-600 mt-2 font-medium">{erro}</p>}
        {mensagem && <p className="text-green-700 mt-2 font-medium">{mensagem}</p>}
      </div>

      {/* Ações */}
      {!carregandoPerfil && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
          onClick={() => {
            setErro("");
            setMensagem("");
            setErroModal("");
            setMensagemModal("");
            setSenha("");

            // 🩵 Corrige o formato da data antes de abrir o modal
            if (perfil?.dataNascimento) {
              const p = perfil.dataNascimento.split(/[\/\-]/);
              let dd, mm, yyyy;
              if (p[0]?.length === 4) [yyyy, mm, dd] = p; // se vier como YYYY-MM-DD
              else [dd, mm, yyyy] = p;
              setFormData((prev) => ({
                ...prev,
                dataNascimento: `${String(dd).padStart(2, "0")}/${String(mm).padStart(2, "0")}/${yyyy}`,
              }));
            }

            setModo("atualizar");
          }}
          className="bg-gray-500 hover:bg-yellow-400 text-white"
        >
          Atualizar dados
        </Button>


          <Button
          onClick={() => {
            setErro("");
            setMensagem("");
            setErroModal("");
            setMensagemModal("");
            setNovoEmail("");
            setSenha("");
            setModo("email");
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          >
          Atualizar e-mail
          </Button>

          <Button
            onClick={() => {
              setErro("");
              setMensagem("");
              setSenha("");
              setConfirmarSenha("");
              setMostrarSenha(false);
              setMostrarSenhaConfirmar(false);
              setModo("excluir");
            }}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Excluir conta
          </Button>
          <Button onClick={logout} className="bg-gray-800 text-white">
            Sair
          </Button>
        </div>
      )}

      {/* Modal principal */}
      {modo && modo !== "excluido" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-lg shadow-xl p-6 w-80 relative">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">
              {modo === "atualizar" && "Atualizar Dados"}
              {modo === "email" && "Atualizar e-mail"}
              {modo === "excluir" && "Excluir Conta"}
            </h3>

            {erroModal && (
            <p className="text-red-600 text-sm mb-2 font-medium text-center">{erroModal}</p>
            )}
            {mensagemModal && (
              <p className="text-green-700 text-sm mb-2 font-medium text-center">
                {mensagemModal}
              </p>
            )}


            {/* Atualizar dados */}
            {modo === "atualizar" && (
              <div className="space-y-3">
                <label className="block text-sm text-gray-700">
                  Nome completo:
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className="w-full border border-gray-500 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </label>

                <label className="block text-sm text-gray-700">
                  Telefone:
                  <IMaskInput
                    mask="(00) 00000-0000"
                    placeholder="(00) 00000-0000"
                    value={formData.telefone}
                    onAccept={(v) => setFormData({ ...formData, telefone: v })}
                    className="w-full border border-gray-500 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </label>

                <label className="block text-sm text-gray-700">
                  CPF:
                  <IMaskInput
                    mask="000.000.000-00"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onAccept={(v) => setFormData({ ...formData, cpf: v })}
                    className="w-full border border-gray-500 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </label>

                <label className="block text-sm text-gray-700">
                  Data de Nascimento:
                  <IMaskInput
                    mask="00/00/0000"
                    placeholder="DD/MM/AAAA"
                    value={formData.dataNascimento}
                    onAccept={(v) => setFormData({ ...formData, dataNascimento: v })}
                    className="w-full border border-gray-500 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                </label>

                <label className="block text-sm text-gray-700 relative">
                  Digite sua senha para confirmar alterações:
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full border border-gray-500 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-3 top-7 text-gray-500 hover:text-gray-700"
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </label>

                <Button
                  onClick={handleAtualizar}
                  disabled={salvando}
                  className="bg-gray-500 hover:bg-yellow-400 text-white w-full mt-3 flex items-center justify-center"
                >
                  {salvando ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                  {salvando ? "Atualizando..." : "Atualizar"}
                </Button>
              </div>
            )}

            {/* Atualizar e-mail */}
            {modo === "email" && (
              <div className="space-y-3">
                <label className="block text-sm text-gray-700">Novo e-mail:</label>
                <input
                  type="email"
                  value={novoEmail}
                  onChange={(e) => setNovoEmail(e.target.value)}
                  className="w-full border border-gray-500 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  placeholder="exemplo@novoemail.com"
                />

                <label className="block text-sm text-gray-700 relative">
                  Digita sua senha para confirmar:
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full border border-gray-500 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                    placeholder="Senha atual"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-3 top-[33px] text-gray-500 hover:text-gray-700"
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </label>

                <Button
                  onClick={handleAtualizarEmail}
                  disabled={salvando}
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full flex items-center justify-center"
                >
                  {salvando ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                  {salvando ? "Atualizando..." : "Confirmar atualização"}
                </Button>
              </div>
            )}

            {/* Excluir conta */}
            {modo === "excluir" && (
              <div className="space-y-3">
                <label className="block text-sm text-gray-700 relative">
                  Digite sua nova senha:
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    className="w-full border border-gray-500 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-3 top-[33px] text-gray-500 hover:text-gray-700"
                  >
                    {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </label>

                <label className="block text-sm text-gray-700 relative">
                  Repetir senha nova:
                  <input
                    type={mostrarSenhaConfirmar ? "text" : "password"}
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full border border-gray-500 rounded px-3 py-2 text-sm mt-1 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenhaConfirmar((v) => !v)}
                    className="absolute right-3 top-[33px] text-gray-500 hover:text-gray-700"
                  >
                    {mostrarSenhaConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </label>

                <Button
                  onClick={handleExcluirConta}
                  disabled={salvando}
                  className="bg-red-600 hover:bg-red-700 text-white w-full flex items-center justify-center"
                >
                  {salvando ? <Loader2 className="animate-spin mr-2" size={18} /> : null}
                  {salvando ? "Excluindo..." : "Excluir Conta"}
                </Button>
              </div>
            )}

            {/* Fechar modal */}
            <button
              onClick={() => {
                setErro("");
                setMensagem("");
                setErroModal("");
                setMensagemModal("");
                setSenha("");
                setConfirmarSenha("");
                setNovoEmail("");
                setMostrarSenha(false);
                setMostrarSenhaConfirmar(false);
                setModo(null);
              }}
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-800 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Modal de sucesso */}
      {modo === "excluido" && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999]">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-96 text-center">
            <div className="flex justify-center mb-4">
              <div className="bg-green-100 text-green-600 rounded-full p-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Conta excluída com sucesso
            </h3>
            <p className="text-gray-600 mb-6">
              Seus dados foram removidos do sistema. Esperamos vê-lo novamente.
            </p>

            <Button
              onClick={async () => {
                await logout();
                window.location.href = "/";
              }}
              className="bg-gray-900 hover:bg-gray-800 text-white w-full py-2 rounded-md"
            >
              Voltar à tela inicial
            </Button>

            <button
              onClick={async () => {
                await logout();
                window.location.href = "/";
              }}
              className="absolute top-2 right-3 text-gray-500 hover:text-gray-700 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
