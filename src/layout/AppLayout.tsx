// src/layout/AppLayout.tsx
import { Outlet, useLocation, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { useEffect, useRef, useState } from "react";
import FAQChatbot from "@/components/FAQChatbot";
import paymentsService from "@/services/paymentsService";

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

  // Aviso para organizadores si los pagos no están listos
  // null = oculto | "disabled" = pagos deshabilitados | "incomplete" = datos faltantes
  const [payoutNotice, setPayoutNotice] = useState<null | "disabled" | "incomplete">(null);

  // Escucha el evento global emitido por api.ts => window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason } }))
  useEffect(() => {
    function onLogout(ev: Event) {
      const ce = ev as CustomEvent<{ reason?: string }>;
      const msg = messageFromReason(ce?.detail?.reason);
      setBanner(msg);

      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setBanner(null), 6000);
    }

    window.addEventListener("auth:logout", onLogout as EventListener);
    return () => {
      window.removeEventListener("auth:logout", onLogout as EventListener);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  // Si cambias de ruta, cerramos el toast de logout
  useEffect(() => {
    if (banner) setBanner(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Chequeo de payoutsReady en rutas de organizador aprobadas
  useEffect(() => {
    let cancelled = false;

    async function checkPayoutNotice() {
      const p = location.pathname;

      // Solo aplicar en zona organizador (excepto pendiente y la propia página de cuenta)
      const isOrganizerArea = p.startsWith("/organizador") || p.startsWith("/organizer");
      const isPending = p.startsWith("/organizador/pendiente");
      const isSettings = p.startsWith("/organizador/cuenta-cobro") || p.startsWith("/organizer/payout-settings");

      if (!isOrganizerArea || isPending || isSettings) {
        if (!cancelled) setPayoutNotice(null);
        return;
      }

      try {
        const acc = await paymentsService.getMyConnectedAccount();
        // Si no está listo, decidimos el motivo para el copy del banner
        if (!acc?.payoutsReady) {
          const reason = acc?.payoutsEnabled === false ? "disabled" : "incomplete";
          if (!cancelled) setPayoutNotice(reason);
        } else {
          if (!cancelled) setPayoutNotice(null);
        }
      } catch {
        // Si responde 403 (no organizer o no aprobado), ocultamos el aviso.
        if (!cancelled) setPayoutNotice(null);
      }
    }

    checkPayoutNotice();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Navbar />
      <main className="flex-1">
        {/* Aviso para organizadores si pagos no están listos */}
        {payoutNotice && (
          <div className="mx-auto max-w-6xl px-4 pt-4">
            <div className="rounded-md border border-sky-200 bg-sky-50 text-sky-900 p-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-start gap-2">
                <span aria-hidden>💳</span>
                <div className="text-sm">
                  {payoutNotice === "disabled" ? (
                    <>
                      <strong className="font-medium">Importante:</strong>{" "}
                      tus pagos están <span className="font-semibold">deshabilitados</span>. Configura tu{" "}
                      <span className="font-semibold">cuenta de cobro</span> para que podamos
                      programar depósitos cuando el admin apruebe tus ventas.
                    </>
                  ) : (
                    <>
                      <strong className="font-medium">Atención:</strong>{" "}
                      tu <span className="font-semibold">cuenta de cobro</span> tiene datos{" "}
                      <span className="font-semibold">incompletos</span>. Complétala para habilitar pagos y recibir transferencias.
                    </>
                  )}
                </div>
              </div>
              <Link
                to="/organizador/cuenta-cobro"
                className="inline-flex items-center rounded-md bg-sky-600 px-3 py-2 text-white text-sm hover:bg-sky-700"
              >
                Configurar ahora
              </Link>
            </div>
          </div>
        )}

        <Outlet />
      </main>

      {/* Toast superior (logout / auth) */}
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





