import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import type { EventItem } from "@/types/event";
import { getEventDetails, getPublicEvents } from "@/services/eventsService";
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
  const [includeSoldOut, setIncludeSoldOut] = useState(false);

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

      const order =
        sort === "date-asc" ? "DATE_ASC" :
        sort === "date-desc" ? "DATE_DESC" :
        sort === "price-asc" ? "PRICE_ASC" :
        sort === "price-desc" ? "PRICE_DESC" :
        "DATE_ASC";

      try {
        const resp = await getPublicEvents({
          q: debouncedQ || undefined,
          order,
          page: 1,
          pageSize: 12,
          includePast: showPast,
          includeSoldOut: showPast ? true : includeSoldOut,
        });
        setData(resp.items || []);
      } catch (e: any) {
        const msg =
          e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Error al cargar eventos públicos";
        setErr(msg);
        setData([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [sort, showPast, includeSoldOut, debouncedQ]);

  // Filtro extra client-side (también opera si el backend ignoró q)
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
    <section className="min-h-screen bg-dark-900 py-12 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header + búsqueda + orden */}
        <div className="flex flex-col gap-6 mb-10">
          <h2 className="text-5xl font-display font-bold bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">
            Eventos
          </h2>

          {/* Barra de búsqueda glassmorphism */}
          <div className="glass-light rounded-2xl p-6 border border-dark-600">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:gap-4">
              {/* Búsqueda */}
              <div className="relative flex-1">
                <input
                  value={q}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  className="input-modern w-full pl-12"
                  placeholder="Buscar por título, lugar o ciudad…"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-dark-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <circle cx="11" cy="11" r="7" strokeWidth="2" />
                  <path d="M21 21l-4.35-4.35" strokeWidth="2" />
                </svg>
                {!!q && (
                  <button
                    type="button"
                    onClick={() => handleQueryChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-300 hover:text-white text-2xl"
                    aria-label="Limpiar búsqueda"
                    title="Limpiar"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Ordenar */}
              <div className="flex items-center gap-3">
                <label className="text-sm text-dark-100 whitespace-nowrap hidden lg:block">Ordenar por</label>
                <select 
                  value={sort} 
                  onChange={(e) => setSort(e.target.value as SortKey)} 
                  className="input-modern min-w-[200px]"
                >
                  <option value="date-asc">Fecha (próximos primero)</option>
                  <option value="date-desc">Fecha (recientes primero)</option>
                  <option value="price-asc">Precio (más barato)</option>
                  <option value="price-desc">Precio (más caro)</option>
                  <option value="title-asc">Título (A–Z)</option>
                </select>
              </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap items-center gap-4 mt-4">
              <label className="inline-flex items-center gap-2 text-sm text-dark-100 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={showPast}
                  onChange={(e) => setShowPast(e.target.checked)}
                  className="rounded border-dark-500 bg-dark-700 text-neon-cyan focus:ring-neon-cyan focus:ring-offset-dark-800"
                />
                <span>Mostrar pasados</span>
              </label>

              <label className="inline-flex items-center gap-2 text-sm text-dark-100 cursor-pointer hover:text-white transition-colors">
                <input
                  type="checkbox"
                  checked={includeSoldOut}
                  onChange={(e) => setIncludeSoldOut(e.target.checked)}
                  className="rounded border-dark-500 bg-dark-700 text-neon-cyan focus:ring-neon-cyan focus:ring-offset-dark-800"
                />
                <span>Incluir agotados</span>
              </label>
            </div>
          </div>
        </div>

        {/* Estados */}
        {err && (
          <div className="glass border border-red-500/50 rounded-xl p-4 mb-6 text-white flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <p className="flex-1">{err}</p>
          </div>
        )}

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
      </div>
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

  // estado desde el detalle: remaining (pagados+pendientes), remainingPaidOnly y cierre de ventas
  const [remaining, setRemaining] = useState<number | null>(null);
  const [remainingPaidOnly, setRemainingPaidOnly] = useState<number | null>(null);
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

        // stocks
        const rem = typeof detail?.remaining === "number" ? detail.remaining : null;
        const remPaid = typeof (detail as any)?.remainingPaidOnly === "number" ? (detail as any).remainingPaidOnly : null;
        setRemaining(rem);
        setRemainingPaidOnly(remPaid);

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

  // "agotado visual": incluye reservas pendientes
  const soldOutVisual = !past && remaining !== null && remaining <= 0;

  // 🔑 Solo deshabilitar si NO queda stock considerando solo pagados
  const trulySoldOut = remainingPaidOnly !== null && remainingPaidOnly <= 0;
  const isDisabled = past || salesClosed || trulySoldOut;

  const toHref = isDisabled ? "#" : `/eventos/${ev.id}`;
  const linkClass =
    "group card-modern hover-lift overflow-hidden transition-all duration-300 " +
    (isDisabled ? "opacity-60 cursor-not-allowed pointer-events-none" : "hover:border-neon-cyan/50 hover:shadow-xl hover:shadow-neon-cyan/10");

  const showImage = !!imageUrl && !broken;

  return (
    <Link to={toHref} aria-disabled={isDisabled || undefined} tabIndex={isDisabled ? -1 : undefined} className={linkClass}>
      {/* Imagen */}
      <div className="relative overflow-hidden aspect-[16/9] bg-dark-700">
        {showImage ? (
          <>
            <img
              src={imageUrl}
              alt={ev.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              style={{ filter: "saturate(1.2) contrast(1.1)" }}
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
          ) : soldOutVisual && (remainingPaidOnly ?? 0) > 0 ? (
            <span className="bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-1 rounded-full shadow">Reservado</span>
          ) : soldOutVisual ? (
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
        <p className="text-sm text-dark-100 flex items-center gap-1">
          <CalendarIcon />
          {formatFechaLarga((ev as any).date)}
        </p>

        {((ev as any).location || (ev as any).venue) && (
          <p className="mt-1 text-sm text-dark-200 flex items-center gap-1">
            <PinIcon />
            {(ev as any).location || (ev as any).venue}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {typeof priceChip === "number" && (
            <span className="text-xs glass border border-neon-cyan/30 text-neon-cyan px-2 py-1 rounded-full">Desde {formatMoney(priceChip)}</span>
          )}
          {salesCloseAt && !salesClosed && (
            <span className="text-xs glass border border-neon-purple/30 text-neon-purple px-2 py-1 rounded-full">
              Cierra ventas: {formatFechaCorta(salesCloseAt)}
            </span>
          )}
          {/* Chip informativo cuando está “agotado” por reservas pero aún queda stock real por pagados */}
          {soldOutVisual && (remainingPaidOnly ?? 0) > 0 && (
            <span className="text-xs glass border border-neon-yellow/30 text-neon-yellow px-2 py-1 rounded-full">
              Reservado por otros • vuelve en minutos
            </span>
          )}
          {soldOutVisual && (remainingPaidOnly ?? 0) <= 0 && (
            <span className="text-xs glass border border-red-500/30 text-red-400 px-2 py-1 rounded-full">Entradas agotadas</span>
          )}
        </div>

        <div className="mt-4">
          <span className={`inline-flex items-center gap-1 ${isDisabled ? "text-dark-300" : "text-neon-cyan group-hover:gap-2 transition-all"}`}>
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
        <div key={i} className="card-modern overflow-hidden animate-pulse">
          <div className="aspect-[16/9] bg-dark-700" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-2/3 bg-dark-700 rounded" />
            <div className="h-3 w-1/2 bg-dark-700 rounded" />
            <div className="h-3 w-1/3 bg-dark-700 rounded" />
            <div className="h-8 w-24 bg-dark-700 rounded mt-2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ query }: { query?: string }) {
  return (
    <div className="glass-light rounded-2xl border border-dark-600 p-10 text-center">
      <div className="text-5xl mb-2">🧐</div>
      <h3 className="text-lg font-semibold text-white">Sin resultados</h3>
      <p className="text-dark-200">
        {query ? <>No encontramos eventos que coincidan con "<b className="text-white">{query}</b>".</> : <>Prueba otra búsqueda o vuelve más tarde.</>}
      </p>
    </div>
  );
}

/* -------------------- SVGs -------------------- */

function CalendarIcon() {
  return (
    <svg className="h-4 w-4 text-dark-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" />
      <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" />
      <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" />
      <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg className="h-4 w-4 text-dark-300" viewBox="0 0 24 24" fill="none" stroke="currentColor">
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





















