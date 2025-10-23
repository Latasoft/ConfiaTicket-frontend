// src/pages/AdminOrganizerApps.tsx
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  adminListOrganizerApplications,
  adminApproveOrganizerApplication,
  adminRejectOrganizerApplication,
  adminReopenOrganizerApplication,
  type AdminOrganizerApplication,
  type AppStatus,
} from "@/services/adminOrganizerAppsService";
import ProtectedImageModal from "@/components/ProtectedImageModal";

type Toast = { kind: "success" | "info" | "error"; text: string } | null;

export default function AdminOrganizerApps() {
  const [rows, setRows] = useState<AdminOrganizerApplication[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState<AppStatus | "">("PENDING");

  const [toast, setToast] = useState<Toast>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  async function load(p = page) {
    setLoading(true);
    try {
      const data = await adminListOrganizerApplications({
        page: p,
        pageSize,
        q: q || undefined,
        status: (status || undefined) as any,
      });
      
      // 🔍 DEBUG: Ver qué devuelve el backend
      console.log("📋 Solicitudes de organizadores:", data.items);
      if (data.items.length > 0) {
        console.log("🔍 Primera solicitud:", data.items[0]);
        console.log("📄 idCardImage:", data.items[0].idCardImage);
        console.log("🔗 idCardImageUrl:", data.items[0].idCardImageUrl);
      }
      
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
  }, [q, status]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function who(id: number) {
    const r = rows.find((x) => x.id === id);
    return r?.user?.name || r?.user?.email || `ID ${id}`;
  }

  async function approve(id: number) {
    try {
      setBusyId(id);
      await adminApproveOrganizerApplication(id);
      setToast({ kind: "success", text: `Solicitud de ${who(id)} aprobada.` });
      load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo aprobar la solicitud";
      setToast({ kind: "error", text: msg });
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: number) {
    try {
      const notes = window.prompt("Motivo del rechazo (opcional):") ?? undefined;
      setBusyId(id);
      await adminRejectOrganizerApplication(id, notes || undefined);
      setToast({
        kind: "info",
        text: `Solicitud de ${who(id)} rechazada${notes ? `: ${notes}` : "."}`,
      });
      load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo rechazar la solicitud";
      setToast({ kind: "error", text: msg });
    } finally {
      setBusyId(null);
    }
  }

  async function reopen(id: number) {
    try {
      setBusyId(id);
      await adminReopenOrganizerApplication(id);
      setToast({ kind: "info", text: `Solicitud de ${who(id)} reabierta.` });
      load();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo reabrir la solicitud";
      setToast({ kind: "error", text: msg });
    } finally {
      setBusyId(null);
    }
  }

  function linkToUpload(raw: string) {
    if (!raw) return "#";
    if (/^https?:\/\//i.test(raw)) return raw;
    let p = raw.replace(/\\/g, "/");
    const lower = p.toLowerCase();
    const idx = lower.indexOf("/uploads");
    const idx2 = idx === -1 ? lower.indexOf("uploads") : idx;
    if (idx2 > -1) p = p.slice(idx2);
    if (!p.startsWith("/")) p = "/" + p;
    const apiBase = (import.meta.env.VITE_API_URL || "")
      .replace(/\/api$/, "")
      .replace(/\/$/, "");
    return `${apiBase}${p}`;
  }

  function StatusBadge({ s }: { s: AppStatus }) {
    const base = "text-xs px-2 py-1 rounded";
    const map: Record<AppStatus, string> = {
      PENDING: "bg-yellow-100 text-yellow-900",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    };
    return <span className={`${base} ${map[s]}`}>{s}</span>;
  }

  const fmt = (iso: string) => {
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
  };

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">
          Solicitudes de Organizador — Superadmin
        </h1>
      </div>

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
          placeholder="Buscar por nombre/email/RUT…"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="">Todas</option>
          <option value="PENDING">Pendientes</option>
          <option value="APPROVED">Aprobadas</option>
          <option value="REJECTED">Rechazadas</option>
        </select>
        <button
          onClick={() => {
            setQ("");
            setStatus("PENDING");
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
              <th className="text-left p-3">Solicitante</th>
              <th className="text-left p-3">Fecha de petición</th>
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">RUT</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Documento</th>
              <th className="text-right p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-6 text-center" colSpan={7}>
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-6 text-center" colSpan={7}>
                  Sin resultados.
                </td>
              </tr>
            ) : (
              rows.map((app) => (
                <tr key={app.id} className="border-t">
                  <td className="p-3">
                    {app.user?.name}{" "}
                    <span className="text-gray-500">({app.user?.email})</span>
                  </td>
                  <td className="p-3">{fmt(app.createdAt)}</td>
                  <td className="p-3">{app.legalName}</td>
                  <td className="p-3">{app.taxId}</td>
                  <td className="p-3">
                    <StatusBadge s={app.status} />
                  </td>
                  <td className="p-3">
                    {app.idCardImageUrl ? (
                      <ProtectedImageModal
                        imageUrl={app.idCardImageUrl}
                        buttonText="Ver documento"
                        buttonClassName="inline-block px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                        title={`Documento de ${app.legalName}`}
                      />
                    ) : (
                      <span className="text-gray-400 text-xs">Sin archivo</span>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    {app.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => approve(app.id)}
                          disabled={busyId === app.id}
                          className="px-2 py-1 mr-2 rounded border hover:bg-green-50 disabled:opacity-50"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => reject(app.id)}
                          disabled={busyId === app.id}
                          className="px-2 py-1 rounded border hover:bg-red-50 disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </>
                    )}

                    {(app.status === "APPROVED" ||
                      app.status === "REJECTED") && (
                      <button
                        onClick={() => reopen(app.id)}
                        disabled={busyId === app.id}
                        className="px-2 py-1 rounded border hover:bg-yellow-50 disabled:opacity-50"
                        title="Volver a estado pendiente"
                      >
                        Reabrir
                      </button>
                    )}
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
          Página {page} de {totalPages} — {total} solicitud(es)
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
    </div>
  );
}






