// src/pages/AdminUserDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { adminGetUser, type AdminUserDetail } from "@/services/adminUsersService";
import ProtectedImageModal from "@/components/ProtectedImageModal";

function formatDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-CL", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return new Date(iso!).toLocaleString();
  }
}

export default function AdminUserDetail() {
  const { id } = useParams<{ id: string }>();
  const userId = Number(id);
  const navigate = useNavigate();

  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  useEffect(() => {
    async function loadUser() {
      try {
        setLoading(true);
        setError(null);
        const data = await adminGetUser(userId);

        setUser(data);
      } catch (e: any) {
        setError(
          e?.response?.data?.error || 
          e?.message || 
          "No se pudo cargar la información del usuario"
        );
      } finally {
        setLoading(false);
      }
    }

    if (userId) {
      loadUser();
    }
  }, [userId]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Cargando información del usuario...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-800">{error || "Usuario no encontrado"}</p>
        </div>
        <button
          onClick={() => navigate("/admin/usuarios")}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          ← Volver a la lista
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            to="/admin/usuarios"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            ← Volver a Usuarios
          </Link>
          <h1 className="text-3xl font-bold">Perfil de Usuario</h1>
        </div>
      </div>

      {/* Grid de secciones */}
      <div className="grid gap-6 md:grid-cols-2">

        <section className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Información Básica
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-600">Nombre</dt>
              <dd className="font-medium">{user.name}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Email</dt>
              <dd className="font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Teléfono</dt>
              <dd className="font-medium">
                {user.application?.phone || user.phone || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">RUT</dt>
              <dd className="font-medium">{user.rut || "—"}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Fecha de nacimiento</dt>
              <dd className="font-medium">
                {user.birthDate 
                  ? (() => {
                      // Extraer solo la parte de la fecha (YYYY-MM-DD) sin convertir a hora local
                      const dateStr = user.birthDate.split('T')[0];
                      const [year, month, day] = dateStr.split('-');
                      return `${day}-${month}-${year}`;
                    })()
                  : "—"
                }
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Rol</dt>
              <dd>
                <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {user.role}
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Estado de la Cuenta
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-600">Estado</dt>
              <dd>
                {user.deletedAt ? (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Eliminado
                  </span>
                ) : user.isActive ? (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Activo
                  </span>
                ) : (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-gray-200 text-gray-700">
                    Inactivo
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Verificado</dt>
              <dd className="font-medium">{user.isVerified ? "Sí" : "No"}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Puede vender</dt>
              <dd className="font-medium">{user.canSell ? "Sí" : "No"}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Solicitud de organizador</dt>
              <dd>
                {user.latestOrganizerAppStatus === "APPROVED" && (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Aprobado
                  </span>
                )}
                {user.latestOrganizerAppStatus === "PENDING" && (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-900">
                    Pendiente
                  </span>
                )}
                {user.latestOrganizerAppStatus === "REJECTED" && (
                  <span className="inline-block px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    Rechazado
                  </span>
                )}
                {!user.latestOrganizerAppStatus && (
                  <span className="text-gray-500">—</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-600">Fecha de creación</dt>
              <dd className="font-medium">{formatDateTime(user.createdAt)}</dd>
            </div>
            {user.deletedAt && (
              <div>
                <dt className="text-sm text-gray-600">Fecha de eliminación</dt>
                <dd className="font-medium text-red-600">
                  {formatDateTime(user.deletedAt)}
                </dd>
              </div>
            )}
          </dl>
        </section>

        {/* Información del Organizador */}
        {user.role === "organizer" && user.application && (
          <section className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              Información del Organizador
            </h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600">Nombre legal / Razón social</dt>
                <dd className="font-medium">{user.application.legalName || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">RUT</dt>
                <dd className="font-medium">{user.application.taxId || user.rut || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Teléfono de contacto</dt>
                <dd className="font-medium">{user.application.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Imagen de identificación</dt>
                <dd>
                  {user.application.idCardImageUrl ? (
                    <ProtectedImageModal
                      imageUrl={user.application.idCardImageUrl}
                      buttonText="Ver documento"
                      title="Documento de identidad"
                    />
                  ) : (
                    <span className="text-gray-500">No disponible</span>
                  )}
                </dd>
              </div>
              {user.application.notes && (
                <div>
                  <dt className="text-sm text-gray-600">Notas de la solicitud</dt>
                  <dd className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                    {user.application.notes}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm text-gray-600">Fecha de solicitud</dt>
                <dd className="font-medium text-sm">
                  {formatDateTime(user.application.createdAt)}
                </dd>
              </div>
              {user.application.updatedAt && (
                <div>
                  <dt className="text-sm text-gray-600">Última actualización</dt>
                  <dd className="font-medium text-sm">
                    {formatDateTime(user.application.updatedAt)}
                  </dd>
                </div>
              )}
            </dl>
          </section>
        )}

        {/* Datos bancarios */}
        {user.role === "organizer" && user.bankingInfo && (
          <section className="bg-white border rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">
              Datos Bancarios
            </h2>
            
            {/* Estado de la cuenta bancaria */}
            <div className="mb-4 p-3 rounded-lg bg-gray-50">
              {user.bankingInfo.payoutsEnabled !== undefined && (
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm text-gray-600">Pagos habilitados:</span>
                  <span className={`text-sm font-medium ${
                    user.bankingInfo.payoutsEnabled 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {user.bankingInfo.payoutsEnabled ? 'Sí' : 'No'}
                  </span>
                </div>
              )}
            </div>

            <dl className="space-y-3">
              <div>
                <dt className="text-sm text-gray-600">Banco</dt>
                <dd className="font-medium">
                  {user.bankingInfo.bankDetails.bankName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Tipo de cuenta</dt>
                <dd className="font-medium">
                  {user.bankingInfo.bankDetails.accountType || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Número de cuenta</dt>
                <dd className="font-medium font-mono">
                  {user.bankingInfo.bankDetails.accountNumber || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">Titular</dt>
                <dd className="font-medium">
                  {user.bankingInfo.bankDetails.holderName || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-600">RUT del titular</dt>
                <dd className="font-medium">
                  {user.bankingInfo.bankDetails.holderRut || "—"}
                </dd>
              </div>

            </dl>
          </section>
        )}

        {/* estadisticas */}
        <section className="bg-white border rounded-lg p-6 md:col-span-2">
          <h2 className="text-xl font-semibold mb-4 border-b pb-2">
            Estadísticas
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <dt className="text-sm text-gray-600 mb-1">Eventos creados</dt>
              <dd className="text-3xl font-bold text-gray-900">
                {user.stats?.eventsCreated ?? 0}
              </dd>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <dt className="text-sm text-gray-600 mb-1">Compras realizadas</dt>
              <dd className="text-3xl font-bold text-gray-900">
                {user.stats?.purchasesMade ?? 0}
              </dd>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <dt className="text-sm text-gray-600 mb-1">Eventos activos</dt>
              <dd className="text-3xl font-bold text-gray-900">
                {user.stats?.activeEvents ?? 0}
              </dd>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
