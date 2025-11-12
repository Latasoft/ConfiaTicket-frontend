// src/pages/AdminEvents.tsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  adminListEvents,
  adminSetEventStatus,
  adminToggleEventActive,
  type AdminEvent,
} from "@/services/adminEventsService";

type Toast = { kind: "success" | "info" | "error"; text: string } | null;

export default function AdminEvents() {
  const [rows, setRows] = useState<AdminEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AdminEvent["status"] | "">("");
  const [organizerId, setOrganizerId] = useState<string>("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  async function load(p = page) {
    setLoading(true);
    try {
      const data = await adminListEvents({
        page: p,
        pageSize,
        q: q || undefined,
        status: (status || undefined) as AdminEvent["status"] | undefined,
        organizerId: organizerId ? Number(organizerId) : undefined,
      });
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status, organizerId]);

  function Badge({ s }: { s: AdminEvent["status"] }) {
    const cls =
      s === "approved"
        ? "bg-green-500/20 text-green-300 border-2 border-green-400/50"
        : "bg-amber-500/20 text-amber-300 border-2 border-amber-400/50";
    return <span className={`text-xs px-3 py-1 rounded-full font-bold ${cls}`}>{s}</span>;
  }

  async function changeStatus(id: number, s: AdminEvent["status"]) {
    try {
      const updated = await adminSetEventStatus(id, s);
      setToast({
        kind: s === "approved" ? "success" : "info",
        text:
          s === "approved"
            ? `“${updated.title}” fue aprobado.`
            : `“${updated.title}” fue marcado como pendiente.`,
      });
      load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo actualizar el estado";
      setToast({ kind: "error", text: msg });
    }
  }

  // Utilidades de fecha
  function formatDateTime(iso?: string | null) {
    if (!iso) return "—";
    try {
      return new Intl.DateTimeFormat("es-CL", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso));
    } catch {
      return new Date(iso).toLocaleString();
    }
  }

  // Miniatura con fallback y zoom (modal)
  function Thumb({ url }: { url?: string | null }) {
    if (!url) {
      return (
        <div className="w-20 h-14 flex items-center justify-center bg-dark-800 text-dark-400 rounded-lg border-2 border-dark-600">
          —
        </div>
      );
    }
    return (
      <img
        src={url}
        alt="Portada"
        className="w-20 h-14 object-cover rounded-lg border-2 border-dark-600 cursor-zoom-in hover:scale-110 transition-transform"
        onClick={() => setPreviewUrl(url)}
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          img.src =
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="112"><rect width="100%" height="100%" fill="%231f2937"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="14">sin imagen</text></svg>';
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-white">Eventos</h1>
        </div>

        {/* Atajos de navegación */}
        <div className="flex gap-4 text-sm mb-6">
          <NavLink to="/admin/eventos" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
            Eventos
          </NavLink>
          <NavLink to="/admin/usuarios" className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
            Usuarios
          </NavLink>
          <NavLink
            to="/admin/solicitudes-organizador"
            className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
          >
            Solicitudes de organizador
          </NavLink>
        </div>

        {/* Toast / Banner */}
        {toast && (
          <div
            className={
              "mb-6 rounded-2xl border-2 px-6 py-4 text-sm shadow-xl " +
              (toast.kind === "error"
                ? "border-red-400/50 bg-red-500/20 text-red-300"
                : toast.kind === "success"
                ? "border-green-400/50 bg-green-500/20 text-green-300"
                : "border-amber-400/50 bg-amber-500/20 text-amber-300")
            }
          >
            <div className="flex items-start justify-between gap-3">
              <span className="font-medium">{toast.text}</span>
              <button
                onClick={() => setToast(null)}
                className="text-xs px-3 py-1 border-2 border-dark-600 rounded-lg hover:bg-dark-700 transition-all font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="grid md:grid-cols-4 gap-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-dark-800 border-2 border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              placeholder="Buscar por título…"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="bg-dark-800 border-2 border-dark-600 rounded-xl px-4 py-3 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
            >
              <option value="">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="approved">Aprobado</option>
            </select>
            <input
              value={organizerId}
              onChange={(e) => setOrganizerId(e.target.value)}
              className="bg-dark-800 border-2 border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              placeholder="Organizer ID (opcional)"
            />
            <button
              onClick={() => {
                setQ("");
                setStatus("");
                setOrganizerId("");
              }}
              className="bg-purple-500 hover:bg-purple-600 text-white font-bold px-4 py-3 rounded-xl transition-all hover:scale-105 shadow-lg shadow-purple-500/30"
            >
              Limpiar
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl shadow-2xl overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-dark-800 border-b-2 border-dark-700">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Portada</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Título</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Inicio</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Creado</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Lugar</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Número de entradas</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Estado</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-dark-100 uppercase">Activo</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Organizador</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-dark-100 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-cyan-400">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-12 text-center text-dark-300">
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  rows.map((ev) => (
                    <tr key={ev.id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-6 py-4 align-middle">
                        <Thumb url={ev.coverImageUrl ?? null} />
                      </td>
                      <td className="px-6 py-4">
                        <Link 
                          to={`/admin/eventos/${ev.id}`}
                          className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                        >
                          {ev.title}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-white">{formatDateTime(ev.startAt)}</td>
                      <td className="px-6 py-4 text-dark-300">{formatDateTime(ev.createdAt)}</td>
                      <td className="px-6 py-4 text-white">{ev.venue}</td>
                      <td className="px-6 py-4 text-white font-bold">{ev.capacity}</td>
                      <td className="px-6 py-4">
                        <Badge s={ev.status} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={async () => {
                            const newState = !ev.isActive;
                            const confirmMsg = newState
                              ? `¿Activar el evento "${ev.title}"?`
                              : `¿Desactivar el evento "${ev.title}"? Los usuarios no podrán comprar entradas.`;
                            
                            if (!confirm(confirmMsg)) return;
                            
                            try {
                              const result = await adminToggleEventActive(ev.id, newState);
                              setToast({
                                kind: "success",
                                text: result.message + (result.paidReservations > 0 
                                  ? ` (${result.paidReservations} entradas vendidas)` 
                                  : ''),
                              });
                              load();
                            } catch (error: unknown) {
                              const err = error as { response?: { data?: { error?: string } } };
                              setToast({
                                kind: "error",
                                text: err.response?.data?.error || "Error al cambiar estado del evento",
                              });
                            }
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-all ${
                            ev.isActive !== false
                              ? 'bg-green-500/20 text-green-300 border-green-400/50 hover:bg-green-500/30'
                              : 'bg-red-500/20 text-red-300 border-red-400/50 hover:bg-red-500/30'
                          }`}
                          title={ev.isActive !== false ? 'Desactivar evento' : 'Activar evento'}
                        >
                          {ev.isActive !== false ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                      <td className="px-6 py-4 text-dark-300">
                        {ev.organizer
                          ? `${ev.organizer.name} (${ev.organizer.email})`
                          : `ID ${ev.organizerId ?? "-"}`}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            ev.coverImageUrl && setPreviewUrl(ev.coverImageUrl)
                          }
                          className="px-3 py-2 mr-2 rounded-lg border-2 border-cyan-400/50 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 disabled:opacity-30 transition-all font-bold"
                          disabled={!ev.coverImageUrl}
                          title={ev.coverImageUrl ? "Ver portada" : "Sin portada"}
                        >
                          Ver Imagen
                        </button>

                        {ev.status !== "approved" ? (
                          <button
                            onClick={() => changeStatus(ev.id, "approved")}
                            className="px-3 py-2 mr-2 rounded-lg border-2 border-green-400/50 bg-green-500/20 text-green-300 hover:bg-green-500/30 disabled:opacity-30 transition-all font-bold"
                            disabled={Boolean(ev.organizerDeletedOrInactive)}
                            title={
                              ev.organizerDeletedOrInactive
                                ? "Organizador eliminado o inactivo"
                                : ""
                            }
                          >
                            Aprobar
                          </button>
                        ) : null}
                        {ev.status !== "pending" ? (
                          <button
                            onClick={() => changeStatus(ev.id, "pending")}
                            className="px-3 py-2 rounded-lg border-2 border-amber-400/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all font-bold"
                          >
                            Marcar pendiente
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between bg-dark-850 border-2 border-dark-700 rounded-2xl p-6 shadow-xl mb-8">
          <p className="text-sm text-dark-200">
            Página <span className="font-bold text-white">{page}</span> de <span className="font-bold text-white">{totalPages}</span> — <span className="font-bold text-white">{total}</span> evento(s)
          </p>
          <div className="flex gap-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
              className="px-4 py-2 border-2 border-dark-600 rounded-lg disabled:opacity-30 hover:bg-dark-700 text-white font-medium transition-all"
            >
              ← Anterior
            </button>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => load(page + 1)}
              className="px-4 py-2 border-2 border-dark-600 rounded-lg disabled:opacity-30 hover:bg-dark-700 text-white font-medium transition-all"
            >
              Siguiente →
            </button>
          </div>
        </div>

        {/* Modal de previsualización */}
        {previewUrl && (
          <div
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
            onClick={() => setPreviewUrl(null)}
          >
            <div
              className="bg-dark-850 border-2 border-dark-700 p-6 rounded-2xl shadow-2xl max-w-5xl max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={previewUrl}
                alt="Vista previa"
                className="max-w-[80vw] max-h-[75vh] object-contain rounded-xl border-2 border-dark-600"
              />
              <div className="text-right mt-4">
                <button
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-cyan-500/30"
                  onClick={() => setPreviewUrl(null)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}




