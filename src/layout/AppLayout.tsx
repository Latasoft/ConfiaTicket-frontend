// src/layout/AppLayout.tsx
import { Outlet, useLocation } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useEffect, useRef, useState } from "react";
import FAQChatbot from "@/components/FAQChatbot";

function messageFromReason(reason?: string) {
  switch (reason) {
    case "session_expired":
      return "Tu sesión caducó. Vuelve a iniciar sesión.";
    case "deactivated":
      return "Tu cuenta está desactivada. Si crees que es un error, contáctanos.";
    case "unauthorized":
      return "Necesitas iniciar sesión para continuar.";
    case "forbidden":
      return "No tienes acceso a esa sección con tu sesión actual.";
    default:
      return "Se cerró tu sesión.";
  }
}

export default function AppLayout() {
  const location = useLocation();
  const [banner, setBanner] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  // Escucha el evento global emitido por api.ts => window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason } }))
  useEffect(() => {
    function onLogout(ev: Event) {
      // TypeScript: castear a CustomEvent con detail.reason opcional
      const ce = ev as CustomEvent<{ reason?: string }>;
      const msg = messageFromReason(ce?.detail?.reason);
      setBanner(msg);

      // Autocerrar a los 6s
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setBanner(null), 6000);
    }

    window.addEventListener("auth:logout", onLogout as EventListener);
    return () => {
      window.removeEventListener("auth:logout", onLogout as EventListener);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Si cambias de ruta, cerramos el banner
  useEffect(() => {
    if (banner) setBanner(null);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Toast superior */}
      {banner && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[60] px-4">
          <div className="max-w-[680px] w-full rounded-md border shadow bg-amber-50 text-amber-900 p-3 flex items-start gap-3">
            <span aria-hidden>⚠️</span>
            <div className="flex-1">{banner}</div>
            <button
              type="button"
              className="px-2 text-amber-900/70 hover:text-amber-900"
              onClick={() => setBanner(null)}
              aria-label="Cerrar aviso"
              title="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Widget global de FAQ/Chat (flotante) */}
      <FAQChatbot theme="indigo" />
    </div>
  );
}



