import { useEffect, useMemo, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
  adminListUsers,
  adminSetUserCanSell,
  adminActivateUser,
  adminDeactivateUser,
  adminDeleteUserPreview,
  adminSoftDeleteUser,
  type AdminUser,
} from "@/services/adminUsersService";
import {
  adminApproveOrganizerApplication,
  adminRejectOrganizerApplication,
} from "@/services/adminOrganizerAppsService";

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const s = new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
    return s;
  } catch {
    return new Date(iso!).toLocaleString();
  }
}

function SolicitudBadge({ s }: { s: AdminUser["latestOrganizerAppStatus"] }) {
  const map = {
    APPROVED: { label: "ACEPTADO", cls: "bg-green-500/20 text-green-300 border-2 border-green-400/50" },
    PENDING:  { label: "PENDIENTE", cls: "bg-amber-500/20 text-amber-300 border-2 border-amber-400/50" },
    REJECTED: { label: "RECHAZADO", cls: "bg-red-500/20 text-red-300 border-2 border-red-400/50" },
    NULL:     { label: "—",        cls: "bg-gray-500/20 text-gray-400 border-2 border-gray-400/50" },
  } as const;
  const key = (s ?? "NULL") as keyof typeof map;
  const { label, cls } = map[key];
  return <span className={`text-xs px-3 py-1 rounded-full font-bold ${cls}`}>{label}</span>;
}

function ActiveBadge({ u }: { u: AdminUser }) {
  if (u.deletedAt) {
    return (
      <span
        className="text-xs px-3 py-1 rounded-full font-bold bg-red-500/20 text-red-300 border-2 border-red-400/50"
        title={`Eliminado el ${formatDateTime(u.deletedAt)}`}
      >
        Eliminado
      </span>
    );
  }
  return u.isActive ? (
    <span className="text-xs px-3 py-1 rounded-full font-bold bg-green-500/20 text-green-300 border-2 border-green-400/50">Activo</span>
  ) : (
    <span className="text-xs px-3 py-1 rounded-full font-bold bg-gray-500/20 text-gray-400 border-2 border-gray-400/50">Inactivo</span>
  );
}

/** Puede vender efectivo: organizer + canSell + activo + no eliminado */
function computeCanSell(u: AdminUser) {
  return u.role === "organizer" && !!u.canSell && !!u.isActive && !u.deletedAt;
}

