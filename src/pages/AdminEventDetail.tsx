// src/pages/AdminEventDetail.tsx
import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { adminGetEvent, adminSetEventStatus, adminDeleteEvent, type AdminEvent } from "@/services/adminEventsService";
import { getFriendlyErrorMessage } from "@/utils/errorMessages";

type Toast = { kind: "success" | "info" | "error"; text: string } | null;

export default function AdminEventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<AdminEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    
    async function loadEvent() {
      try {
        setLoading(true);
        const data = await adminGetEvent(Number(id));
        setEvent(data);
      } catch (error: any) {
        console.error("Error al cargar evento:", error);
        const message = getFriendlyErrorMessage(error, "No se pudo cargar el evento");
        setToast({
          kind: "error",
          text: message,
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
      const message = getFriendlyErrorMessage(error, "No se pudo cambiar el estado del evento");
      setToast({
        kind: "error",
        text: message,
      });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteEvent() {
    if (!event) return;
    
    try {
      setActionLoading(true);
      await adminDeleteEvent(event.id);
      setToast({
        kind: "success",
        text: "Evento eliminado correctamente",
      });
      
      // Redirigir a la lista de eventos después de 1.5 segundos
      setTimeout(() => {
        navigate("/admin/eventos");
      }, 1500);
    } catch (error: any) {
      const baseMessage = getFriendlyErrorMessage(error, "No se pudo eliminar el evento");
      const details = error?.response?.data?.details;
      
      let detailsText = "";
      if (details) {
        detailsText = ` (${details.reservations} reservas, ${details.tickets} tickets)`;
      }
      
      setToast({
        kind: "error",
        text: baseMessage + detailsText,
      });
      setShowDeleteModal(false);
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
          <p className="mt-4 text-cyan-400 font-medium">Cargando evento...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-dark-900 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-500/20 border-2 border-red-400/50 rounded-2xl p-6 text-red-300">
            No se encontró el evento
          </div>
          <Link to="/admin/eventos" className="mt-4 inline-block text-cyan-400 hover:text-cyan-300 font-bold transition-colors">
            ← Volver a eventos
          </Link>
        </div>
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
    <div className="min-h-screen bg-dark-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Toast */}
        {toast && (
          <div
            className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-2xl shadow-2xl border-2 ${
              toast.kind === "success"
                ? "bg-green-500/20 text-green-300 border-green-400/50"
                : toast.kind === "error"
                ? "bg-red-500/20 text-red-300 border-red-400/50"
                : "bg-blue-500/20 text-blue-300 border-blue-400/50"
            }`}
          >
            {toast.text}
          </div>
        )}

        {/* Header */}
        <div className="mb-8">
          <Link to="/admin/eventos" className="text-cyan-400 hover:text-cyan-300 font-bold mb-4 inline-block transition-colors">
            ← Volver a eventos
          </Link>
          <h1 className="text-4xl font-bold text-white">{event.title}</h1>
          <div className="mt-4 flex items-center gap-3">
            <span
              className={`px-3 py-1 rounded-full text-sm font-bold border-2 ${
                event.status === "approved"
                  ? "bg-green-500/20 text-green-300 border-green-400/50"
                  : "bg-amber-500/20 text-amber-300 border-amber-400/50"
              }`}
            >
              {event.status === "approved" ? "Aprobado" : "Pendiente"}
            </span>
            {event.organizerDeletedOrInactive && (
              <span className="px-3 py-1 rounded-full text-sm font-bold bg-red-500/20 text-red-300 border-2 border-red-400/50">
                Organizador inactivo
              </span>
            )}
          </div>
        </div>

        {/* Imagen de portada */}
        {event.coverImageUrl && (
          <div className="mb-8">
            <img
              src={event.coverImageUrl}
              alt={event.title}
              className="w-full h-96 object-cover rounded-2xl shadow-2xl border-2 border-dark-700"
            />
          </div>
        )}

        {/* Información principal */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-2 border-cyan-400/50 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-white">Detalles del evento</h2>
            
            <div className="space-y-4">
              <div>
                <span className="text-dark-100 text-sm font-bold">Fecha y hora</span>
                <p className="font-medium text-white">{formatDate(event.startAt)}</p>
              </div>

              <div>
                <span className="text-dark-100 text-sm font-bold">Lugar</span>
                <p className="font-medium text-white">{event.venue}</p>
              </div>

              {event.city && (
                <div>
                  <span className="text-dark-100 text-sm font-bold">Ciudad</span>
                  <p className="font-medium text-white">{event.city}</p>
                </div>
              )}

              {event.commune && (
                <div>
                  <span className="text-dark-100 text-sm font-bold">Comuna</span>
                  <p className="font-medium text-white">{event.commune}</p>
                </div>
              )}

              <div>
                <span className="text-dark-100 text-sm font-bold">Capacidad</span>
                <p className="font-medium text-white">{event.capacity} personas</p>
              </div>

              {event.price !== undefined && (
                <div>
                  <span className="text-dark-100 text-sm font-bold">Precio</span>
                  <p className="font-medium text-green-400 text-lg">${event.price.toLocaleString("es-CL")}</p>
                </div>
              )}

              {event.createdAt && (
                <div>
                  <span className="text-dark-100 text-sm font-bold">Creado el</span>
                  <p className="font-medium text-dark-300">{formatDate(event.createdAt)}</p>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-2 border-purple-400/50 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-white">Organizador</h2>
            
            {event.organizer ? (
              <div className="space-y-4">
                <div>
                  <span className="text-dark-100 text-sm font-bold">Nombre</span>
                  <p className="font-medium text-white">{event.organizer.name}</p>
                </div>

                {event.organizer.legalName && (
                  <div>
                    <span className="text-dark-100 text-sm font-bold">Razón social</span>
                    <p className="font-medium text-white">{event.organizer.legalName}</p>
                  </div>
                )}

                <div>
                  <span className="text-dark-100 text-sm font-bold">Email</span>
                  <p className="font-medium text-white">{event.organizer.email}</p>
                </div>

                {event.organizer.rut && (
                  <div>
                    <span className="text-dark-100 text-sm font-bold">RUT</span>
                    <p className="font-medium text-white">{event.organizer.rut}</p>
                  </div>
                )}

                {event.organizer.phone && (
                  <div>
                    <span className="text-dark-100 text-sm font-bold">Teléfono</span>
                    <p className="font-medium text-white">{event.organizer.phone}</p>
                  </div>
                )}

                <div>
                  <span className="text-dark-100 text-sm font-bold">ID</span>
                  <p className="font-medium text-white">#{event.organizer.id}</p>
                </div>

                <div>
                  <span className="text-dark-100 text-sm font-bold">Estado</span>
                  <p className="font-medium">
                    {event.organizer.isActive ? (
                      <span className="text-green-400 font-bold">Activo</span>
                    ) : (
                      <span className="text-red-400 font-bold">Inactivo</span>
                    )}
                  </p>
                </div>

                <Link
                  to={`/admin/usuarios/${event.organizer.id}`}
                  className="inline-block mt-2 text-cyan-400 hover:text-cyan-300 text-sm font-bold transition-colors"
                >
                  Ver perfil del organizador →
                </Link>
              </div>
            ) : (
              <p className="text-dark-400">No hay información del organizador</p>
            )}
          </div>
        </div>

        {/* Descripción */}
        {event.description && (
          <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl p-6 shadow-xl mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Descripción</h2>
            <p className="text-dark-200 whitespace-pre-wrap">{event.description}</p>
          </div>
        )}

        {/* Estadísticas de ventas */}
        {event.stats && (
          <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl p-6 shadow-xl mb-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Estadísticas de ventas</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-2 border-blue-400/50 p-6 rounded-2xl">
                <p className="text-sm text-dark-100 mb-2 font-bold">Entradas vendidas</p>
                <p className="text-3xl font-bold text-blue-400">{event.stats.ticketsSold}</p>
                <p className="text-xs text-dark-400 mt-2">de {event.capacity} capacidad</p>
              </div>

              <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-2 border-green-400/50 p-6 rounded-2xl">
                <p className="text-sm text-dark-100 mb-2 font-bold">Entradas disponibles</p>
                <p className="text-3xl font-bold text-green-400">{event.stats.availableTickets}</p>
                <p className="text-xs text-dark-400 mt-2">libres para vender</p>
              </div>

              <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-2 border-amber-400/50 p-6 rounded-2xl">
                <p className="text-sm text-dark-100 mb-2 font-bold">Ingresos totales</p>
                <p className="text-3xl font-bold text-amber-400">
                  ${event.stats.totalRevenue.toLocaleString("es-CL")}
                </p>
                <p className="text-xs text-dark-400 mt-2">ventas confirmadas</p>
              </div>
            </div>
          </div>
        )}

        {/* Información bancaria del evento (legacy) */}
        {event.eventBankingInfo && (
          <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl p-6 shadow-xl mb-8">
            <h2 className="text-2xl font-bold mb-6 text-white">Información bancaria (legacy del evento)</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <span className="text-dark-100 text-sm font-bold">Banco</span>
                <p className="font-medium text-white">{event.eventBankingInfo.bankName}</p>
              </div>

              <div>
                <span className="text-dark-100 text-sm font-bold">Tipo de cuenta</span>
                <p className="font-medium text-white">{event.eventBankingInfo.accountType}</p>
              </div>

              <div>
                <span className="text-dark-100 text-sm font-bold">Número de cuenta</span>
                <p className="font-medium text-white">{event.eventBankingInfo.accountNumber}</p>
              </div>

              <div>
                <span className="text-dark-100 text-sm font-bold">Titular</span>
                <p className="font-medium text-white">{event.eventBankingInfo.holderName}</p>
              </div>

              <div>
                <span className="text-dark-100 text-sm font-bold">RUT del titular</span>
                <p className="font-medium text-white">{event.eventBankingInfo.holderRut}</p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-amber-500/20 border-2 border-amber-400/50 rounded-xl text-sm text-amber-300">
              Esta información bancaria es específica de este evento (sistema legacy). 
              Para configuración bancaria actual del organizador, ver su perfil.
            </div>
          </div>
        )}

        {/* Acciones */}
        <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-white">Acciones</h2>
          <div className="flex gap-3 flex-wrap">
            {event.status === "pending" ? (
              <button
                onClick={() => handleStatusChange("approved")}
                disabled={actionLoading || event.organizerDeletedOrInactive}
                className="px-6 py-3 bg-green-500/20 text-green-300 border-2 border-green-400/50 rounded-xl hover:bg-green-500/30 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-all shadow-lg shadow-green-500/20"
              >
                {actionLoading ? "Procesando..." : "Aprobar evento"}
              </button>
            ) : (
              <button
                onClick={() => handleStatusChange("pending")}
                disabled={actionLoading}
                className="px-6 py-3 bg-amber-500/20 text-amber-300 border-2 border-amber-400/50 rounded-xl hover:bg-amber-500/30 disabled:opacity-30 font-bold transition-all shadow-lg shadow-amber-500/20"
              >
                {actionLoading ? "Procesando..." : "Marcar como pendiente"}
              </button>
            )}
            
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={actionLoading}
              className="px-6 py-3 bg-red-500/20 text-red-300 border-2 border-red-400/50 rounded-xl hover:bg-red-500/30 disabled:opacity-30 disabled:cursor-not-allowed font-bold transition-all shadow-lg shadow-red-500/20"
            >
              Eliminar evento
            </button>
            
            {event.organizerDeletedOrInactive && (
              <p className="text-sm text-red-300 flex items-center w-full mt-2 font-medium">
                El organizador está inactivo o eliminado
              </p>
            )}
          </div>
          
          <div className="mt-6 p-4 bg-blue-500/20 border-2 border-blue-400/50 rounded-xl text-sm text-blue-300">
            <strong>Nota:</strong> Solo se pueden eliminar eventos sin reservas ni tickets asociados. 
            Esta función es útil para limpiar eventos antiguos del sistema LEGACY.
          </div>
        </div>

        {/* Modal de confirmación de eliminación */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
            <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl shadow-2xl max-w-md w-full p-8">
              <h3 className="text-2xl font-bold text-white mb-6">
                Confirmar eliminación
              </h3>
              
              <p className="text-dark-200 mb-6">
                ¿Estás seguro de que quieres eliminar el evento <strong className="text-white">"{event.title}"</strong>?
              </p>
              
              <div className="bg-amber-500/20 border-2 border-amber-400/50 rounded-xl p-4 mb-6 text-sm text-amber-300">
                <strong>Advertencia:</strong> Esta acción no se puede deshacer. El evento solo se eliminará 
                si no tiene reservas ni tickets asociados.
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  disabled={actionLoading}
                  className="px-6 py-3 border-2 border-dark-600 text-white rounded-xl hover:bg-dark-700 disabled:opacity-30 font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteEvent}
                  disabled={actionLoading}
                  className="px-6 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl disabled:opacity-30 font-bold transition-all shadow-lg shadow-red-500/30"
                >
                  {actionLoading ? "Eliminando..." : "Eliminar evento"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
