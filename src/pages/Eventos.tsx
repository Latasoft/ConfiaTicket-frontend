// src/pages/Eventos.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "@/services/api";
import type { EventItem } from "@/types/event";
import { getEventDetails } from "@/services/eventsService";
import { useAuth } from "@/context/AuthContext";

type SortKey = "date-asc" | "date-desc" | "price-asc" | "price-desc" | "title-asc";

export default function Eventos() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = (searchParams.get("q") || "").trim();

  const [data, setData] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [q, setQ] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);

  const [sort, setSort] = useState<SortKey>("date-asc");
  const [showPast, setShowPast] = useState(false);

  // si cambia ?q= por navegación, sincroniza
  useEffect(() => {
    const urlQ = (searchParams.get("q") || "").trim();
    if (urlQ !== q) setQ(urlQ);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // debounce para la búsqueda
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 350);
    return () => clearTimeout(id);
  }, [q]);

  // UX: invertir orden por fecha al alternar pasados
  useEffect(() => {
    setSort((prev) => {
      if (showPast && prev === "date-asc") return "date-desc";
      if (!showPast && prev === "date-desc") return "date-asc";
      return prev;
    });
  }, [showPast]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr(null);

      const { orderBy, orderDir } = (() => {
        switch (sort) {
          case "date-asc":  return { orderBy: "date",  orderDir: "asc" as const };
          case "date-desc": return { orderBy: "date",  orderDir: "desc" as const };
          case "price-asc": return { orderBy: "price", orderDir: "asc" as const };
          case "price-desc":return { orderBy: "price", orderDir: "desc" as const };
          case "title-asc": return { orderBy: "title", orderDir: "asc" as const };
        }
      })();

      const nowIso = new Date().toISOString();
      const baseParams: Record<string, any> = {
        page: 1,
        limit: 12,
        orderBy,
        orderDir,
        ...(showPast ? { dateTo: nowIso } : { dateFrom: nowIso }),
      };

      let items: EventItem[] = [];
      let fallbackFiltered = false;

      try {
        // 1) intento con q (si hay)
        const paramsWithQ = debouncedQ ? { ...baseParams, q: debouncedQ } : baseParams;
        const res = await api.get("/events/public-events", { params: paramsWithQ });
        items = Array.isArray(res.data) ? res.data : res.data?.events ?? [];
      } catch (e: any) {
        const status = e?.response?.status;

        // Si falló solo por el filtro (400/422, por ejemplo), reintenta sin q y filtra client-side.
        if (debouncedQ && (status === 400 || status === 422)) {
          try {
            const res2 = await api.get("/events/public-events", { params: baseParams });
            items = Array.isArray(res2.data) ? res2.data : res2.data?.events ?? [];
            fallbackFiltered = true;
          } catch (e2: any) {
            const msg =
              e2?.response?.data?.error ||
              e2?.response?.data?.message ||
              e2?.message ||
              "Error al cargar eventos";
            setErr(msg);
            items = [];
          }
        } else {
          const msg =
            e?.response?.data?.error ||
            e?.response?.data?.message ||
            e?.message ||
            "Error al cargar eventos";
          setErr(msg);
          items = [];
        }
      } finally {
        if (fallbackFiltered) setErr(null);
        setData(items);
        setLoading(false);
      }
    })();
  }, [sort, showPast, debouncedQ]);

  // Filtro extra client-side (y también se usa si hubo fallback)
  const filtered = useMemo(() => {
    const term = debouncedQ.toLowerCase();
    if (!term) return data;
    return data.filter((ev) =>
      [ev.title, (ev as any).location, (ev as any).city, (ev as any).venue]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [data, debouncedQ]);

  function handleQueryChange(v: string) {
    setQ(v);
    const t = v.trim();
    if (t) setSearchParams({ q: t }, { replace: true });
    else setSearchParams({}, { replace: true });
  }

  return (
    <section className="max-w-6xl mx-auto p-6">
      {/* Header + búsqueda + orden */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
        <h2 className="text-3xl font-extrabold tracking-tight">Eventos</h2>

        <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
          <div className="relative md:w-80">
            <input
              value={q}
              onChange={(e) => handleQueryChange(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 pl-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Buscar por título, lugar o ciudad…"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="11" cy="11" r="7" strokeWidth="2" />
              <path d="M21 21l-4.35-4.35" strokeWidth="2" />
            </svg>
            {!!q && (
              <button
                type="button"
                onClick={() => handleQueryChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Limpiar búsqueda"
                title="Limpiar"
              >
                ×
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Ordenar por</label>
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="border rounded-lg px-3 py-2">
              <option value="date-asc">Fecha (próximos primero)</option>
              <option value="date-desc">Fecha (recientes primero)</option>
              <option value="price-asc">Precio (más barato)</option>
              <option value="price-desc">Precio (más caro)</option>
              <option value="title-asc">Título (A–Z)</option>
            </select>
          </div>

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={showPast}
              onChange={(e) => setShowPast(e.target.checked)}
              className="rounded border-gray-300"
            />
            Mostrar pasados
          </label>
        </div>
      </div>

      {/* Estados */}
      {err && <p className="rounded-xl border bg-red-50 text-red-700 p-4 mb-4">{err}</p>}

      {loading ? (
        <SkeletonGrid />
      ) : filtered.length === 0 ? (
        <EmptyState query={debouncedQ} />
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((ev) => (
            <EventCard key={ev.id} ev={ev} />
          ))}
        </div>
      )}
    </section>
  );
}

/* -------------------- Card -------------------- */

// helpers para imágenes
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
function normalizeUnsplash(url?: string) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (!/images\.unsplash\.com/.test(u.hostname)) return url;
    u.searchParams.set("auto", "format");
    u.searchParams.set("fit", "crop");
    u.searchParams.set("w", "800");
    u.searchParams.set("h", "450");
    u.searchParams.set("q", "70");
    return u.toString();
  } catch {
    return url;
  }
}
function getEventImageUrl(ev: EventItem) {
  const raw = (ev as any).imageUrl ?? (ev as any).coverImageUrl ?? undefined;
  if (!raw) return undefined;
  const cleaned = sanitizeGoogleImgUrl(String(raw));
  return normalizeUnsplash(cleaned);
}
function formatMoney(v: number, currency: string = "CLP") {
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
  } catch {
    return `$${v}`;
  }
}
function formatFechaLarga(iso?: string | null) {
  if (!iso) return "Fecha por confirmar";
  const d = new Date(iso);
  try {
    const s = new Intl.DateTimeFormat("es-CL", {
      weekday: "long", year: "numeric", month: "long", day: "2-digit", hour: "2-digit", minute: "2-digit",
    }).format(d);
    return s.charAt(0).toUpperCase() + s.slice(1);
  } catch {
    return d.toLocaleString();
  }
}
function formatFechaCorta(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  try {
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(d);
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
function isPast(iso?: string | null) {
  if (!iso) return false;
  return new Date(iso).getTime() < Date.now();
}

function EventCard({ ev }: { ev: EventItem }) {
  const { user } = useAuth() as { user?: { id: number } };

  const imageUrl = getEventImageUrl(ev);
  const priceChip = (ev as any).price ?? (ev as any).priceFrom ?? undefined;
  const soon = isSoon((ev as any).date, 7);
  const past = isPast((ev as any).date);

  // estado desde el detalle: remaining + cierre de ventas
  const [remaining, setRemaining] = useState<number | null>(null);
  const [salesClosed, setSalesClosed] = useState<boolean>(false);
  const [salesCloseAt, setSalesCloseAt] = useState<string | null>(null);

  const [broken, setBroken] = useState(false);
  const [isMine, setIsMine] = useState<boolean>(() => {
    const evOrgId = Number((ev as any).organizerId ?? (ev as any).organizer?.id ?? -1);
    return !!user && Number(user.id) === evOrgId;
  });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const detail = await getEventDetails(ev.id);
        if (!active) return;
        const rem = typeof detail?.remaining === "number" ? detail.remaining : null;
        setRemaining(rem);

        // cierre de ventas
        setSalesClosed(Boolean((detail as any)?.salesClosed));
        setSalesCloseAt(typeof (detail as any)?.salesCloseAt === "string" ? (detail as any).salesCloseAt : null);

        if (user) {
          const orgId = Number(
            (detail as any)?.organizerId ?? (detail as any)?.organizer?.id ?? -1
          );
          if (orgId >= 0) setIsMine(orgId === Number(user.id));
        }
      } catch {
        /* no-op */
      }
    })();
    return () => {
      active = false;
    };
  }, [ev.id, user]);

  const soldOut = !past && remaining !== null && remaining <= 0;

  // Si las ventas están cerradas tratamos la card como "no disponible"
  const isDisabled = past || soldOut || salesClosed;

  const toHref = isDisabled ? "#" : `/eventos/${ev.id}`;
  const linkClass =
    "group rounded-2xl border overflow-hidden bg-white shadow-sm " +
    (isDisabled ? "opacity-75 cursor-not-allowed pointer-events-none" : "hover:shadow-md transition-shadow");

  const showImage = !!imageUrl && !broken;

  return (
    <Link to={toHref} aria-disabled={isDisabled || undefined} tabIndex={isDisabled ? -1 : undefined} className={linkClass}>
      {/* Imagen */}
      <div className="relative overflow-hidden aspect-[16/9]">
        {showImage ? (
          <>
            <img
              src={imageUrl}
              alt={ev.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              style={{ filter: "saturate(1.05) contrast(1.03)" }}
              referrerPolicy="no-referrer"
              onError={() => setBroken(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 grid place-content-center">
            <span className="text-white/90 text-5xl">🎟️</span>
          </div>
        )}

        {/* Badges izquierda */}
        <div className="absolute top-2 left-2 flex gap-2">
          {past ? (
            <span className="bg-neutral-300 text-neutral-900 text-xs font-semibold px-2 py-1 rounded-full shadow">Finalizado</span>
          ) : soldOut ? (
            <span className="bg-red-500 text-white text-xs font-semibold px-2 py-1 rounded-full shadow">Agotado</span>
          ) : salesClosed ? (
            <span className="bg-purple-600 text-white text-xs font-semibold px-2 py-1 rounded-full shadow">Ventas cerradas</span>
          ) : soon ? (
            <span className="bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-1 rounded-full shadow">Próximo</span>
          ) : null}
        </div>

        {/* Badge derecha: sólo el dueño lo ve */}
        {isMine && (
          <div className="absolute top-2 right-2">
            <span
              className="bg-emerald-500/95 text-white text-xs font-semibold px-2 py-1 rounded-full shadow"
              title="Sólo tú ves este indicador"
            >
              Tu evento
            </span>
          </div>
        )}

        {/* Título */}
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="text-white font-semibold text-lg leading-tight line-clamp-1 drop-shadow">{ev.title}</h3>
        </div>
      </div>

      {/* Cuerpo */}
      <div className="p-4">
        <p className="text-sm text-gray-600 flex items-center gap-1">
          <CalendarIcon />
          {formatFechaLarga((ev as any).date)}
        </p>

        {((ev as any).location || (ev as any).venue) && (
          <p className="mt-1 text-sm text-gray-700 flex items-center gap-1">
            <PinIcon />
            {(ev as any).location || (ev as any).venue}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {typeof priceChip === "number" && (
            <span className="text-xs bg-black/5 text-gray-700 px-2 py-1 rounded-full">Desde {formatMoney(priceChip)}</span>
          )}
          {salesCloseAt && !salesClosed && (
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full border border-indigo-200">
              Cierra ventas: {formatFechaCorta(salesCloseAt)}
            </span>
          )}
          {soldOut && (
            <span className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-full border border-red-200">Entradas agotadas</span>
          )}
        </div>

        <div className="mt-4">
          <span className={`inline-flex items-center gap-1 ${isDisabled ? "text-gray-400" : "text-blue-600 group-hover:gap-2 transition-all"}`}>
            Ver detalles
            <ArrowRight />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* -------------------- Skeleton / Empty -------------------- */

function SkeletonGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="rounded-2xl border overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-gray-200" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-2/3 bg-gray-200 rounded" />
            <div className="h-3 w-1/2 bg-gray-200 rounded" />
            <div className="h-3 w-1/3 bg-gray-200 rounded" />
            <div className="h-8 w-24 bg-gray-200 rounded mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ query }: { query?: string }) {
  return (
    <div className="rounded-xl border p-10 text-center">
      <div className="text-5xl mb-2">🧐</div>
      <h3 className="text-lg font-semibold">Sin resultados</h3>
      <p className="text-gray-600">
        {query ? <>No encontramos eventos que coincidan con “<b>{query}</b>”.</> : <>Prueba otra búsqueda o vuelve más tarde.</>}
      </p>
    </div>
  );
}

/* -------------------- SVGs -------------------- */

function CalendarIcon() {
  return (
    <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg className="h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M12 21s-6-5.33-6-10a6 6 0 1112 0c0 4.67-6 10-6 10z" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="11" r="2" strokeWidth="2" />
    </svg>
  );
}
function ArrowRight() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path d="M5 12h14" strokeWidth="2" />
      <path d="M12 5l7 7-7 7" strokeWidth="2" />
    </svg>
  );
}














