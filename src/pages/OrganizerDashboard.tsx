// src/pages/OrganizerDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  listMyEvents,
  deleteMyEvent,
  type OrganizerEvent,
} from "@/services/organizerEventsService";

type PageToast = { kind: "info" | "success" | "error"; text: string } | null;

export default function OrganizerDashboard() {
  const [rows, setRows] = useState<OrganizerEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrganizerEvent["status"] | "">("");
  const pageSize = 10;

  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState<PageToast>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  async function fetchData(p = page) {
    setLoading(true);
    try {
      const data = await listMyEvents({
        page: p,
        pageSize,
        q: q || undefined,
        status: (status as OrganizerEvent["status"]) || undefined,
      });
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
    } finally {
      setLoading(false);
    }
  }

  // Carga inicial y cuando cambie búsqueda/filtro
  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  // 🛎️ Mostrar toast que venga por navigation state y limpiarlo
  useEffect(() => {
    const st = (location.state as any)?.toast as PageToast | undefined;
    if (st) {
      setToast(st);
      // limpiar el state para que no se repita al refrescar / navegar
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  function formatDate(value?: string | null) {
    if (!value) return "—";
    try {
      const d = new Date(value);
      return d.toLocaleString();
    } catch {
      return value ?? "—";
    }
  }

  function Badge({ s }: { s: OrganizerEvent["status"] }) {
    const base = "text-xs px-2 py-1 rounded";
    const map: Record<OrganizerEvent["status"], string> = {
      draft: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-900",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return <span className={`${base} ${map[s]}`}>{s}</span>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Panel de Organizador</h1>
        <Link
          to="/organizador/eventos/nuevo"
          className="px-3 py-2 rounded bg-black text-white hover:opacity-90"
        >
          Crear evento
        </Link>
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
      <div className="flex flex-col md:flex-row gap-2 md:items-center mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border rounded px-3 py-2 w-full md:w-1/2"
          placeholder="Buscar por título…"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="border rounded px-3 py-2 w-full md:w-48"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
        <button
          onClick={() => {
            setQ("");
            setStatus("");
          }}
          className="border rounded px-3 py-2 w-full md:w-auto hover:bg-black/5"
        >
          Limpiar
        </button>
      </div>

      {/* Tabla */}
      <div className="border rounded overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3">Título</th>
              <th className="text-left p-3">Inicio</th>
              <th className="text-left p-3">Lugar</th>
              <th className="text-left p-3">Entradas</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-right p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-6 text-center">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center">
                  No hay eventos.
                </td>
              </tr>
            ) : (
              rows.map((ev) => (
                <tr key={ev.id} className="border-t">
                  <td className="p-3">{ev.title}</td>
                  <td className="p-3">{formatDate(ev.startAt)}</td>
                  <td className="p-3">{ev.venue}</td>
                  <td className="p-3">{ev.capacity ?? "—"}</td>
                  <td className="p-3">
                    <Badge s={ev.status} />
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() =>
                        navigate(`/organizador/eventos/${ev.id}/editar`)
                      }
                      className="px-2 py-1 mr-2 rounded border hover:bg-black/5"
                    >
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("¿Eliminar este evento?")) return;
                        await deleteMyEvent(ev.id);
                        fetchData();
                      }}
                      className="px-2 py-1 rounded border hover:bg-red-50"
                    >
                      Eliminar
                    </button>
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
            onClick={() => fetchData(page - 1)}
            className="px-3 py-2 border rounded disabled:opacity-50 hover:bg-black/5"
          >
            Anterior
          </button>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => fetchData(page + 1)}
            className="px-3 py-2 border rounded disabled:opacity-50 hover:bg-black/5"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}



