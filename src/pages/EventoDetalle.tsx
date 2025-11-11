// src/pages/EventoDetalle.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "@/services/api";
import type { EventItem } from "@/types/event";
import TicketPurchaseFlow from "@/components/TicketPurchaseFlow";
import { useAuth } from "@/context/AuthContext";
import TicketsList from "@/components/TicketsList";

/* ================= Helpers para HOLD ================= */
function calcHoldRemainingSeconds(opts: {
  expiresAt?: string | null;
  createdAt?: string | null;
  holdMinutes?: number | null;
}): number {
  const now = Date.now();
  const hmin = Math.max(1, Math.floor(opts.holdMinutes ?? 15));
  const expiryMs = opts.expiresAt
    ? new Date(opts.expiresAt).getTime()
    : opts.createdAt
    ? new Date(opts.createdAt).getTime() + hmin * 60_000
    : now;
  const remaining = Math.max(0, Math.floor((expiryMs - now) / 1000));
  return Math.min(remaining, hmin * 60);
}
function formatCountdownMMSS(totalSeconds: number) {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}
/* ===================================================== */

export default function EventoDetalle() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventIdNum = Number(id || 0);

  const [ev, setEv] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  const { user } = useAuth() as { user?: { id: number; role: string } };

  //Detectar si venimos de un pago exitoso
  const showPurchaseSuccess = searchParams.get('showPurchaseSuccess') === 'true';
  const successReservationId = searchParams.get('reservationId');
  const successPurchaseGroupId = searchParams.get('purchaseGroupId');
  
  //Detectar estados de pago (failed, aborted, timeout, error, own-event-forbidden)
  const paymentStatus = searchParams.get('paymentStatus'); // 'failed' | 'aborted' | 'timeout' | 'error' | 'own-event-forbidden'
  const paymentError = searchParams.get('error');
  const paymentAmount = searchParams.get('amount');
  
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [modalReservationId, setModalReservationId] = useState<string | null>(null);
  const [modalPurchaseGroupId, setModalPurchaseGroupId] = useState<string | null>(null);
  const [modalPaymentStatus, setModalPaymentStatus] = useState<string | null>(null);
  const [modalPaymentError, setModalPaymentError] = useState<string | null>(null);
  const [modalPaymentAmount, setModalPaymentAmount] = useState<string | null>(null);

  // Mostrar modal cuando detectamos parámetros de éxito
  useEffect(() => {
    if (showPurchaseSuccess && successReservationId) {
      // Guardar los IDs en el estado local antes de limpiar URL
      setModalReservationId(successReservationId);
      setModalPurchaseGroupId(successPurchaseGroupId);
      setShowSuccessModal(true);
      
      // Limpiar parámetros de URL inmediatamente para evitar re-renders
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('showPurchaseSuccess');
      newParams.delete('reservationId');
      newParams.delete('purchaseGroupId');
      setSearchParams(newParams, { replace: true });
    }
  }, [showPurchaseSuccess, successReservationId, successPurchaseGroupId, searchParams, setSearchParams]);

  //Mostrar modal para estados de pago (failed, aborted, timeout, error)
  useEffect(() => {
    if (paymentStatus && ['failed', 'aborted', 'timeout', 'error', 'own-event-forbidden'].includes(paymentStatus)) {
      setModalPaymentStatus(paymentStatus);
      setModalPaymentError(paymentError);
      setModalPaymentAmount(paymentAmount);
      setShowPaymentModal(true);
      
      // Limpiar parámetros de URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('paymentStatus');
      newParams.delete('error');
      newParams.delete('amount');
      newParams.delete('buyOrder');
      newParams.delete('reservationId');
      setSearchParams(newParams, { replace: true });
    }
  }, [paymentStatus, paymentError, paymentAmount, searchParams, setSearchParams]);

  const [activeHold, setActiveHold] = useState<null | {
    id: number;
    eventId: number;
    quantity: number;
    amount: number;
    createdAt?: string | null;
    expiresAt?: string | null;
  }>(() => {
    try {
      const raw = localStorage.getItem("pe:lastHold");
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && Number(parsed.eventId) === Number(eventIdNum)) return parsed;
      return null;
    } catch {
      return null;
    }
  });

  const initialLeft = useMemo(() => {
    if (!activeHold) return 0;
    const holdMinutes =
      (ev as any)?.holdMinutes ?? (ev as any)?.bookingHoldMinutes ?? null;
    return calcHoldRemainingSeconds({
      expiresAt: activeHold.expiresAt,
      createdAt: activeHold.createdAt,
      holdMinutes,
    });
  }, [activeHold, ev]);

  const [secondsLeft, setSecondsLeft] = useState(initialLeft);
  const tickRef = useRef<number | null>(null);

  async function fetchEvent() {
    if (!id) return;
    try {
      const res = await api.get(`/events/${id}`);
      const item: EventItem = (res.data as any)?.event ?? res.data;
      setEv(item);
      setErr(null);
    } catch (e: any) {
      setErr(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Error al cargar el evento"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    fetchEvent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    setSecondsLeft(initialLeft);
    if (!activeHold) return;

    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }

    tickRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (tickRef.current) {
            clearInterval(tickRef.current);
            tickRef.current = null;
          }
          try {
            localStorage.removeItem("pe:lastHold");
          } catch {}
          setActiveHold(null);
          fetchEvent();
          return 0;
        }
        return s - 1;
      });
    }, 1000) as any;

    return () => {
      if (tickRef.current) {
        clearInterval(tickRef.current);
        tickRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeHold, initialLeft]);

  if (loading) return <HeroSkeleton />;
  if (err) return <p className="p-6 text-red-600">{err}</p>;
  if (!ev) return <p className="p-6">No se encontró el evento.</p>;

  // Imagen
  const rawImage = (ev as any).imageUrl ?? (ev as any).coverImageUrl ?? undefined;
  const imageUrl = normalizeUnsplash(sanitizeGoogleImgUrl(rawImage));
  const showImage = !!imageUrl && !broken;

  // Datos
  const venue = (ev as any).venue ?? (ev as any).location ?? "";
  const city = (ev as any).city ?? "";
  const unitPrice = (typeof (ev as any).price === "number"
    ? (ev as any).price
    : (ev as any).priceFrom ?? undefined) as number | undefined;
  const remaining = (ev as any).remaining ?? undefined;
  const dateIso = (ev as any).date ?? (ev as any).startAt ?? undefined;
  const soon = isSoon(dateIso, 7);
  const organizer = (ev as any).organizer ?? null;

  const isOwner =
    !!user &&
    Number((ev as any).organizerId ?? (ev as any).organizer?.id ?? -1) ===
      Number(user.id);

  const mapsHref = venue
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        venue
      )}`
    : null;
  const mapsEmbed = venue
    ? `https://www.google.com/maps?q=${encodeURIComponent(venue)}&output=embed`
    : null;

  return (
    <div className="min-h-[60vh]">
      {/* HERO */}
      <div className="relative h-72 md:h-96 w-full overflow-hidden">
        {showImage ? (
          <img
            src={imageUrl}
            alt={ev.title}
            className="absolute inset-0 h-full w-full object-cover"
            style={{ filter: "saturate(1.05) contrast(1.03)" }}
            referrerPolicy="no-referrer"
            onError={() => setBroken(true)}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500" />
        )}
        <div className="absolute inset-0 bg-black/45" />

        <div className="relative max-w-6xl mx-auto h-full px-6 flex flex-col justify-end pb-8 text-white">
          <div className="mb-3 flex items-center gap-2">
            {soon && (
              <span className="self-start bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-1 rounded-full shadow">
                Próximo
              </span>
            )}
            {isOwner && (
              <span
                className="self-start bg-emerald-500/95 text-white text-xs font-semibold px-2 py-1 rounded-full shadow"
                title="Sólo tú ves este indicador"
              >
                Tu evento
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">
            {ev.title}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/90">
            <span className="inline-flex items-center gap-2">
              <CalendarIcon />
              {formatFechaLarga(dateIso)}
            </span>
            {(venue || city) && (
              <span className="inline-flex items-center gap-2">
                <PinIcon />
                {[venue, city].filter(Boolean).join(" — ")}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Banner de evento desactivado */}
      {ev && (ev as any).isActive === false && (
        <div className="max-w-6xl mx-auto px-6 pt-6">
          <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-semibold text-red-900 mb-1">
                  Evento desactivado
                </h3>
                <p className="text-sm text-red-800">
                  Este evento ha sido desactivado por el organizador. No es posible comprar entradas en este momento.
                  {isOwner && (
                    <span className="block mt-2 text-red-700 italic">
                      Como organizador, puedes reactivar este evento desde tu panel de control.
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONTENIDO */}
      <section className="max-w-6xl mx-auto p-6 grid gap-6 lg:grid-cols-[1fr,400px]">
        {/* Principal */}
        <article className="space-y-6 min-w-0">{/* min-w-0 previene overflow */}
          <div>
            <h2 className="text-xl font-semibold mb-3">Acerca del evento</h2>

            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800">
                📅 {formatFechaLarga(dateIso)}
              </span>
              {venue && (
                <a
                  href={mapsHref!}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-800 hover:bg-gray-200"
                  title="Ver en Google Maps"
                >
                  📍 {venue}
                </a>
              )}
            </div>

            <div className="prose max-w-none mb-6">
              {(ev as any)?.description?.trim() ? (
                <p className="text-gray-700 whitespace-pre-line">
                  {(ev as any).description}
                </p>
              ) : (
                <p className="text-gray-600">
                  Aún no hay una descripción detallada. Aquí tienes la
                  información clave de fecha, lugar y precio. Si necesitas más
                  detalles, usa el botón de ayuda o contacta al organizador.
                </p>
              )}
            </div>

            {(organizer?.name || organizer?.email) && (
              <div className="mb-6 rounded-lg border p-4">
                <div className="text-sm text-gray-600 mb-1">Organiza</div>
                <div className="font-medium">
                  {organizer?.name || "Organizador"}
                </div>
                {organizer?.email && (
                  <a
                    href={`mailto:${organizer.email}`}
                    className="text-sm underline text-gray-700 hover:text-gray-900"
                  >
                    {organizer.email}
                  </a>
                )}
              </div>
            )}

            {/* Mapa embebido */}
            {mapsEmbed && (
              <div className="mb-6 rounded-lg border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2">
                  <h3 className="font-medium">Cómo llegar</h3>
                  {mapsHref && (
                    <a
                      href={mapsHref}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm underline text-gray-700 hover:text-gray-900"
                    >
                      Abrir en Google Maps
                    </a>
                  )}
                </div>
                <div className="w-full h-64">
                  <iframe
                    src={mapsEmbed}
                    className="w-full h-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    aria-label={`Mapa de ${venue}`}
                  />
                </div>
              </div>
            )}

          </div>

          {city && (
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-1">Ciudad</h3>
              <p>{city}</p>
            </div>
          )}
        </article>

        {/* Lateral / CTA */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-2xl border p-5 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
            <div className="space-y-2">
              {typeof unitPrice === "number" && (
                <div>
                  <span className="text-sm text-gray-500">Valor Unitario</span>
                  <div className="text-2xl font-bold">{formatMoney(unitPrice)}</div>
                </div>
              )}

              {typeof remaining === "number" && (
                <p className="text-sm text-gray-900">
                  Entradas disponibles: <strong>{remaining}</strong>
                </p>
              )}
            </div>

            {activeHold && secondsLeft > 0 && (
              <div className="rounded-xl border p-3 bg-indigo-50 text-indigo-900">
                <div className="font-semibold mb-1">Reserva activa</div>
                <div className="text-sm">
                  Tiempo restante:{" "}
                  <span className="font-mono tabular-nums">
                    {formatCountdownMMSS(secondsLeft)}
                  </span>{" "}
                  <span className="text-gray-500">
                    ({activeHold.quantity} ×{" "}
                    {new Intl.NumberFormat("es-CL", {
                      style: "currency",
                      currency: "CLP",
                      maximumFractionDigits: 0,
                    }).format((ev as any)?.price ?? 0)}
                    )
                  </span>
                  <div className="mt-1">
                    Total:{" "}
                    <b>
                      {new Intl.NumberFormat("es-CL", {
                        style: "currency",
                        currency: "CLP",
                        maximumFractionDigits: 0,
                      }).format(activeHold.amount)}
                    </b>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-lg bg-indigo-600 text-white py-2 hover:bg-indigo-700"
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("pe:resume-payment", {
                        detail: { bookingId: activeHold.id },
                      })
                    );
                  }}
                >
                  Reanudar pago
                </button>
              </div>
            )}

            {/* Flujo de compra unificado */}
            {ev && eventIdNum > 0 && (
              <div className="mt-6">
                <TicketPurchaseFlow
                  eventId={eventIdNum}
                  eventType={ev.eventType as 'RESALE' | 'OWN'}
                  eventPrice={ev.price || 0}
                  onPurchaseComplete={(_reservationId) => {
                    // Compra completada - el componente maneja la UI internamente
                  }}
                />
              </div>
            )}

            {venue && (
              <div className="pt-2 text-sm text-gray-600">
                <h4 className="font-semibold">Lugar</h4>
                <p>{venue}</p>
              </div>
            )}

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigator.clipboard.writeText(window.location.href)}
                className="inline-flex w-full items-center justify-center gap-2 px-4 py-2 rounded-lg border hover:bg-black/5"
              >
                Compartir
              </button>
            </div>
          </div>
        </aside>
      </section>

      {/*Modal de Compra Exitosa */}
      {showSuccessModal && modalReservationId && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowSuccessModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">¡Compra exitosa!</h2>
                    <p className="text-green-100 text-sm">Tu pago ha sido procesado correctamente</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                  title="Cerrar"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              {/* Lista de entradas */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  Tus Entradas
                </h3>
                <TicketsList 
                  reservationId={Number(modalReservationId)} 
                  purchaseGroupId={modalPurchaseGroupId || undefined}
                  showFullView={true} 
                />
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => window.location.href = '/mis-entradas'}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  Ver Todas Mis Entradas
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/*Modal de Estados de Pago (Failed, Aborted, Timeout, Error) */}
      {showPaymentModal && modalPaymentStatus && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setShowPaymentModal(false)}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal según el estado */}
            {modalPaymentStatus === 'failed' && (
              <div className="bg-gradient-to-r from-red-500 to-rose-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Pago rechazado</h2>
                    <p className="text-red-100 text-sm">No pudimos procesar tu transacción</p>
                  </div>
                </div>
              </div>
            )}

            {modalPaymentStatus === 'aborted' && (
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-6 rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Pago cancelado</h2>
                    <p className="text-amber-100 text-sm">Cancelaste el proceso de pago</p>
                  </div>
                </div>
              </div>
            )}

            {modalPaymentStatus === 'timeout' && (
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white p-6 rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Pago expirado</h2>
                    <p className="text-orange-100 text-sm">El tiempo límite para pagar se agotó</p>
                  </div>
                </div>
              </div>
            )}

            {(modalPaymentStatus === 'error' || modalPaymentStatus === 'own-event-forbidden') && (
              <div className="bg-gradient-to-r from-rose-500 to-pink-600 text-white p-6 rounded-t-2xl">
                <div className="flex items-center gap-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">
                      {modalPaymentStatus === 'own-event-forbidden' ? 'Acción no permitida' : 'Error en el pago'}
                    </h2>
                    <p className="text-rose-100 text-sm">Ocurrió un problema al procesar tu solicitud</p>
                  </div>
                </div>
              </div>
            )}

            {/* Contenido del modal */}
            <div className="p-6">
              {/* Mensaje de error */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                {modalPaymentStatus === 'failed' && (
                  <div>
                    <p className="text-gray-700 mb-4">
                      {modalPaymentError || 'Tu banco rechazó la transacción. Esto puede deberse a fondos insuficientes, límites de compra excedidos, o problemas con tu tarjeta.'}
                    </p>
                    <ul className="text-sm text-gray-600 space-y-2 list-disc list-inside">
                      <li>Verifica que tu tarjeta tenga fondos suficientes</li>
                      <li>Confirma que tu tarjeta esté habilitada para compras en línea</li>
                      <li>Intenta con otra tarjeta o medio de pago</li>
                      <li>Contacta a tu banco si el problema persiste</li>
                    </ul>
                  </div>
                )}

                {modalPaymentStatus === 'aborted' && (
                  <div>
                    <p className="text-gray-700 mb-4">
                      Cancelaste el proceso de pago en Webpay. Tu reserva ha sido liberada y las entradas están nuevamente disponibles.
                    </p>
                    <p className="text-sm text-gray-600">
                      Puedes volver a intentar la compra cuando lo desees. Las entradas se reservarán por 15 minutos una vez que inicies el proceso.
                    </p>
                  </div>
                )}

                {modalPaymentStatus === 'timeout' && (
                  <div>
                    <p className="text-gray-700 mb-4">
                      {modalPaymentError || 'El tiempo límite para completar el pago se agotó. Tu reserva ha sido liberada automáticamente.'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Las entradas están nuevamente disponibles. Puedes volver a seleccionarlas e intentar el pago nuevamente.
                    </p>
                  </div>
                )}

                {modalPaymentStatus === 'error' && (
                  <div>
                    <p className="text-gray-700 mb-4">
                      {modalPaymentError || 'Ocurrió un error al procesar tu pago. Por favor, intenta nuevamente en unos minutos.'}
                    </p>
                    <p className="text-sm text-gray-600">
                      Si el problema persiste, contacta a nuestro equipo de soporte.
                    </p>
                  </div>
                )}

                {modalPaymentStatus === 'own-event-forbidden' && (
                  <div>
                    <p className="text-gray-700 mb-4">
                      No puedes comprar entradas de tu propio evento como organizador. La reserva asociada fue cancelada.
                    </p>
                    <p className="text-sm text-gray-600">
                      Si necesitas entradas para tu evento, debes crearlas desde el panel de organizador.
                    </p>
                  </div>
                )}

                {/* Mostrar monto si está disponible */}
                {modalPaymentAmount && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Monto del intento:</span>
                      <span className="font-semibold text-gray-900">
                        ${Number(modalPaymentAmount).toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    // Opcional: hacer scroll hasta el selector de entradas
                    window.scrollTo({ top: 400, behavior: 'smooth' });
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Volver a intentar
                </button>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================= Helpers ================= */
function sanitizeGoogleImgUrl(raw?: string) {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    if (/google\.[^/]+/i.test(u.hostname) && u.pathname.includes("/imgres")) {
      const imgurl = u.searchParams.get("imgurl");
      if (imgurl) return decodeURIComponent(imgurl);
    }
    return raw;
  } catch {
    return raw;
  }
}
function normalizeUnsplash(url?: string, w = 1600, h = 900) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!/images\.unsplash\.com/.test(u.hostname)) return url;
    const sp = u.searchParams;
    sp.set("fm", "jpg");
    sp.set("auto", "format");
    sp.set("fit", "crop");
    sp.set("w", String(w));
    sp.set("h", String(h));
    sp.set("q", "70");
    u.search = `?${sp.toString()}`;
    return u.toString();
  } catch {
    return url;
  }
}
function formatFechaLarga(iso?: string | null) {
  if (!iso) return "Fecha por confirmar";
  const d = new Date(iso);
  try {
    const s = new Intl.DateTimeFormat("es-CL", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return d.toLocaleString();
  }
}
function isSoon(iso?: string | null, days = 7) {
  if (!iso) return false;
  const start = new Date(iso).getTime();
  const now = Date.now();
  const inDays = (start - now) / (1000 * 60 * 60 * 24);
  return inDays >= 0 && inDays <= days;
}
function formatMoney(v: number, currency: string = "CLP") {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `$${v}`;
  }
}

/* ================= Icons & Skeleton ================= */
function CalendarIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 21s-6-5.33-6-10a6 6 0 1112 0c0 4.67-6 10-6 10z" strokeWidth="2" />
      <circle cx="12" cy="11" r="2" strokeWidth="2" />
    </svg>
  );
}
function HeroSkeleton() {
  return (
    <div>
      <div className="h-72 md:h-96 w-full bg-gray-200 animate-pulse" />
      <div className="max-w-6xl mx-auto p-6 grid gap-6 md:grid-cols-[1fr,360px]">
        <div className="space-y-3">
          <div className="h-6 w-1/2 bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded" />
          <div className="h-32 bg-gray-200 rounded" />
        </div>
        <div className="h-40 bg-gray-200 rounded" />
      </div>
    </div>
  );
}


















