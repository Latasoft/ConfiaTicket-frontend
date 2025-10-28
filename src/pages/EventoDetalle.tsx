// src/pages/EventoDetalle.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import type { EventItem } from "@/types/event";
import BuyBox from "@/components/BuyBox";
import TicketPurchaseFlow from "@/components/TicketPurchaseFlow";
import { useAuth } from "@/context/AuthContext";

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
  const eventIdNum = Number(id || 0);

  const [ev, setEv] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  const { user } = useAuth() as { user?: { id: number; role: string } };

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

            {/* Nuevo flujo de compra según tipo de evento */}
            {ev && ev.eventType && (
              <div className="mt-6">
                <TicketPurchaseFlow
                  eventId={eventIdNum}
                  eventType={ev.eventType as 'RESALE' | 'OWN'}
                  eventPrice={ev.price || 0}
                  onPurchaseComplete={(reservationId) => {
                    console.log('Compra completada:', reservationId);
                    // Aquí podrías redirigir o mostrar un mensaje de éxito
                  }}
                />
              </div>
            )}

            {/* Fallback: BuyBox legacy para eventos sin tipo definido */}
            {(!ev || !ev.eventType) && eventIdNum > 0 && <BuyBox eventId={eventIdNum} />}

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


















