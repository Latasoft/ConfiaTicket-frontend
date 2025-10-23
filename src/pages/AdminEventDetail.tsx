// src/pages/AdminEventDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { adminGetEvent, adminSetEventStatus, type AdminEvent } from "@/services/adminEventsService";

type Toast = { kind: "success" | "info" | "error"; text: string } | null;

export default function AdminEventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    async function loadEvent() {
      try {
        setLoading(true);
        const data = await adminGetEvent(Number(id));
        setEvent(data);
      } catch (error: any) {
        console.error("Error al cargar evento:", error);
        setToast({
          kind: "error",
          text: error?.response?.data?.message || "Error al cargar el evento",
        });
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  async function handleStatusChange(newStatus: "approved" | "pending") {
    if (!event) return;
    
    try {
      setActionLoading(true);
      const updated = await adminSetEventStatus(event.id, newStatus);
      setEvent(updated);
      setToast({
        kind: "success",
        text: `Evento ${newStatus === "approved" ? "aprobado" : "marcado como pendiente"}`,
      });
    } catch (error: any) {
      setToast({
        kind: "error",
        text: error?.response?.data?.message || "Error al cambiar el estado",
      });
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando evento...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
          No se encontró el evento
        </div>
        <Link to="/admin/eventos" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Volver a eventos
        </Link>
      </div>
    );
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded shadow-lg ${
            toast.kind === "success"
              ? "bg-green-100 text-green-800"
              : toast.kind === "error"
              ? "bg-red-100 text-red-800"
              : "bg-blue-100 text-blue-800"
          }`}
        >
          {toast.text}
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <Link to="/admin/eventos" className="text-blue-600 hover:underline mb-4 inline-block">
          ← Volver a eventos
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">{event.title}</h1>
        <div className="mt-2 flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              event.status === "approved"
                ? "bg-green-100 text-green-800"
                : "bg-yellow-100 text-yellow-800"
            }`}
          >
            {event.status === "approved" ? "Aprobado" : "Pendiente"}
          </span>
          {event.organizerDeletedOrInactive && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
              Organizador inactivo
            </span>
          )}
        </div>
      </div>

      {/* Imagen de portada */}
      {event.coverImageUrl && (
        <div className="mb-6">
          <img
            src={event.coverImageUrl}
            alt={event.title}
            className="w-full h-96 object-cover rounded-lg shadow-md"
          />
        </div>
      )}

      {/* Información principal */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Detalles del evento</h2>
          
          <div className="space-y-3">
            <div>
              <span className="text-gray-600 text-sm">Fecha y hora</span>
              <p className="font-medium">{formatDate(event.startAt)}</p>
            </div>

            <div>
              <span className="text-gray-600 text-sm">Lugar</span>
              <p className="font-medium">{event.venue}</p>
            </div>

            {event.city && (
              <div>
                <span className="text-gray-600 text-sm">Ciudad</span>
                <p className="font-medium">{event.city}</p>
              </div>
            )}

            {event.commune && (
              <div>
                <span className="text-gray-600 text-sm">Comuna</span>
                <p className="font-medium">{event.commune}</p>
              </div>
            )}

            <div>
              <span className="text-gray-600 text-sm">Capacidad</span>
              <p className="font-medium">{event.capacity} personas</p>
            </div>

            {event.price !== undefined && (
              <div>
                <span className="text-gray-600 text-sm">Precio</span>
                <p className="font-medium">${event.price.toLocaleString("es-CL")}</p>
              </div>
            )}

            {event.createdAt && (
              <div>
                <span className="text-gray-600 text-sm">Creado el</span>
                <p className="font-medium">{formatDate(event.createdAt)}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Organizador</h2>
          
          {event.organizer ? (
            <div className="space-y-3">
              <div>
                <span className="text-gray-600 text-sm">Nombre</span>
                <p className="font-medium">{event.organizer.name}</p>
              </div>

              {event.organizer.legalName && (
                <div>
                  <span className="text-gray-600 text-sm">Razón social</span>
                  <p className="font-medium">{event.organizer.legalName}</p>
                </div>
              )}

              <div>
                <span className="text-gray-600 text-sm">Email</span>
                <p className="font-medium">{event.organizer.email}</p>
              </div>

              {event.organizer.rut && (
                <div>
                  <span className="text-gray-600 text-sm">RUT</span>
                  <p className="font-medium">{event.organizer.rut}</p>
                </div>
              )}

              {event.organizer.phone && (
                <div>
                  <span className="text-gray-600 text-sm">Teléfono</span>
                  <p className="font-medium">{event.organizer.phone}</p>
                </div>
              )}

              <div>
                <span className="text-gray-600 text-sm">ID</span>
                <p className="font-medium">#{event.organizer.id}</p>
              </div>

              <div>
                <span className="text-gray-600 text-sm">Estado</span>
                <p className="font-medium">
                  {event.organizer.isActive ? (
                    <span className="text-green-600">Activo</span>
                  ) : (
                    <span className="text-red-600">Inactivo</span>
                  )}
                </p>
              </div>

              <Link
                to={`/admin/usuarios/${event.organizer.id}`}
                className="inline-block mt-2 text-blue-600 hover:underline text-sm"
              >
                Ver perfil del organizador →
              </Link>
            </div>
          ) : (
            <p className="text-gray-500">No hay información del organizador</p>
          )}
        </div>
      </div>

      {/* Descripción */}
      {event.description && (
        <div className="bg-white border rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-3">Descripción</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
        </div>
      )}

      {/* Estadísticas de ventas */}
      {event.stats && (
        <div className="bg-white border rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Estadísticas de ventas</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Entradas vendidas</p>
              <p className="text-2xl font-bold text-blue-600">{event.stats.ticketsSold}</p>
              <p className="text-xs text-gray-500 mt-1">de {event.capacity} capacidad</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Entradas disponibles</p>
              <p className="text-2xl font-bold text-green-600">{event.stats.availableTickets}</p>
              <p className="text-xs text-gray-500 mt-1">libres para vender</p>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Ingresos totales</p>
              <p className="text-2xl font-bold text-yellow-600">
                ${event.stats.totalRevenue.toLocaleString("es-CL")}
              </p>
              <p className="text-xs text-gray-500 mt-1">ventas confirmadas</p>
            </div>
          </div>
        </div>
      )}

      {/* Información bancaria del evento (legacy) */}
      {event.eventBankingInfo && (
        <div className="bg-white border rounded-lg p-6 shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">🏦 Información bancaria (legacy del evento)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-gray-600 text-sm">Banco</span>
              <p className="font-medium">{event.eventBankingInfo.bankName}</p>
            </div>

            <div>
              <span className="text-gray-600 text-sm">Tipo de cuenta</span>
              <p className="font-medium">{event.eventBankingInfo.accountType}</p>
            </div>

            <div>
              <span className="text-gray-600 text-sm">Número de cuenta</span>
              <p className="font-medium">{event.eventBankingInfo.accountNumber}</p>
            </div>

            <div>
              <span className="text-gray-600 text-sm">Titular</span>
              <p className="font-medium">{event.eventBankingInfo.holderName}</p>
            </div>

            <div>
              <span className="text-gray-600 text-sm">RUT del titular</span>
              <p className="font-medium">{event.eventBankingInfo.holderRut}</p>
            </div>
          </div>

          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
            Esta información bancaria es específica de este evento (sistema legacy). 
            Para configuración bancaria actual del organizador, ver su perfil.
          </div>
        </div>
      )}

      {/* Acciones */}
      <div className="bg-white border rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">Acciones</h2>
        <div className="flex gap-3">{event.status === "pending" ? (
            <button
              onClick={() => handleStatusChange("approved")}
              disabled={actionLoading || event.organizerDeletedOrInactive}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? "Procesando..." : "Aprobar evento"}
            </button>
          ) : (
            <button
              onClick={() => handleStatusChange("pending")}
              disabled={actionLoading}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
            >
              {actionLoading ? "Procesando..." : "Marcar como pendiente"}
            </button>
          )}
          
          {event.organizerDeletedOrInactive && (
            <p className="text-sm text-red-600 flex items-center">
              ⚠️ El organizador está inactivo o eliminado
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
