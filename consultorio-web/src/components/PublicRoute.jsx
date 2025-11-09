import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PublicRoute({ children }) {
  const { user, role, loading } = useAuth();

  if (loading) {
    return <div className="p-4">Carregando sessão...</div>;
  }

  if (user) {
    // Redireciona para a home adequada do papel
    if (role === "doctor") return <Navigate to="/" replace />;
    if (role === "admin")  return <Navigate to="/" replace />;
    // default = patient
    return <Navigate to="/" replace />;
  }

  return children;
}
