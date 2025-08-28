// src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import api from "@/services/api";

// Alinear con backend
type Role = "buyer" | "organizer" | "superadmin";

export interface AuthUser {
  id: number;
  name: string;
  email?: string;
  role: Role;
  rut?: string | null;            // 👈 NUEVO: para auto-rellenar el formulario
  verifiedOrganizer?: boolean;    // viene de /auth/me
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (token: string) => Promise<AuthUser>;
  logout: () => void;
  reloadProfile: () => Promise<AuthUser>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Storage keys
const LS_TOKEN = "token";
const LS_USER = "user";

async function fetchProfile(): Promise<AuthUser> {
  const { data } = await api.get("/auth/me");
  return data as AuthUser;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Hidratar sesión al montar (y validar token)
  useEffect(() => {
    const token = localStorage.getItem(LS_TOKEN);

    // Cache para evitar parpadeo mientras consultamos /auth/me
    const cached = localStorage.getItem(LS_USER);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as AuthUser;
        setUser(parsed);
      } catch {
        localStorage.removeItem(LS_USER);
      }
    }

    if (!token) {
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const u = await fetchProfile();
        setUser(u);
        localStorage.setItem(LS_USER, JSON.stringify(u));
      } catch {
        // Token inválido/expirado
        localStorage.removeItem(LS_TOKEN);
        localStorage.removeItem(LS_USER);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const reloadProfile = async () => {
    const u = await fetchProfile();
    setUser(u);
    localStorage.setItem(LS_USER, JSON.stringify(u));
    return u;
  };

  const login = async (token: string) => {
    localStorage.setItem(LS_TOKEN, token);
    const u = await fetchProfile();
    setUser(u);
    localStorage.setItem(LS_USER, JSON.stringify(u));
    return u;
  };

  const logout = () => {
    localStorage.removeItem(LS_TOKEN);
    localStorage.removeItem(LS_USER);
    setUser(null);
  };

  const value = useMemo<AuthContextType>(
    () => ({ user, loading, login, logout, reloadProfile }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de un <AuthProvider>");
  return ctx;
}

export default AuthContext;



