// src/pages/AdminOrganizerApps.tsx
import { useEffect, useMemo, useState } from "react";
import { NavLink, Link } from "react-router-dom";
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

  // Helper function to convert upload paths to URLs (currently unused)
  // function linkToUpload(raw: string) {
  //   if (!raw) return "#";
  //   if (/^https?:\/\//i.test(raw)) return raw;
  //   let p = raw.replace(/\\/g, "/");
  //   const lower = p.toLowerCase();
  //   const idx = lower.indexOf("/uploads");
  //   const idx2 = idx === -1 ? lower.indexOf("uploads") : idx;
  //   if (idx2 > -1) p = p.slice(idx2);
  //   if (!p.startsWith("/")) p = "/" + p;
  //   const apiBase = (import.meta.env.VITE_API_URL || "")
  //     .replace(/\/api$/, "")
  //     .replace(/\/$/, "");
  //   return `${apiBase}${p}`;
  // }

  function StatusBadge({ s }: { s: AppStatus }) {
    const base = "text-xs px-3 py-1 rounded-full font-bold border-2";
    const map: Record<AppStatus, string> = {
      PENDING: "bg-amber-500/20 text-amber-300 border-amber-400/50",
      APPROVED: "bg-green-500/20 text-green-300 border-green-400/50",
      REJECTED: "bg-red-500/20 text-red-300 border-red-400/50",
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
    <div className="min-h-screen bg-dark-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-white">
            Solicitudes de Organizador
          </h1>
        </div>

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
              placeholder="Buscar por nombre/email/RUT…"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="bg-dark-800 border-2 border-dark-600 rounded-xl px-4 py-3 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
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
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Solicitante</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Fecha de petición</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Nombre</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">RUT</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Estado</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Documento</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-dark-100 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {loading ? (
                  <tr>
                    <td className="p-12 text-center text-cyan-400" colSpan={7}>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="p-12 text-center text-dark-300" colSpan={7}>
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  rows.map((app) => (
                    <tr key={app.id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-6 py-4">
                        {app.user?.id ? (
                          <Link 
                            to={`/admin/usuarios/${app.user.id}`}
                            className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                          >
                            {app.user.name}
                          </Link>
                        ) : (
                          <span className="text-white font-medium">{app.user?.name}</span>
                        )}{" "}
                        <span className="text-dark-400">({app.user?.email})</span>
                      </td>
                      <td className="px-6 py-4 text-dark-300">{fmt(app.createdAt)}</td>
                      <td className="px-6 py-4 text-white font-medium">{app.legalName}</td>
                      <td className="px-6 py-4 text-white font-mono">{app.taxId}</td>
                      <td className="px-6 py-4">
                        <StatusBadge s={app.status} />
                      </td>
                      <td className="px-6 py-4">
                        {app.idCardImageUrl ? (
                          <ProtectedImageModal
                            imageUrl={app.idCardImageUrl}
                            imageUrl2={app.idCardImageBackUrl || undefined}
                            buttonText="Ver cédula"
                            buttonClassName="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 text-xs font-bold shadow-lg shadow-blue-500/30"
                            title={`Cédula de Identidad - ${app.legalName}`}
                            label1="Cara Frontal"
                            label2="Cara Trasera"
                          />
                        ) : (
                          <span className="inline-flex items-center gap-1 text-dark-400 text-xs">
                            <span className="w-1.5 h-1.5 bg-dark-600 rounded-full"></span>
                            Sin archivo
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {app.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => approve(app.id)}
                              disabled={busyId === app.id}
                              className="px-3 py-2 mr-2 rounded-lg border-2 border-green-400/50 bg-green-500/20 text-green-300 hover:bg-green-500/30 disabled:opacity-30 transition-all font-bold"
                            >
                              Aprobar
                            </button>
                            <button
                              onClick={() => reject(app.id)}
                              disabled={busyId === app.id}
                              className="px-3 py-2 rounded-lg border-2 border-red-400/50 bg-red-500/20 text-red-300 hover:bg-red-500/30 disabled:opacity-30 transition-all font-bold"
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
                            className="px-3 py-2 rounded-lg border-2 border-amber-400/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 disabled:opacity-30 transition-all font-bold"
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
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between bg-dark-850 border-2 border-dark-700 rounded-2xl p-6 shadow-xl">
          <p className="text-sm text-dark-200">
            Página <span className="font-bold text-white">{page}</span> de <span className="font-bold text-white">{totalPages}</span> — <span className="font-bold text-white">{total}</span> solicitud(es)
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
      </div>
    </div>
  );
}






