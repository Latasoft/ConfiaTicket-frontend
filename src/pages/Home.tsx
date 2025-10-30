// src/pages/Home.tsx
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api from "@/services/api";

/* ====================== Utilidades ====================== */
function roleLabel(role: string) {
  switch (role) {
    case "superadmin":
      return "Superadmin";
    case "organizer":
      return "Organizador";
    case "buyer":
      return "Comprador";
    default:
      return role;
  }
}
function Avatar({ name }: { name: string }) {
  const initial = (name?.trim()?.[0] || "?").toUpperCase();
  return (
    <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xl font-semibold">
      {initial}
    </div>
  );
}
function saludoPorHora(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "¡Buenos días!";
  if (h < 20) return "¡Buenas tardes!";
  return "¡Buenas noches!";
}
const CLP = new Intl.NumberFormat("es-CL", {
  style: "currency",
  currency: "CLP",
  maximumFractionDigits: 0,
});

/* ==================== SearchBox con recientes & tendencias (por usuario) ==================== */
const KEY_PREFIX = "home.search.v2";
const RECENT_LIMIT = 8;
const keyRecents = (uid?: number) => `${KEY_PREFIX}.${uid ?? "anon"}.recents`;
const keyLast = (uid?: number) => `${KEY_PREFIX}.${uid ?? "anon"}.last`;

