// src/routes/RequireAuth.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { ReactNode } from "react";

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mientras rehidratamos sesión, no navegamos a ningún lado.
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
        Cargando sesión…
      </div>
    );
  }

  // Si no hay usuario, mandamos a login y guardamos desde dónde venía.
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Con sesión OK, renderizamos el contenido protegido.
  return <>{children}</>;
}


