import { useMemo } from "react";
import { Navigate, useLocation } from "react-router-dom";
import type { ReactNode } from "react";

type Props = {
  roles?: Array<"superadmin" | "organizer" | "buyer">;
  children: ReactNode;
};

export default function RequireRole({ roles, children }: Props) {
  // leemos al usuario del localStorage (igual que en tu api.ts)
  const raw = typeof window !== "undefined" ? localStorage.getItem("user") : null;
  const user = useMemo(() => {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }, [raw]);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const loc = useLocation();

  if (!token || !user) {
    // sin sesión → a login
    const qs = new URLSearchParams({ next: loc.pathname }).toString();
    return <Navigate to={`/login?${qs}`} replace />;
  }

  if (roles && roles.length > 0 && !roles.includes(user.role)) {
    // con sesión pero rol incorrecto → home (o una 403 si tienes)
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

