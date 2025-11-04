// src/pages/AdminClaimDetail.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  adminGetClaim,
  adminUpdateClaimStatus,
  adminUpdateClaimPriority,
  adminGetClaimMessages,
  adminAddClaimMessage,
  type Claim,
  type ClaimMessage,
  type ClaimStatus,
  type ClaimPriority,
  getStatusLabel,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
  getReasonLabel,
} from '../services/claimsService';
import { downloadProtectedFile } from '../utils/downloadProtectedFile';

export default function AdminClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [messages, setMessages] = useState<ClaimMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  
  // Estado del formulario
  const [newStatus, setNewStatus] = useState<ClaimStatus>('PENDING');
  const [adminResponse, setAdminResponse] = useState('');
  const [resolution, setResolution] = useState('');
  const [newPriority, setNewPriority] = useState<ClaimPriority>('MEDIUM');
  
  // Para el chat
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadClaim = useCallback(async () => {
    try {
      setLoading(true);
      const [claimData, messagesData] = await Promise.all([
        adminGetClaim(Number(id)),
        adminGetClaimMessages(Number(id)),
      ]);
      setClaim(claimData);
      setMessages(messagesData);
      setNewStatus(claimData.status);
      setNewPriority(claimData.priority);
      setAdminResponse(claimData.adminResponse || '');
      setResolution(claimData.resolution || '');
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Error al cargar el reclamo');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadClaim();
    }
  }, [id, loadClaim]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function handleSendMessage() {
    if (!claim || !newMessage.trim()) return;

    try {
      setSendingMessage(true);
      await adminAddClaimMessage(claim.id, newMessage.trim());
      setNewMessage('');
      await loadClaim();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Error al enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  }

  async function handleUpdateStatus() {
    if (!claim) return;

    try {
      setActionLoading(true);
      await adminUpdateClaimStatus(claim.id, {
        status: newStatus,
        adminResponse: adminResponse.trim() || undefined,
        resolution: resolution.trim() || undefined,
      });
      await loadClaim();
      alert('Estado actualizado correctamente');
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Error al actualizar el estado');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdatePriority() {
    if (!claim) return;

    try {
      setActionLoading(true);
      await adminUpdateClaimPriority(claim.id, newPriority);
      await loadClaim();
      alert('Prioridad actualizada correctamente');
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Error al actualizar la prioridad');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando reclamo...</p>
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error || 'Reclamo no encontrado'}
        </div>
        <Link to="/admin/reclamos" className="mt-4 inline-block text-blue-600 hover:underline">
          ← Volver a reclamos
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link to="/admin/reclamos" className="text-blue-600 hover:underline">
          ← Volver a reclamos
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Reclamo #{claim.id}
                </h1>
                <p className="text-gray-600">{claim.reservation?.event.title}</p>
              </div>
              <div className="flex flex-col gap-2 items-end">
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(
                    claim.status
                  )}`}
                >
                  {getStatusLabel(claim.status)}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(
                    claim.priority
                  )}`}
                >
                  {getPriorityLabel(claim.priority)}
                </span>
              </div>
            </div>

            {/* Info del comprador */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
              <div>
                <p className="text-sm text-gray-500">Comprador</p>
                <p className="text-sm font-medium text-gray-900">{claim.buyer?.name}</p>
                <p className="text-sm text-gray-600">{claim.buyer?.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">RUT</p>
                <p className="text-sm font-medium text-gray-900">
                  {claim.buyer?.rut || 'No disponible'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Código de reserva</p>
                <p className="text-sm font-medium text-gray-900">{claim.reservation?.code}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Monto pagado</p>
                <p className="text-sm font-medium text-gray-900">
                  ${claim.reservation?.amount.toLocaleString('es-CL')}
                </p>
              </div>
            </div>
          </div>

          {/* Detalles del reclamo */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Detalles del Reclamo
            </h2>

            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700">Motivo</p>
                <p className="text-sm text-gray-900">{getReasonLabel(claim.reason)}</p>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-700">Descripción</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 p-3 rounded">
                  {claim.description}
                </p>
              </div>

              {claim.attachmentUrl && (
                <div>
                  <p className="text-sm font-medium text-gray-700">Adjunto</p>
                  <a
                    href={claim.attachmentUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Ver archivo adjunto
                  </a>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Fecha de creación</p>
                  <p className="text-sm text-gray-900">
                    {new Date(claim.createdAt).toLocaleDateString('es-CL')} a las{' '}
                    {new Date(claim.createdAt).toLocaleTimeString('es-CL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Reaperturas</p>
                  <p className="text-sm text-gray-900">{claim.reopenCount} vez(veces)</p>
                </div>
              </div>
            </div>
          </div>

          {/* Respuestas previas */}
          {claim.adminResponse && (
            <div className="bg-blue-50 rounded-lg border border-blue-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Respuesta Anterior
              </h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {claim.adminResponse}
              </p>
              {claim.reviewedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Respondido el {new Date(claim.reviewedAt).toLocaleDateString('es-CL')}
                </p>
              )}
            </div>
          )}

          {claim.resolution && (
            <div className="bg-green-50 rounded-lg border border-green-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Resolución Anterior
              </h3>
              <p className="text-sm text-gray-900 whitespace-pre-wrap">
                {claim.resolution}
              </p>
              {claim.resolvedAt && (
                <p className="text-xs text-gray-500 mt-2">
                  Resuelto el {new Date(claim.resolvedAt).toLocaleDateString('es-CL')}
                </p>
              )}
            </div>
          )}

          {/* Chat de mensajes */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Historial de Mensajes
            </h3>

            {/* Lista de mensajes */}
            <div className="space-y-4 mb-4 max-h-[500px] overflow-y-auto">
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  No hay mensajes aún.
                </p>
              ) : (
                messages.map((msg) => {
                  const isAdmin = msg.authorRole === 'superadmin';
                  
                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg p-4 ${
                          isAdmin
                            ? 'bg-blue-100 border border-blue-200'
                            : 'bg-gray-100 border border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-gray-700">
                            {isAdmin ? '👨‍💼 Administrador' : '👤 Comprador'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(msg.createdAt).toLocaleDateString('es-CL')} a las{' '}
                            {new Date(msg.createdAt).toLocaleTimeString('es-CL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>

                        {msg.type === 'BUYER_EVIDENCE' && (
                          <div className="mb-2">
                            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded">
                              📎 Evidencia adjunta
                            </span>
                          </div>
                        )}

                        {msg.message && (
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {msg.message}
                          </p>
                        )}

                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            <p className="text-xs font-medium text-gray-700">Archivos adjuntos:</p>
                            {msg.attachments.map((url, idx) => (
                              <button
                                key={idx}
                                onClick={async () => {
                                  try {
                                    const filename = url.split('/').pop() || `archivo-${idx + 1}`;
                                    await downloadProtectedFile(url, filename);
                                  } catch (error: unknown) {
                                    alert(error instanceof Error ? error.message : 'Error al descargar el archivo');
                                  }
                                }}
                                className="block text-xs text-blue-600 hover:underline hover:bg-blue-50 px-2 py-1 rounded transition text-left w-full"
                              >
                                📄 Archivo {idx + 1}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input para enviar mensajes */}
            {claim.status !== 'RESOLVED' &&
              claim.status !== 'REJECTED' &&
              claim.status !== 'CANCELLED' && (
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder="Escribe un mensaje al comprador..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={sendingMessage}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={sendingMessage || !newMessage.trim()}
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {sendingMessage ? 'Enviando...' : 'Enviar'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    Presiona Enter para enviar • Máximo 2000 caracteres
                  </p>
                </div>
              )}
          </div>
        </div>

        {/* Panel de acciones */}
        <div className="space-y-6">
          {/* Actualizar prioridad */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Actualizar Prioridad
            </h3>
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as ClaimPriority)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-4"
            >
              <option value="LOW">Baja</option>
              <option value="MEDIUM">Media</option>
              <option value="HIGH">Alta</option>
              <option value="URGENT">Urgente</option>
            </select>
            <button
              onClick={handleUpdatePriority}
              disabled={actionLoading || newPriority === claim.priority}
              className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
            >
              {actionLoading ? 'Actualizando...' : 'Actualizar Prioridad'}
            </button>
          </div>

          {/* Actualizar estado */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Gestionar Reclamo
            </h3>

            {/* Estado */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nuevo Estado
              </label>
              <select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value as ClaimStatus)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="PENDING">Pendiente</option>
                <option value="IN_REVIEW">En revisión</option>
                <option value="WAITING_INFO">Esperando información</option>
                <option value="RESOLVED">Resuelto</option>
                <option value="REJECTED">Rechazado</option>
              </select>
            </div>

            {/* Respuesta */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Respuesta al cliente
              </label>
              <textarea
                value={adminResponse}
                onChange={(e) => setAdminResponse(e.target.value)}
                placeholder="Escribe tu respuesta aquí..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={4}
                maxLength={2000}
              />
            </div>

            {/* Resolución (solo si está marcando como resuelto o rechazado) */}
            {(newStatus === 'RESOLVED' || newStatus === 'REJECTED') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Resolución final
                </label>
                <textarea
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  placeholder="Explica cómo se resolvió el caso..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  maxLength={2000}
                />
              </div>
            )}

            <button
              onClick={handleUpdateStatus}
              disabled={actionLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {actionLoading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