function SearchBox({
  placeholder = "Busca por artista, evento o ciudad…",
  defaultQuery = "",
  userId,
}: {
  placeholder?: string;
  defaultQuery?: string;
  userId?: number; // 👈 para separar estado por usuario
}) {
  const navigate = useNavigate();

  // Estado principal
  const [q, setQ] = useState(defaultQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggests, setSuggests] = useState<Array<{ id: number; title: string }>>([]);
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Recientes por usuario
  const [recents, setRecents] = useState<string[]>([]);
  const loadRecents = (uid?: number) => {
    try {
      const raw = localStorage.getItem(keyRecents(uid)) || "[]";
      const arr = JSON.parse(raw);
      setRecents(Array.isArray(arr) ? arr.slice(0, RECENT_LIMIT) : []);
    } catch {
      setRecents([]);
    }
  };
  const saveRecents = (uid: number | undefined, values: string[]) => {
    try {
      localStorage.setItem(keyRecents(uid), JSON.stringify(values.slice(0, RECENT_LIMIT)));
    } catch {}
  };
  const pushRecent = (term: string) => {
    const t = term.trim();
    if (!t) return;
    const lower = t.toLowerCase();
    const next = [t, ...recents.filter((x) => x.toLowerCase() !== lower)].slice(0, RECENT_LIMIT);
    setRecents(next);
    saveRecents(userId, next);
  };
  const removeRecent = (term: string) => {
    const lower = term.toLowerCase();
    const next = recents.filter((x) => x.toLowerCase() !== lower);
    setRecents(next);
    saveRecents(userId, next);
  };
  const clearRecents = () => {
    setRecents([]);
    saveRecents(userId, []);
  };

  // Tendencias
  const [trending, setTrending] = useState<string[]>([]);
  async function fetchTrending() {
    try {
      const { data } = await api.get("/events", { params: { page: 1, pageSize: 8 } });
      const titles: string[] = (data?.items || [])
        .map((it: any) => String(it?.title || ""))
        .filter(Boolean);
      const uniq: string[] = [];
      for (const t of titles) if (!uniq.includes(t)) uniq.push(t);
      setTrending(uniq.slice(0, 8));
    } catch {
      setTrending(["Festival", "Santiago", "Concierto", "Teatro", "Música", "Deportes"].slice(0, 6));
    }
  }

  // Carga inicial de recientes (usuario actual)
  useEffect(() => {
    loadRecents(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔁 Cuando CAMBIA de usuario:
  // - Resetea input y dropdown
  // - Recarga recientes de ese usuario
  useEffect(() => {
    setQ(""); // 👈 resetea
    setOpen(false);
    setSuggests([]);
    setActive(-1);
    setLoading(false);
    loadRecents(userId); // 👈 por-usuario
  }, [userId]);

  // Cargar tendencias al abrir sin texto
  useEffect(() => {
    if (open && !q.trim()) fetchTrending();
  }, [open, q]);

  // Sugerencias (debounce)
  useEffect(() => {
    if (q.trim().length < 2) {
      setSuggests([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/events", { params: { q, page: 1, pageSize: 5 } });
        const items = (data?.items || [])
          .slice(0, 5)
          .map((it: any) => ({ id: Number(it.id), title: String(it.title || "") }));
        setSuggests(items);
        setActive(-1);
      } catch {
        setSuggests([]);
        setActive(-1);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  // Navegación
  const goList = (value = q) => {
    const term = value.trim();
    if (!term) return;
    try {
      localStorage.setItem(keyLast(userId), term); // 👈 último término por usuario
    } catch {}
    pushRecent(term);
    navigate(`/eventos?q=${encodeURIComponent(term)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "Escape") {
      setOpen(false);
      setActive(-1);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min((suggests.length ? suggests.length : 1) - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      if (active >= 0 && suggests[active]) {
        e.preventDefault();
        goList(suggests[active].title);
      }
    }
  };

  useEffect(() => {
    if (!listRef.current) return;
    const items = Array.from(listRef.current.querySelectorAll("[data-opt='1']")) as HTMLElement[];
    if (active >= 0 && items[active]) items[active].scrollIntoView({ block: "nearest" });
  }, [active]);

  const clearInput = () => {
    setQ("");
    setSuggests([]);
    setActive(-1);
    setOpen(true);
    inputRef.current?.focus();
  };

  const emptyState = !q.trim();

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goList();
        }}
        autoComplete="off"
        className="flex gap-3"
      >
        <div className="relative flex-1">
          <input
            ref={inputRef}
            className="w-full rounded-2xl border px-4 py-3 text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-10"
            placeholder={placeholder}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={onKeyDown}
          />
          {q && (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full hover:bg-gray-100 text-gray-500"
              aria-label="Limpiar búsqueda"
              title="Limpiar"
            >
              ×
            </button>
          )}
        </div>

        <button
          type="submit"
          className="shrink-0 rounded-2xl px-5 py-3 text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Buscar<br />eventos
        </button>
      </form>

      {/* Dropdown */}
      {open && (
        <div
          ref={listRef}
          className="absolute z-10 mt-2 w-full rounded-xl border bg-white shadow-lg overflow-hidden"
        >
          {/* Vacío: recientes + tendencias */}
          {emptyState ? (
            <div className="p-3 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                    Búsquedas recientes
                  </span>
                  {recents.length > 0 && (
                    <button
                      className="text-xs text-gray-500 hover:underline"
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={clearRecents}
                      title="Limpiar historial"
                    >
                      Limpiar
                    </button>
                  )}
                </div>
                {recents.length === 0 ? (
                  <div className="text-sm text-gray-500 px-1 py-1">
                    Sin búsquedas recientes.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {recents.map((r) => (
                      <div key={r} className="group flex items-center">
                        <button
                          className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => goList(r)}
                          title={`Buscar “${r}”`}
                        >
                          {r}
                        </button>
                        <button
                          className="ml-1 text-gray-400 hover:text-gray-600"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => removeRecent(r)}
                          aria-label="Quitar de recientes"
                          title="Quitar"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-3">
                <div className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">
                  Tendencias
                </div>
                {trending.length === 0 ? (
                  <div className="text-sm text-gray-500 px-1 py-1">Sin datos.</div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {trending.map((t) => (
                      <button
                        key={t}
                        className="text-left rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => goList(t)}
                        title={`Buscar “${t}”`}
                      >
                        🔥 {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Con texto: sugerencias rápidas
            <div className="max-h-72 overflow-auto">
              {loading && (
                <div className="px-4 py-3 text-sm text-gray-500">Buscando…</div>
              )}

              {!loading &&
                suggests.map((s, idx) => (
                  <button
                    key={s.id}
                    data-opt="1"
                    className={`block w-full text-left px-4 py-2 ${
                      idx === active ? "bg-indigo-50" : "hover:bg-gray-50"
                    }`}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => goList(s.title)}
                    title={`Buscar "${s.title}"`}
                  >
                    {s.title}
                  </button>
                ))}

              {!loading && suggests.length > 0 && (
                <button
                  className={`block w-full text-left px-4 py-2 text-sm text-gray-600 border-t ${
                    active === suggests.length ? "bg-indigo-50" : "hover:bg-gray-50"
                  }`}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(suggests.length)}
                  onClick={() => goList()}
                >
                  Buscar “{q}”
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ==================== Fila de “Eventos destacados” ==================== */
type EventCardItem = {
  id: number;
  title: string;
  date?: string | null;
  venue?: string | null;
  imageUrl?: string | null;
  minPrice?: number | null;
  soldOut?: boolean;
};
function EventCard({ item }: { item: EventCardItem }) {
  const img = item.imageUrl || undefined;
  const fecha = item.date ? new Date(item.date) : null;

  return (
    <Link
      to={`/eventos/${item.id}`}
      className="w-72 shrink-0 rounded-xl border bg-white hover:shadow-md transition overflow-hidden"
      title={item.title}
    >
      <div className="aspect-[16/10] bg-gray-100">
        {img ? (
          <img src={img} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center text-indigo-400">
            🎫
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="font-medium line-clamp-1">{item.title}</div>
        <div className="mt-1 text-xs text-gray-600 space-y-0.5">
          {fecha && <div>📅 {fecha.toLocaleString()}</div>}
          {item.venue && <div>📍 {item.venue}</div>}
        </div>
        <div className="mt-2 flex items-center gap-2">
          {item.minPrice != null ? (
            <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
              Desde {CLP.format(item.minPrice)}
            </span>
          ) : null}
          {item.soldOut ? (
            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">
              Entradas agotadas
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
function FeaturedRow({ title = "Eventos destacados" }: { title?: string }) {
  const [items, setItems] = useState<EventCardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/events", { params: { page: 1, pageSize: 12 } });
        const rows = (data?.items || []).map((it: any) => ({
          id: it.id,
          title: String(it.title || ""),
          date: it.date || it.startsAt || null,
          venue: it.venue || it.location || it.place || null,
          imageUrl: it.imageUrl || it.coverUrl || it.bannerUrl || null,
          minPrice: it.minPrice ?? it.priceFrom ?? null,
          soldOut: Boolean(it.soldOut || it.ticketsSoldOut || it.sold_out),
        })) as EventCardItem[];
        setItems(rows);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <section className="mt-10">
        <h3 className="text-lg font-semibold mb-3">{title}</h3>
        <div className="flex gap-4 overflow-x-auto">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="w-72 shrink-0 rounded-xl border bg-white overflow-hidden"
            >
              <div className="aspect-[16/10] bg-gray-100 animate-pulse" />
              <div className="p-3 space-y-2">
                <div className="h-4 w-40 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Link to="/eventos" className="text-sm text-indigo-600 hover:underline">
          Ver todos
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((it) => (
          <EventCard key={it.id} item={it} />
        ))}
      </div>
    </section>
  );
}

/* ========================== Página Home ========================== */
export default function Home() {
  const { user, loading } = useAuth();
  const saludo = saludoPorHora();

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse mb-3" />
        <div className="h-4 w-64 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  // ===== Usuario autenticado =====
  if (user) {
    const firstName = String(user.name || "").split(/\s+/)[0] || user.name || "";
    const isOrg = user.role === "organizer";
    const isVerified = Boolean(user.verifiedOrganizer);

    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* HERO */}
        <div className="rounded-3xl border bg-gradient-to-br from-indigo-50 to-white p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <Avatar name={user.name || "?"} />
            <div className="flex-1">
              <h1 className="text-3xl md:text-4xl font-extrabold">
                {saludo} {firstName} <span className="inline-block">👋</span>
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="inline-flex items-center px-2 py-0.5 rounded bg-black/5">
                  Rol: <strong className="ml-1">{roleLabel(user.role)}</strong>
                </span>
                {isOrg && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded ${
                      isVerified
                        ? "bg-green-100 text-green-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {isVerified ? "Organizador verificado" : "Organizador pendiente"}
                  </span>
                )}
              </div>
              <p className="text-gray-600 mt-1">
                Estás conectado con <span className="font-medium">{user.name}</span>. ¡Nos alegra verte por acá!
              </p>
            </div>
          </div>

          {/* Buscador */}
          <div className="mt-5">
            <SearchBox userId={user.id} />
          </div>

          {/* Accesos rápidos */}
          <div className="mt-4 flex flex-wrap gap-3">
            <Link to="/eventos" className="rounded-full px-4 py-2 bg-white border hover:bg-gray-50">
              Explorar
            </Link>
            <Link to="/mis-entradas" className="rounded-full px-4 py-2 bg-white border hover:bg-gray-50">
              Mis entradas
            </Link>
            <Link to="/cuenta/seguridad" className="rounded-full px-4 py-2 bg-white border hover:bg-gray-50">
              Seguridad
            </Link>
          </div>
        </div>

        {/* Fila de destacados */}
        <FeaturedRow title="Eventos destacados" />

        {/* Tarjetas de acciones */}
        <div className="mt-8 grid md:grid-cols-3 gap-4">
          <Link
            to="/eventos"
            className="rounded-xl border p-4 hover:bg-black/5 hover:shadow-sm transition"
          >
            <div className="font-medium">Explorar eventos</div>
            <div className="text-sm text-gray-600">Busca y compra tus entradas</div>
          </Link>

          <Link
            to="/cuenta/seguridad"
            className="rounded-xl border p-4 hover:bg-black/5 hover:shadow-sm transition"
          >
            <div className="font-medium">Seguridad de cuenta</div>
            <div className="text-sm text-gray-600">Cambiar contraseña o correo</div>
          </Link>

          {user.role === "buyer" && !user.applicationStatus && (
            <Link
              to="/solicitar-organizador"
              className="rounded-xl border p-4 hover:bg-black/5 hover:shadow-sm transition"
            >
              <div className="font-medium">Ser organizador</div>
              <div className="text-sm text-gray-600">Envía tu solicitud</div>
            </Link>
          )}

          {user.role === "buyer" && (user.applicationStatus === "PENDING" || user.applicationStatus === "REJECTED") && (
            <Link
              to="/solicitar-organizador"
              className="rounded-xl border p-4 hover:bg-black/5 hover:shadow-sm transition"
            >
              <div className="font-medium">Estado de Solicitud de Organizador</div>
              <div className="text-sm text-gray-600">
                {user.applicationStatus === "PENDING" ? "Solicitud pendiente de revisión" : "Solicitud rechazada - Reenviar"}
              </div>
            </Link>
          )}

          {user.role === "superadmin" && (
            <>
              <Link
                to="/admin/eventos"
                className="rounded-xl border p-4 hover:bg-black/5 hover:shadow-sm transition"
              >
                <div className="font-medium">Panel de eventos</div>
                <div className="text-sm text-gray-600">Aprobar y gestionar</div>
              </Link>
              <Link
                to="/admin/usuarios"
                className="rounded-xl border p-4 hover:bg-black/5 hover:shadow-sm transition"
              >
                <div className="font-medium">Usuarios</div>
                <div className="text-sm text-gray-600">Ver y administrar</div>
              </Link>
              <Link
                to="/admin/solicitudes-organizador"
                className="rounded-xl border p-4 hover:bg-black/5 hover:shadow-sm transition"
              >
                <div className="font-medium">Solicitudes de organizador</div>
                <div className="text-sm text-gray-600">Aprobar/rechazar</div>
              </Link>
            </>
          )}
        </div>

        {/* Consejo */}
        <div className="mt-8 rounded-xl border p-4 bg-black/5">
          <div className="font-medium mb-1">Consejo</div>
          <p className="text-sm text-gray-700">
            Mantén tu correo y contraseña actualizados desde{" "}
            <Link to="/cuenta/seguridad" className="underline text-indigo-600">
              Seguridad
            </Link>
            .
          </p>
        </div>
      </div>
    );
  }

  // ===== Visitante =====
  return (
    <div className="max-w-6xl mx-auto px-4 py-16 text-center">
      <h1 className="text-4xl font-extrabold mb-3">Bienvenido 👋</h1>
      <p className="text-gray-600">Compra entradas para tus eventos favoritos.</p>

      <div className="mt-8 max-w-2xl mx-auto">
        {/* visitante usa key "anon" */}
        <SearchBox userId={undefined} />
      </div>

      <div className="mt-8 flex items-center justify-center gap-3">
        <Link
          to="/eventos"
          className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Ver eventos
        </Link>
        <Link to="/login" className="px-4 py-2 rounded-md border hover:bg-black/5">
          Ingresar
        </Link>
      </div>

      <div className="mt-10 text-left">
        <FeaturedRow title="Destacados" />
      </div>
    </div>
  );
}


