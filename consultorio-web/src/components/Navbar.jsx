import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Menu, X, Instagram } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { motion, AnimatePresence } from "framer-motion";

export default function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleLogout() {
    await logout();
    navigate("/");
  }

  // Menus por tipo de usuário
  const menusByRole = {
    patient: [
      { label: "Unidades", path: "/unidades" },
      { label: "Meu perfil", path: "/perfil" },
      { label: "Marcar consulta", path: "/paciente/agendar" },
      { label: "Meus agendamentos", path: "/paciente/agendamentos" },
    ],
    doctor: [
      { label: "Unidades", path: "/unidades" },
      { label: "Minha agenda", path: "/medico/agenda" },
      { label: "Consultas marcadas", path: "/medico/consultas" },
      { label: "Meu perfil", path: "/perfil" },
    ],
    admin: [
      { label: "Unidades", path: "/unidades" },
      { label: "Usuários", path: "/admin/usuarios" },
      { label: "Médicos", path: "/admin/medicos" },
      { label: "Meu perfil", path: "/perfil" },
    ],
  };

  // Menus públicos
  const publicMenus = [
    { label: "Unidades", path: "/unidades" },
    { label: "Entrar", path: "/login" },
    { label: "Cadastrar-se", path: "/register" },
  ];

  const menus = user ? menusByRole[role] || [] : publicMenus;

  // Links sociais
  const socialLinks = {
    instagram: "https://www.instagram.com/clinicadr.robertonigro/",
    whatsapp: "https://wa.me/5511965721206",
  };

  // Função de classe ativa
  function linkClasses(path) {
    const isActive = location.pathname === path;
    return `px-3 py-2 rounded-md text-sm font-medium transition ${
      isActive
        ? "bg-yellow-400 text-white font-semibold"
        : "hover:bg-yellow-400"
    }`;
  }

  return (
    <nav className="bg-gray-800 text-white shadow-md relative">
      <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
        {/* Nome da clínica */}
        <Link
          to="/"
          className="flex items-center gap-2 font-ubuntu text-xl tracking-wide hover:opacity-50 transition"
        >
        
          <span>Clínica Dr.Roberto Nigro</span>
        </Link>

        {/* Botão Mobile */}
        <button
          className="md:hidden text-white focus:outline-none"
          onClick={() => setMenuOpen((p) => !p)}
        >
          {menuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Menu Desktop */}
        <div className="hidden md:flex items-center space-x-4">
          {menus.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={linkClasses(item.path)}
            >
              {item.label}
            </Link>
          ))}

          {user && (
            <button
              onClick={handleLogout}
              className="ml-3 hover:bg-yellow-400 px-3 py-1 rounded-md text-sm font-medium transition"
            >
              Sair
            </button>
          )}

          {/* Redes sociais */}
          <div className="flex items-center ml-4 space-x-3">
            <a
              href={socialLinks.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group"
            >
              <Instagram
                size={21}
                className="text-white hover:text-pink-400 transition"
              />
              <span className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Siga no Instagram
              </span>
            </a>

            <a
              href={socialLinks.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="relative group"
            >
              <FaWhatsapp
                size={22}
                className="text-white hover:text-green-400 transition"
              />
              <span className="absolute bottom-[-30px] left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                Fale conosco no WhatsApp
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Menu Mobile (animado) */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="md:hidden bg-gray-700 border-t border-white overflow-hidden"
          >
            <div className="flex flex-col p-3 space-y-2">
              {menus.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMenuOpen(false)}
                  className={`block px-3 py-2 rounded-md text-sm transition ${
                    location.pathname === item.path
                      ? "bg-yellow-400 text-white font-semibold"
                      : "hover:bg-yellow-400"
                  }`}
                >
                  {item.label}
                </Link>
              ))}

              {user && (
                <button
                  onClick={async () => {
                    await handleLogout();
                    setMenuOpen(false);
                  }}
                  className="w-full mt-2 bg-gray-400 hover:bg-yellow-400 px-3 py-2 rounded-md text-sm font-medium"
                >
                  Sair
                </button>
              )}

              {/* Ícones sociais mobile */}
              <div className="flex justify-center mt-3 space-x-6 border-t border-gray-500 pt-3">
                <a
                  href={socialLinks.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-pink-400 transition"
                  aria-label="Instagram"
                >
                  <Instagram size={24} />
                </a>
                <a
                  href={socialLinks.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-green-400 transition"
                  aria-label="WhatsApp"
                >
                  <FaWhatsapp size={24} />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
