// src/routes/RequireSuperadmin.tsx
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { ReactNode } from "react";

type Props = { children?: ReactNode };

export default function RequireSuperadmin({ children }: Props) {
  const { user, loading } = useAuth();
  const loc = useLocation();

  // Mientras rehidratamos la sesión, no navegamos a ningún lado
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
        Cargando sesión…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: loc }} />;
  }
  if (user.role !== "superadmin") {
    return <Navigate to="/" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}


