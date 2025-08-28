// src/pages/EventoDetalle.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import type { EventItem } from "@/types/event";
import BuyBox from "@/components/BuyBox";
import { useAuth } from "@/context/AuthContext";

export default function EventoDetalle() {
  const { id } = useParams<{ id: string }>();
  const eventIdNum = Number(id || 0);

  const [ev, setEv] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);

  const { user } = useAuth() as { user?: { id: number; role: string } };

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await api.get(`/events/${id}`);
        const item: EventItem = (res.data as any)?.event ?? res.data;
        setEv(item);
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
    })();
  }, [id]);

  if (loading) return <HeroSkeleton />;
  if (err) return <p className="p-6 text-red-600">{err}</p>;
  if (!ev) return <p className="p-6">No se encontró el evento.</p>;

  // Imagen
  const rawImage = ev.imageUrl ?? ev.coverImageUrl ?? undefined;
  const imageUrl = normalizeUnsplash(sanitizeGoogleImgUrl(rawImage));
  const showImage = !!imageUrl && !broken;

  // Datos básicos
  const venue = ev.venue ?? ev.location ?? "";
  const city = ev.city ?? "";
  const unitPrice = (typeof ev.price === "number" ? ev.price : ev.priceFrom ?? undefined) as
    | number
    | undefined;
  const capacity = ev.capacity ?? undefined;
  const remaining = ev.remaining ?? undefined;
  const dateIso = ev.date ?? ev.startAt ?? undefined;
  const soon = isSoon(dateIso, 7);

  // 👇 dueño del evento (sólo visual para el usuario)
  const isOwner =
    !!user &&
    Number(ev.organizerId ?? ev.organizer?.id ?? -1) === Number(user.id);

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

          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight">{ev.title}</h1>
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
      <section className="max-w-6xl mx-auto p-6 grid gap-6 md:grid-cols-[1fr,360px]">
        {/* Principal */}
        <article className="space-y-6">
          {ev.description ? (
            <div className="prose max-w-none">
              <h2 className="text-xl font-semibold">Descripción</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{ev.description}</p>
            </div>
          ) : (
            <div className="rounded-lg border p-4 text-gray-600">
              El organizador aún no agregó una descripción detallada.
            </div>
          )}

          {city && (
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-1">Ciudad</h3>
              <p>{city}</p>
            </div>
          )}
        </article>

        {/* Lateral / CTA */}
        <aside>
          <div className="rounded-2xl border p-5 sticky top-20 space-y-4">
            <div className="space-y-2">
              {typeof unitPrice === "number" && (
                <div>
                  <span className="text-sm text-gray-500">Desde</span>
                  <div className="text-2xl font-bold">{formatMoney(unitPrice)}</div>
                </div>
              )}

              {typeof capacity === "number" && (
                <p className="text-sm text-gray-600">
                  Aforo (máx.): <strong>{capacity}</strong>
                </p>
              )}

              {typeof remaining === "number" && (
                <p className="text-sm text-gray-900">
                  Entradas disponibles: <strong>{remaining}</strong>
                </p>
              )}
            </div>

            {/* 👇 BuyBox solo con eventId */}
            {eventIdNum > 0 ? <BuyBox eventId={eventIdNum} /> : null}

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












