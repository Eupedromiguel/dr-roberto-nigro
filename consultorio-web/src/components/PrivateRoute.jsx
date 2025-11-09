import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children, roles }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="p-4">Carregando sessão...</div>;
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Se a rota exige papéis específicos
  if (roles && roles.length > 0) {
    if (!role) {
      // Ainda sem role (muito raro após o AuthContext), segura um feedback
      return <div className="p-4">Carregando permissões...</div>;
    }
    if (!roles.includes(role)) {
      // Sem permissão → manda pra uma rota segura (ex.: perfil)
      return <Navigate to="/perfil" replace />;
    }
  }

  return children;
}
