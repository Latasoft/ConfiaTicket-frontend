// src/routes/RequireVerifiedOrganizer.tsx
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import type { ReactNode } from "react";

export default function RequireVerifiedOrganizer({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  // Mientras rehidratamos sesión, no redirigimos
  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
        Cargando sesión…
      </div>
    );
  }

  // Sin usuario -> login
  if (!user) return <Navigate to="/login" replace />;

  // Superadmin pasa siempre
  if (user.role === "superadmin") return <>{children}</>;

  // Organizer verificado
  if (user.role === "organizer" && user.verifiedOrganizer) return <>{children}</>;

  // Organizer no verificado -> pendiente
  if (user.role === "organizer" && !user.verifiedOrganizer) {
    return <Navigate to="/organizador/pendiente" replace />;
  }

  // Buyer u otros -> invitar a postular
  return <Navigate to="/solicitar-organizador" replace />;
}
