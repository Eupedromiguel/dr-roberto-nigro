import { Link } from "react-router-dom";

export default function Sidebar({ role }) {
  const menus = {
    patient: [
      { path: "/perfil", label: "Meu Perfil" },
      { path: "/paciente/agendar", label: "Agendar Consulta" },
      { path: "/paciente/consultas", label: "Minhas Consultas" },
    ],
    doctor: [
      { path: "/perfil", label: "Meu Perfil" },
      { path: "/medico/agenda", label: "Agenda" },
      { path: "/medico/consultas", label: "Consultas" },
    ],
    admin: [
      { path: "/admin/usuarios", label: "Usuários" },
      { path: "/admin/roles", label: "Papéis" },
      { path: "/admin/logs", label: "Logs" },
    ],
  };

  const list = menus[role] || [];

  return (
    <aside className="w-64 bg-white shadow-md p-4 hidden md:block">
      <h2 className="text-xl font-semibold mb-4 text-blue-700">Consultório</h2>
      <ul className="space-y-2">
        {list.map((item) => (
          <li key={item.path}>
            <Link
              to={item.path}
              className="block p-2 rounded hover:bg-blue-100 text-slate-700"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