export default function AdminUsers() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [role, setRole] = useState<AdminUser["role"] | "">("");
  const [canSell, setCanSell] = useState<"" | "true" | "false">("");

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  async function load(p = page) {
    setLoading(true);
    try {
      const data = await adminListUsers({
        page: p,
        pageSize,
        q: q || undefined,
        role: role || undefined,
        // ya NO enviamos verified
        canSell: (canSell || undefined) as "true" | "false" | undefined,
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
  }, [q, role, canSell]);

  const toggleCanSell = async (u: AdminUser) => {
    try {
      await adminSetUserCanSell(u.id, !u.canSell);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "No se pudo actualizar permiso de venta");
    }
  };

  const activate = async (u: AdminUser) => {
    try {
      await adminActivateUser(u.id);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "No se pudo activar la cuenta");
    }
  };

  const deactivate = async (u: AdminUser) => {
    if (!confirm(`Desactivar la cuenta de ${u.name}?`)) return;
    try {
      await adminDeactivateUser(u.id);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "No se pudo desactivar la cuenta");
    }
  };

  const softDelete = async (u: AdminUser) => {
    try {
      const prev = await adminDeleteUserPreview(u.id);
      const ok = confirm(
        `¿Eliminar (soft-delete) a "${u.name}"?\n\nImpacto:\n` +
          `- Reservas: ${prev.reservationsCount}\n` +
          `- Eventos como organizer: ${prev.organizerEventsCount}\n\n` +
          `Esto anonimiza sus datos y desactiva permanentemente la cuenta.`
      );
      if (!ok) return;
      await adminSoftDeleteUser(u.id);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "No se pudo eliminar la cuenta");
    }
  };

  const approveApplication = async (applicationId: number, userName: string) => {
    if (!confirm(`¿Aprobar solicitud de organizador de ${userName}?`)) return;
    try {
      await adminApproveOrganizerApplication(applicationId);
      alert("Solicitud aprobada exitosamente");
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "No se pudo aprobar la solicitud");
    }
  };

  const rejectApplication = async (applicationId: number, userName: string) => {
    const notes = prompt(`¿Motivo del rechazo para ${userName}? (opcional)`);
    if (notes === null) return; // Usuario canceló
    
    if (!confirm(`¿Rechazar solicitud de organizador de ${userName}?`)) return;
    
    try {
      await adminRejectOrganizerApplication(applicationId, notes || undefined);
      alert("Solicitud rechazada");
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "No se pudo rechazar la solicitud");
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-white">Usuarios</h1>
        </div>

        {/* Atajos */}
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

        {/* Filtros */}
        <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="grid md:grid-cols-4 gap-4">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="bg-dark-800 border-2 border-dark-600 rounded-xl px-4 py-3 text-white placeholder-dark-400 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              placeholder="Buscar por nombre/email…"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="bg-dark-800 border-2 border-dark-600 rounded-xl px-4 py-3 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
            >
              <option value="">Todos los roles</option>
              <option value="superadmin">Superadmin</option>
              <option value="organizer">Organizer</option>
              <option value="buyer">Buyer</option>
            </select>
            <select
              value={canSell}
              onChange={(e) => setCanSell(e.target.value as any)}
              className="bg-dark-800 border-2 border-dark-600 rounded-xl px-4 py-3 text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
            >
              <option value="">Puede vender?</option>
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
            <button
              onClick={() => {
                setQ("");
                setRole("");
                setCanSell("");
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
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Nombre</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Email</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Creado</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Rol</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Solicitud</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Acción Solicitud</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Estado</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-dark-100 uppercase">Puede vender</th>
                  <th className="text-right px-6 py-4 text-xs font-bold text-dark-100 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {loading ? (
                  <tr>
                    <td className="p-12 text-center text-cyan-400" colSpan={9}>
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                      Cargando…
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td className="p-12 text-center text-dark-300" colSpan={9}>
                      Sin resultados.
                    </td>
                  </tr>
                ) : (
                  rows.map((u) => {
                    const isOrganizer = u.role === "organizer";
                    const deleted = Boolean(u.deletedAt);

                    return (
                      <tr key={u.id} className={`hover:bg-dark-800/50 transition-colors ${deleted ? "opacity-60" : ""}`}>
                        <td className="px-6 py-4">
                          <Link 
                            to={`/admin/usuarios/${u.id}`}
                            className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                          >
                            {u.name}
                          </Link>
                        </td>
                        <td className="px-6 py-4 text-dark-300">{u.email}</td>
                        <td className="px-6 py-4 text-dark-300">{formatDateTime(u.createdAt)}</td>
                        <td className="px-6 py-4 text-white font-medium">{u.role}</td>

                        <td className="px-6 py-4">
                          <SolicitudBadge s={u.latestOrganizerAppStatus} />
                        </td>

                        {/* Nueva columna: Acción Solicitud */}
                        <td className="px-6 py-4">
                          {u.latestOrganizerAppStatus === "PENDING" && u.applicationId ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => approveApplication(u.applicationId!, u.name)}
                                className="px-3 py-1.5 rounded-lg text-xs bg-green-500/20 text-green-300 border-2 border-green-400/50 hover:bg-green-500/30 font-bold transition-all"
                                title="Aprobar solicitud"
                              >
                                Aprobar
                              </button>
                              <button
                                onClick={() => rejectApplication(u.applicationId!, u.name)}
                                className="px-3 py-1.5 rounded-lg text-xs bg-red-500/20 text-red-300 border-2 border-red-400/50 hover:bg-red-500/30 font-bold transition-all"
                                title="Rechazar solicitud"
                              >
                                Rechazar
                              </button>
                            </div>
                          ) : (
                            <span className="text-dark-400 text-xs">—</span>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <ActiveBadge u={u} />
                        </td>

                        <td className="px-6 py-4 text-white font-bold">{computeCanSell(u) ? "Sí" : "No"}</td>

                        <td className="px-6 py-4 text-right">
                          {/* Venta */}
                          <button
                            onClick={() => isOrganizer && !deleted && toggleCanSell(u)}
                            disabled={!isOrganizer || deleted}
                            className="px-3 py-2 mr-2 rounded-lg border-2 border-cyan-400/50 bg-cyan-500/20 text-cyan-300 disabled:opacity-30 hover:bg-cyan-500/30 transition-all font-bold"
                            title={
                              isOrganizer
                                ? deleted
                                  ? "Cuenta eliminada"
                                  : ""
                                : "Requiere rol organizer"
                            }
                          >
                            {u.canSell ? "Deshabilitar venta" : "Habilitar venta"}
                          </button>

                          {/* Activar / Desactivar */}
                          {!deleted && u.isActive ? (
                            <button
                              onClick={() => deactivate(u)}
                              className="px-3 py-2 mr-2 rounded-lg border-2 border-amber-400/50 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition-all font-bold"
                            >
                              Desactivar
                            </button>
                          ) : !deleted ? (
                            <button
                              onClick={() => activate(u)}
                              className="px-3 py-2 mr-2 rounded-lg border-2 border-green-400/50 bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-all font-bold"
                            >
                              Activar
                            </button>
                          ) : null}

                          {/* Soft-delete */}
                          {!deleted && (
                            <button
                              onClick={() => softDelete(u)}
                              className="px-3 py-2 rounded-lg border-2 border-red-400/50 bg-red-500/20 text-red-300 hover:bg-red-500/30 transition-all font-bold"
                            >
                              Eliminar
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Paginación */}
        <div className="flex items-center justify-between bg-dark-850 border-2 border-dark-700 rounded-2xl p-6 shadow-xl">
          <p className="text-sm text-dark-200">
            Página <span className="font-bold text-white">{page}</span> de <span className="font-bold text-white">{totalPages}</span> — <span className="font-bold text-white">{total}</span> usuario(s)
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







