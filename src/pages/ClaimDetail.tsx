// src/pages/ClaimDetail.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getClaim,
  cancelClaim,
  reopenClaim,
  getClaimMessages,
  addClaimMessage,
  uploadClaimEvidence,
  type Claim,
  type ClaimMessage,
  getStatusLabel,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
  getReasonLabel,
} from '../services/claimsService';
import { downloadProtectedFile } from '../utils/downloadProtectedFile';

export default function ClaimDetail() {
  const { id } = useParams<{ id: string }>();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [messages, setMessages] = useState<ClaimMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenInfo, setReopenInfo] = useState('');
  
  // Para agregar mensajes
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadClaim = useCallback(async () => {
    try {
      setLoading(true);
      const [claimData, messagesData] = await Promise.all([
        getClaim(Number(id)),
        getClaimMessages(Number(id)),
      ]);
      setClaim(claimData);
      setMessages(messagesData);
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
      await addClaimMessage(claim.id, { message: newMessage.trim() });
      setNewMessage('');
      await loadClaim();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Error al enviar el mensaje');
    } finally {
      setSendingMessage(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      alert('Puedes subir máximo 5 archivos a la vez');
      return;
    }
    setSelectedFiles(files);
  }

  async function handleUploadFiles() {
    if (!claim || selectedFiles.length === 0) return;

    try {
      setUploadingFiles(true);
      await uploadClaimEvidence(claim.id, selectedFiles, newMessage.trim() || undefined);
      setSelectedFiles([]);
      setNewMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      await loadClaim();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Error al subir archivos');
    } finally {
      setUploadingFiles(false);
    }
  }

  async function handleCancel() {
    if (!claim) return;
    
    if (!confirm('¿Estás seguro de que deseas cancelar este reclamo?')) {
      return;
    }

    try {
      setActionLoading(true);
      await cancelClaim(claim.id);
      await loadClaim();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Error al cancelar el reclamo');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReopen() {
    if (!claim) return;

    try {
      setActionLoading(true);
      await reopenClaim(claim.id, reopenInfo.trim() || undefined);
      setShowReopenModal(false);
      setReopenInfo('');
      await loadClaim();
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      alert(error.response?.data?.error || 'Error al reabrir el reclamo');
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-dark-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-neon-cyan"></div>
          <p className="mt-4 text-dark-200">Cargando reclamo...</p>
        </div>
      </div>
    );
  }

  if (error || !claim) {
    return (
      <div className="min-h-screen bg-dark-900 py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="glass border border-red-500/50 rounded-xl p-4 text-white flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <p className="flex-1">{error || 'Reclamo no encontrado'}</p>
          </div>
          <Link to="/mis-reclamos" className="mt-4 inline-block text-neon-cyan hover:text-neon-cyan/80">
            ← Volver a mis reclamos
          </Link>
        </div>
      </div>
    );
  }

  const canCancel = claim.status === 'PENDING' || claim.status === 'WAITING_INFO';
  const canReopen =
    claim.canReopen &&
    (claim.status === 'CANCELLED' || claim.status === 'REJECTED' || claim.status === 'RESOLVED');

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link to="/mis-reclamos" className="text-neon-cyan hover:text-neon-cyan/80">
            ← Volver a mis reclamos
          </Link>
        </div>

        {/* Header */}
        <div className="card-modern p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-display font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent mb-2">
                Reclamo #{claim.id}
              </h1>
              <p className="text-dark-200">
                {claim.reservation?.event.title}
              </p>
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
              Prioridad: {getPriorityLabel(claim.priority)}
            </span>
          </div>
        </div>

        {/* Información del evento */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
          <div>
            <p className="text-sm text-gray-500">Fecha del evento</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(claim.reservation?.event.date || '').toLocaleDateString('es-CL', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Lugar</p>
            <p className="text-sm font-medium text-gray-900">
              {claim.reservation?.event.location}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Código de reserva</p>
            <p className="text-sm font-medium text-gray-900">
              {claim.reservation?.code}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Cantidad de tickets</p>
            <p className="text-sm font-medium text-gray-900">
              {claim.reservation?.quantity}
            </p>
          </div>
        </div>
      </div>

      {/* Detalles del reclamo */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
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
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{claim.description}</p>
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

          {claim.reopenCount > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700">Reaperturas</p>
              <p className="text-sm text-gray-900">{claim.reopenCount} vez(veces)</p>
            </div>
          )}
        </div>
      </div>

      {/* Respuesta del admin */}
      {claim.adminResponse && (
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Respuesta del Equipo
          </h2>
          <p className="text-sm text-gray-900 whitespace-pre-wrap mb-4">
            {claim.adminResponse}
          </p>
          {claim.reviewedAt && (
            <p className="text-xs text-gray-500">
              Respondido el {new Date(claim.reviewedAt).toLocaleDateString('es-CL')} a las{' '}
              {new Date(claim.reviewedAt).toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}

      {/* Resolución */}
      {claim.resolution && (
        <div className="bg-green-50 rounded-lg border border-green-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Resolución</h2>
          <p className="text-sm text-gray-900 whitespace-pre-wrap mb-4">
            {claim.resolution}
          </p>
          {claim.resolvedAt && (
            <p className="text-xs text-gray-500">
              Resuelto el {new Date(claim.resolvedAt).toLocaleDateString('es-CL')} a las{' '}
              {new Date(claim.resolvedAt).toLocaleTimeString('es-CL', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          )}
        </div>
      )}

      {/* Historial de Conversación */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Historial de Conversación
        </h2>

        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">
            No hay mensajes aún. Agrega un mensaje o evidencia adicional.
          </p>
        ) : (
          <div className="space-y-4 mb-4 max-h-96 overflow-y-auto">
            {messages.map((msg) => {
              const isAdmin = msg.type === 'ADMIN_RESPONSE';
              const isEvidence = msg.type === 'BUYER_EVIDENCE';

              return (
                <div
                  key={msg.id}
                  className={`flex ${isAdmin ? 'justify-start' : 'justify-end'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      isAdmin
                        ? 'glass border border-neon-purple/50'
                        : 'glass-light border border-dark-600'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs font-medium ${
                          isAdmin ? 'text-neon-purple' : 'text-neon-cyan'
                        }`}
                      >
                        {isAdmin ? '👨‍💼 Administrador' : '👤 Tú'}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.createdAt).toLocaleDateString('es-CL', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    {msg.message && (
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {msg.message}
                      </p>
                    )}

                    {isEvidence && msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-600 mb-2">
                          📎 Evidencia adjunta:
                        </p>
                        <div className="grid grid-cols-2 gap-2">
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
                              className="text-xs text-blue-600 hover:underline truncate text-left px-2 py-1 hover:bg-blue-50 rounded transition"
                            >
                              📄 Archivo {idx + 1}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Formulario para agregar mensaje */}
        {claim.status !== 'RESOLVED' &&
          claim.status !== 'REJECTED' &&
          claim.status !== 'CANCELLED' && (
            <div className="border-t border-gray-200 pt-4">
              {/* Selector de archivos */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {/* Vista previa de archivos seleccionados */}
              {selectedFiles.length > 0 && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-blue-800">
                      {selectedFiles.length} archivo(s) seleccionado(s)
                    </span>
                    <button
                      onClick={() => {
                        setSelectedFiles([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Limpiar
                    </button>
                  </div>
                  <ul className="text-xs text-gray-700 space-y-1">
                    {selectedFiles.map((file, idx) => (
                      <li key={idx}>📎 {file.name} ({(file.size / 1024).toFixed(1)} KB)</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && selectedFiles.length === 0) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={
                    claim.status === 'WAITING_INFO'
                      ? 'Responde con la información solicitada...'
                      : 'Escribe un mensaje...'
                  }
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={sendingMessage || uploadingFiles}
                />
                
                {/* Botón para adjuntar archivos */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sendingMessage || uploadingFiles}
                  className="btn-ghost px-4 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Adjuntar evidencia"
                >
                  📎
                </button>

                {/* Botón de enviar - cambia según si hay archivos */}
                {selectedFiles.length > 0 ? (
                  <button
                    onClick={handleUploadFiles}
                    disabled={uploadingFiles}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingFiles ? 'Subiendo...' : 'Subir'}
                  </button>
                ) : (
                  <button
                    onClick={handleSendMessage}
                    disabled={sendingMessage || !newMessage.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sendingMessage ? 'Enviando...' : 'Enviar'}
                  </button>
                )}
              </div>
              {claim.status === 'WAITING_INFO' && (
                <p className="text-xs text-orange-600 mt-2">
                  ⚠️ El administrador está esperando información adicional de tu parte.
                </p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Presiona Enter para enviar • Adjunta hasta 5 archivos (imágenes o PDF)
              </p>
            </div>
          )}
      </div>

      {/* Acciones */}
      <div className="flex gap-4">
        {canCancel && (
          <button
            onClick={handleCancel}
            disabled={actionLoading}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
          >
            {actionLoading ? 'Cancelando...' : 'Cancelar Reclamo'}
          </button>
        )}

        {canReopen && (
          <button
            onClick={() => setShowReopenModal(true)}
            disabled={actionLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            Reabrir Reclamo
          </button>
        )}
      </div>

      {/* Modal de reapertura */}
      {showReopenModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reabrir Reclamo
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              ¿Deseas agregar información adicional para justificar la reapertura?
            </p>
            <textarea
              value={reopenInfo}
              onChange={(e) => setReopenInfo(e.target.value)}
              placeholder="Información adicional (opcional)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleReopen}
                disabled={actionLoading}
                className="btn-primary flex-1 px-4 py-2"
              >
                {actionLoading ? 'Reabriendo...' : 'Reabrir'}
              </button>
              <button
                onClick={() => {
                  setShowReopenModal(false);
                  setReopenInfo('');
                }}
                disabled={actionLoading}
                className="btn-secondary flex-1 px-4 py-2"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
