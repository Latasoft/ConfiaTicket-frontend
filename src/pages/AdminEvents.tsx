// src/pages/AdminEvents.tsx
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  adminListEvents,
  adminSetEventStatus,
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
        ? "bg-green-100 text-green-800"
        : "bg-yellow-100 text-yellow-900";
    return <span className={`text-xs px-2 py-1 rounded ${cls}`}>{s}</span>;
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
        <div className="w-20 h-14 flex items-center justify-center bg-gray-100 text-gray-400 rounded border">
          —
        </div>
      );
    }
    return (
      <img
        src={url}
        alt="Portada"
        className="w-20 h-14 object-cover rounded border cursor-zoom-in"
        onClick={() => setPreviewUrl(url)}
        onError={(e) => {
          const img = e.currentTarget as HTMLImageElement;
          img.src =
            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="160" height="112"><rect width="100%" height="100%" fill="%23f3f4f6"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%239ca3af" font-family="sans-serif" font-size="14">sin imagen</text></svg>';
        }}
      />
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Eventos — Superadmin</h1>
      </div>

      {/* Atajos de navegación */}
      <div className="flex gap-4 text-sm mb-4">
        <NavLink to="/admin/eventos" className="underline hover:text-blue-600">
          Eventos
        </NavLink>
        <NavLink to="/admin/usuarios" className="underline hover:text-blue-600">
          Usuarios
        </NavLink>
        <NavLink
          to="/admin/solicitudes-organizador"
          className="underline hover:text-blue-600"
        >
          Solicitudes de organizador
        </NavLink>
      </div>

      {/* Toast / Banner */}
      {toast && (
        <div
          className={
            "mb-4 rounded border px-3 py-2 text-sm " +
            (toast.kind === "error"
              ? "border-red-300 bg-red-50 text-red-800"
              : toast.kind === "success"
              ? "border-green-300 bg-green-50 text-green-800"
              : "border-amber-300 bg-amber-50 text-amber-800")
          }
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              className="text-xs px-2 py-1 border rounded hover:bg-black/5"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="grid md:grid-cols-4 gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border rounded px-3 py-2"
          placeholder="Buscar por título…"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="">Todos</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
        </select>
        <input
          value={organizerId}
          onChange={(e) => setOrganizerId(e.target.value)}
          className="border rounded px-3 py-2"
          placeholder="Organizer ID (opcional)"
        />
        <button
          onClick={() => {
            setQ("");
            setStatus("");
            setOrganizerId("");
          }}
          className="border rounded px-3 py-2 hover:bg-black/5"
        >
          Limpiar
        </button>
      </div>

      {/* Tabla */}
      <div className="border rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Portada</th>
              <th className="text-left p-3">Título</th>
              <th className="text-left p-3">Inicio</th>
              <th className="text-left p-3">Creado</th>{/* 👈 NUEVA COLUMNA */}
              <th className="text-left p-3">Lugar</th>
              <th className="text-left p-3">Número de entradas</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Organizador</th>
              <th className="text-right p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="p-6 text-center">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-6 text-center">
                  Sin resultados.
                </td>
              </tr>
            ) : (
              rows.map((ev) => (
                <tr key={ev.id} className="border-t">
                  <td className="p-3 align-middle">
                    <Thumb url={ev.coverImageUrl ?? null} />
                  </td>
                  <td className="p-3">{ev.title}</td>
                  <td className="p-3">{formatDateTime(ev.startAt)}</td>
                  <td className="p-3">{formatDateTime(ev.createdAt)}</td>{/* 👈 NUEVO DATO */}
                  <td className="p-3">{ev.venue}</td>
                  <td className="p-3">{ev.capacity}</td>
                  <td className="p-3">
                    <Badge s={ev.status} />
                  </td>
                  <td className="p-3">
                    {ev.organizer
                      ? `${ev.organizer.name} (${ev.organizer.email})`
                      : `ID ${ev.organizerId ?? "-"}`}
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() =>
                        ev.coverImageUrl && setPreviewUrl(ev.coverImageUrl)
                      }
                      className="px-2 py-1 mr-2 rounded border hover:bg-black/5 disabled:opacity-50"
                      disabled={!ev.coverImageUrl}
                      title={ev.coverImageUrl ? "Ver portada" : "Sin portada"}
                    >
                      Ver Imagen
                    </button>

                    {ev.status !== "approved" ? (
                      <button
                        onClick={() => changeStatus(ev.id, "approved")}
                        className="px-2 py-1 mr-2 rounded border hover:bg-green-50 disabled:opacity-50"
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
                        className="px-2 py-1 rounded border hover:bg-yellow-50"
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

      {/* Paginación */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-600">
          Página {page} de {totalPages} — {total} evento(s)
        </p>
        <div className="flex gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => load(page - 1)}
            className="px-3 py-2 border rounded disabled:opacity-50 hover:bg-black/5"
          >
            Anterior
          </button>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => load(page + 1)}
            className="px-3 py-2 border rounded disabled:opacity-50 hover:bg-black/5"
          >
            Siguiente
          </button>
        </div>
      </div>

      {/* Modal de previsualización */}
      {previewUrl && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => setPreviewUrl(null)}
        >
          <div
            className="bg-white p-3 rounded-lg shadow max-w-5xl max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={previewUrl}
              alt="Vista previa"
              className="max-w-[80vw] max-h-[75vh] object-contain rounded"
            />
            <div className="text-right mt-3">
              <button
                className="px-3 py-2 border rounded hover:bg-black/5"
                onClick={() => setPreviewUrl(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}




