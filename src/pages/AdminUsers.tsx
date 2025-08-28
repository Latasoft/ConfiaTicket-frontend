// src/pages/AdminUsers.tsx
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  adminListUsers,
  adminSetUserCanSell,
  adminSetUserVerified,
  adminActivateUser,
  adminDeactivateUser,
  adminDeleteUserPreview,
  adminSoftDeleteUser,
  type AdminUser,
} from "@/services/adminUsersService";

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    // fecha corta + hora corta en es-CL
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

function StatusPill({ s }: { s: AdminUser["latestOrganizerAppStatus"] }) {
  if (!s) return <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">—</span>;
  const cls =
    s === "APPROVED"
      ? "bg-green-100 text-green-800"
      : s === "PENDING"
      ? "bg-yellow-100 text-yellow-900"
      : "bg-red-100 text-red-800";
  return <span className={`text-xs px-2 py-1 rounded ${cls}`}>{s}</span>;
}

function ActiveBadge({ u }: { u: AdminUser }) {
  if (u.deletedAt) {
    return (
      <span
        className="text-xs px-2 py-1 rounded bg-red-100 text-red-800"
        title={`Eliminado el ${formatDateTime(u.deletedAt)}`}
      >
        Eliminado
      </span>
    );
  }
  return u.isActive ? (
    <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Activo</span>
  ) : (
    <span className="text-xs px-2 py-1 rounded bg-gray-200 text-gray-700">Inactivo</span>
  );
}

export default function AdminUsers() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [role, setRole] = useState<AdminUser["role"] | "">("");
  const [verified, setVerified] = useState<"" | "true" | "false">("");
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
        verified: (verified || undefined) as "true" | "false" | undefined,
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
  }, [q, role, verified, canSell]);

  const toggleVerified = async (u: AdminUser) => {
    try {
      await adminSetUserVerified(u.id, !u.isVerified);
      load();
    } catch (e: any) {
      alert(e?.response?.data?.error || "No se pudo actualizar verificación");
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto p-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Usuarios — Superadmin</h1>
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

      {/* Filtros */}
      <div className="grid md:grid-cols-5 gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="border rounded px-3 py-2"
          placeholder="Buscar por nombre/email…"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="">Todos los roles</option>
          <option value="superadmin">Superadmin</option>
          <option value="organizer">Organizer</option>
          <option value="buyer">Buyer</option>
        </select>
        <select
          value={verified}
          onChange={(e) => setVerified(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="">Verificado?</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
        <select
          value={canSell}
          onChange={(e) => setCanSell(e.target.value as any)}
          className="border rounded px-3 py-2"
        >
          <option value="">Puede vender?</option>
          <option value="true">Sí</option>
          <option value="false">No</option>
        </select>
        <button
          onClick={() => {
            setQ("");
            setRole("");
            setVerified("");
            setCanSell("");
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
              <th className="text-left p-3">Nombre</th>
              <th className="text-left p-3">Email</th>
              <th className="text-left p-3">Creado</th>{/* 👈 NUEVO */}
              <th className="text-left p-3">Rol</th>
              <th className="text-left p-3">Solicitud</th>
              <th className="text-left p-3">Estado</th>
              <th className="text-left p-3">Verificado</th>
              <th className="text-left p-3">Puede vender</th>
              <th className="text-right p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="p-6 text-center" colSpan={9}>
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="p-6 text-center" colSpan={9}>
                  Sin resultados.
                </td>
              </tr>
            ) : (
              rows.map((u) => {
                const orgApproved =
                  u.role === "organizer" && u.latestOrganizerAppStatus === "APPROVED";
                const deleted = Boolean(u.deletedAt);

                return (
                  <tr key={u.id} className={`border-t ${deleted ? "opacity-60" : ""}`}>
                    <td className="p-3">{u.name}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{formatDateTime(u.createdAt)}</td>{/* 👈 NUEVO */}
                    <td className="p-3">{u.role}</td>
                    <td className="p-3">
                      <StatusPill s={u.latestOrganizerAppStatus} />
                    </td>
                    <td className="p-3">
                      <ActiveBadge u={u} />
                    </td>
                    <td className="p-3">{u.isVerified ? "Sí" : "No"}</td>
                    <td className="p-3">{u.canSell ? "Sí" : "No"}</td>
                    <td className="p-3 text-right">
                      {/* Verificación / Venta */}
                      <button
                        onClick={() => orgApproved && !deleted && toggleVerified(u)}
                        disabled={!orgApproved || deleted}
                        className="px-2 py-1 mr-2 rounded border disabled:opacity-40 hover:bg-black/5"
                        title={
                          orgApproved
                            ? deleted
                              ? "Cuenta eliminada"
                              : ""
                            : "Requiere solicitud de organizador APROBADA"
                        }
                      >
                        {u.isVerified ? "Quitar verificado" : "Verificar"}
                      </button>
                      <button
                        onClick={() => orgApproved && !deleted && toggleCanSell(u)}
                        disabled={!orgApproved || deleted}
                        className="px-2 py-1 mr-4 rounded border disabled:opacity-40 hover:bg-black/5"
                        title={
                          orgApproved
                            ? deleted
                              ? "Cuenta eliminada"
                              : ""
                            : "Requiere solicitud de organizador APROBADA"
                        }
                      >
                        {u.canSell ? "Deshabilitar venta" : "Habilitar venta"}
                      </button>

                      {/* Activar / Desactivar */}
                      {!deleted && u.isActive ? (
                        <button
                          onClick={() => deactivate(u)}
                          className="px-2 py-1 mr-2 rounded border hover:bg-black/5"
                        >
                          Desactivar
                        </button>
                      ) : !deleted ? (
                        <button
                          onClick={() => activate(u)}
                          className="px-2 py-1 mr-2 rounded border hover:bg-black/5"
                        >
                          Activar
                        </button>
                      ) : null}

                      {/* Soft-delete */}
                      {!deleted && (
                        <button
                          onClick={() => softDelete(u)}
                          className="px-2 py-1 rounded border hover:bg-red-50"
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

      {/* Paginación */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-gray-600">
          Página {page} de {totalPages} — {total} usuario(s)
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





