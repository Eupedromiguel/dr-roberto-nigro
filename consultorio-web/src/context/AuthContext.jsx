import { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
import { onIdTokenChanged, signOut, getIdTokenResult } from "firebase/auth";
import { auth } from "../services/firebase";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";
import { useNavigate, useLocation } from "react-router-dom";


const AuthCtx = createContext(null);
const db = getFirestore();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🧩 flags internas (não disparam re-render)
  const reloadedOnce = useRef(false);
  const syncedEmailVerified = useRef(false);

  const navigate = useNavigate();
  const location = useLocation();

  // =====================================================
  // 🔹 Tenta buscar o claim "role" com algumas tentativas
  // =====================================================
  async function fetchRoleWithRetries(currentUser, { tries = 6, interval = 400 } = {}) {
    for (let i = 0; i < tries; i++) {
      const tokenResult = await getIdTokenResult(currentUser, true);
      const claimRole = tokenResult.claims?.role || null;
      if (claimRole) return claimRole;
      await new Promise((r) => setTimeout(r, interval));
    }
    return null;
  }

  // =====================================================
  // 🔹 Escuta o estado de autenticação (login / logout / refresh)
  // =====================================================
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (u) => {
      setLoading(true);

      try {
        // -------------------------
        // 🔴 Usuário deslogado
        // -------------------------
        if (!u) {
          setUser(null);
          setRole(null);
          reloadedOnce.current = false;
          syncedEmailVerified.current = false;
          setLoading(false);
          return;
        }

        // -------------------------
        // 🔁 Faz reload apenas uma vez por login
        // -------------------------
        if (!reloadedOnce.current) {
          try {
            await u.reload();
            reloadedOnce.current = true;
          } catch (err) {
            console.warn("⚠️ Falha ao recarregar usuário:", err.message);
          }
        }

        // -------------------------
        // ✅ Atualiza user local
        // -------------------------
        const refreshedUser = auth.currentUser;
        setUser(refreshedUser);

        // 🟢 Se e-mail acabou de ser verificado → sincroniza apenas o campo, sem criar doc

      if (refreshedUser?.emailVerified && !syncedEmailVerified.current) {
        try {
          const ref = doc(db, "usuarios", refreshedUser.uid);
          const snap = await getDoc(ref);

          // 🔹 Só sincroniza se o documento existir
          if (snap.exists()) {
            await setDoc(ref, { emailVerificado: true }, { merge: true });
            console.log("✅ Campo 'emailVerificado' sincronizado no Firestore!");
          } else {
            console.warn("⚠️ Documento de usuário ainda não existe, pulando sincronização de emailVerificado.");
          }

          syncedEmailVerified.current = true;
        } catch (e) {
          console.warn("⚠️ Falha ao sincronizar emailVerificado:", e.message);
        }
      }


        // -------------------------
        // 🎭 Obtém o papel (role)
        // -------------------------
        const first = await getIdTokenResult(u);
        let claimRole = first.claims?.role || null;
        if (!claimRole) {
          claimRole = await fetchRoleWithRetries(u, { tries: 6, interval: 400 });
        }

        setRole(claimRole);
      } catch (e) {
        console.error("AuthContext error:", e);
        setRole(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // =====================================================
  // 🔹 Valor do contexto (compartilhado com o app)
  // =====================================================
  const value = useMemo(
    () => ({
      user,
      role,
      loading,
      logout: async () => {
        reloadedOnce.current = false;
        syncedEmailVerified.current = false;
        await signOut(auth);
      },
    }),
    [user, role, loading]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  return useContext(AuthCtx);
}
