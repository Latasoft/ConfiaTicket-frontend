// src/pages/AdminTicketValidations.tsx
import { useState, useEffect, useCallback } from 'react';
import { 
  listAllValidations,
  type ValidationRecord,
  type ValidationsListResponse 
} from '@/services/ticketValidationsService';
import { adminListEvents, type AdminEvent } from '@/services/adminEventsService';

export default function AdminTicketValidations() {
  const [validations, setValidations] = useState<ValidationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  
  // Filtros
  const [eventId, setEventId] = useState<string>('');
  const [eventType, setEventType] = useState<'' | 'OWN' | 'RESALE'>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  
  // Paginación
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<ValidationsListResponse['pagination'] | null>(null);
  
  // Modal de detalles
  const [selectedValidation, setSelectedValidation] = useState<ValidationRecord | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadValidations = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page, limit: 50 };
      if (eventId) params.eventId = parseInt(eventId);
      if (eventType) params.eventType = eventType;
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const data = await listAllValidations(params as any);
      setValidations(data.validations);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error cargando validaciones:', error);
    } finally {
      setLoading(false);
    }
  }, [page, eventId, eventType, dateFrom, dateTo]);

  useEffect(() => {
    loadValidations();
  }, [loadValidations]);

  async function loadEvents() {
    try {
      const data = await adminListEvents({ page: 1, pageSize: 500 });
      setEvents(data.items);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    }
  }

  function handleFilterReset() {
    setEventId('');
    setEventType('');
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="max-w-7xl mx-auto p-6 bg-dark-900 min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Trazabilidad de Validaciones</h1>
        <p className="text-dark-300">Registros de escaneos de tickets OWN y RESALE</p>
      </div>

      {/* Filtros */}
      <div className="bg-dark-800 rounded-lg p-6 mb-6 border border-dark-700">
        <h2 className="text-xl font-semibold text-white mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Evento */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Evento
            </label>
            <select
              value={eventId}
              onChange={(e) => { setEventId(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">Todos los eventos</option>
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.title} ({event.eventType})
                </option>
              ))}
            </select>
          </div>

          {/* Tipo de evento */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Tipo de Evento
            </label>
            <select
              value={eventType}
              onChange={(e) => { setEventType(e.target.value as any); setPage(1); }}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="OWN">OWN (Propios)</option>
              <option value="RESALE">RESALE (Reventa)</option>
            </select>
          </div>

          {/* Fecha desde */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Desde
            </label>
            <input
              type="datetime-local"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>

          {/* Fecha hasta */}
          <div>
            <label className="block text-sm font-medium text-dark-300 mb-2">
              Hasta
            </label>
            <input
              type="datetime-local"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="mt-4 flex gap-3">
          <button
            onClick={handleFilterReset}
            className="px-4 py-2 bg-dark-700 text-white rounded-lg hover:bg-dark-600 transition-colors"
          >
            Limpiar Filtros
          </button>
          <button
            onClick={() => loadValidations()}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      {pagination && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30 border border-cyan-700 rounded-lg p-4">
            <div className="text-cyan-300 text-sm font-medium mb-1">Total Validaciones</div>
            <div className="text-3xl font-bold text-white">{pagination.total}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border border-purple-700 rounded-lg p-4">
            <div className="text-purple-300 text-sm font-medium mb-1">OWN (Propios)</div>
            <div className="text-3xl font-bold text-white">{pagination.ownCount}</div>
          </div>
          <div className="bg-gradient-to-br from-pink-900/50 to-pink-800/30 border border-pink-700 rounded-lg p-4">
            <div className="text-pink-300 text-sm font-medium mb-1">RESALE (Reventa)</div>
            <div className="text-3xl font-bold text-white">{pagination.resaleCount}</div>
          </div>
        </div>
      )}

      {/* Tabla */}
      <div className="bg-dark-800 rounded-lg border border-dark-700 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-dark-300">Cargando validaciones...</p>
          </div>
        ) : validations.length === 0 ? (
          <div className="p-12 text-center text-dark-400">
            <p>No se encontraron validaciones con los filtros aplicados</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-700 border-b border-dark-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                      Evento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                      Ticket
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                      Asiento
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                      Comprador
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                      Escaneos
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                      Último Escaneo
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {validations.map((validation) => (
                    <tr key={`${validation.type}-${validation.ticketId}`} className="hover:bg-dark-700/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          validation.type === 'OWN' 
                            ? 'bg-purple-900/50 text-purple-300 border border-purple-700' 
                            : 'bg-pink-900/50 text-pink-300 border border-pink-700'
                        }`}>
                          {validation.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm font-medium text-white">{validation.event.title}</div>
                        <div className="text-xs text-dark-400">{validation.event.organizer?.name}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-200">
                        {validation.type === 'OWN' 
                          ? `#${validation.ticketNumber}` 
                          : validation.ticketCode}
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-200">
                        {validation.type === 'OWN' 
                          ? validation.seatNumber || 'N/A' 
                          : validation.seatInfo}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-sm text-white">{validation.buyer?.name || 'N/A'}</div>
                        <div className="text-xs text-dark-400">{validation.buyer?.email}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-cyan-900/50 text-cyan-300 font-semibold">
                          {validation.scannedCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-200">
                        {formatDate(validation.lastScannedAt || validation.scannedAt || '')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedValidation(validation)}
                          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors"
                        >
                          Ver Detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 bg-dark-700 border-t border-dark-600 flex items-center justify-between">
                <div className="text-sm text-dark-300">
                  Página {pagination.page} de {pagination.totalPages} • Total: {pagination.total} validaciones
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 bg-dark-600 text-white rounded-lg hover:bg-dark-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal de Detalles */}
      {selectedValidation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-dark-700">
            <div className="p-6 border-b border-dark-700 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Detalles de Validación</h3>
              <button
                onClick={() => setSelectedValidation(null)}
                className="text-dark-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Tipo */}
              <div>
                <div className="text-sm text-dark-400 mb-1">Tipo de Evento</div>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${
                  selectedValidation.type === 'OWN' 
                    ? 'bg-purple-900/50 text-purple-300 border border-purple-700' 
                    : 'bg-pink-900/50 text-pink-300 border border-pink-700'
                }`}>
                  {selectedValidation.type}
                </span>
              </div>

              {/* Evento */}
              <div>
                <div className="text-sm text-dark-400 mb-1">Evento</div>
                <div className="text-lg font-semibold text-white">{selectedValidation.event.title}</div>
                <div className="text-sm text-dark-300">{selectedValidation.event.location}</div>
                <div className="text-sm text-dark-400">
                  {new Date(selectedValidation.event.date).toLocaleString('es-CL')}
                </div>
              </div>

              {/* Ticket Info */}
              <div>
                <div className="text-sm text-dark-400 mb-1">Información del Ticket</div>
                <div className="bg-dark-700 rounded-lg p-4 space-y-2">
                  {selectedValidation.type === 'OWN' ? (
                    <>
                      <div className="flex justify-between">
                        <span className="text-dark-300">Número:</span>
                        <span className="text-white font-medium">#{selectedValidation.ticketNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-300">Asiento:</span>
                        <span className="text-white font-medium">{selectedValidation.seatNumber || 'N/A'}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between">
                        <span className="text-dark-300">Código:</span>
                        <span className="text-white font-medium">{selectedValidation.ticketCode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-300">Fila:</span>
                        <span className="text-white font-medium">{selectedValidation.row}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-dark-300">Asiento:</span>
                        <span className="text-white font-medium">{selectedValidation.seat}</span>
                      </div>
                      {selectedValidation.zone && (
                        <div className="flex justify-between">
                          <span className="text-dark-300">Zona:</span>
                          <span className="text-white font-medium">{selectedValidation.zone}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Comprador */}
              {selectedValidation.buyer && (
                <div>
                  <div className="text-sm text-dark-400 mb-1">Comprador</div>
                  <div className="bg-dark-700 rounded-lg p-4">
                    <div className="text-white font-medium">{selectedValidation.buyer.name}</div>
                    <div className="text-sm text-dark-300">{selectedValidation.buyer.email}</div>
                    {selectedValidation.reservationCode && (
                      <div className="text-xs text-dark-400 mt-2">Código: {selectedValidation.reservationCode}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Escaneos */}
              <div>
                <div className="text-sm text-dark-400 mb-1">Estadísticas de Escaneo</div>
                <div className="bg-dark-700 rounded-lg p-4">
                  <div className="flex justify-between mb-2">
                    <span className="text-dark-300">Total de escaneos:</span>
                    <span className="text-cyan-400 font-bold text-xl">{selectedValidation.scannedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-300">Último escaneo:</span>
                    <span className="text-white font-medium">
                      {formatDate(selectedValidation.lastScannedAt || selectedValidation.scannedAt || '')}
                    </span>
                  </div>
                  {selectedValidation.scannedBy && (
                    <div className="flex justify-between mt-2">
                      <span className="text-dark-300">Escaneado por:</span>
                      <span className="text-white font-medium">ID {selectedValidation.scannedBy}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Logs de RESALE */}
              {selectedValidation.type === 'RESALE' && selectedValidation.logs && selectedValidation.logs.length > 0 && (
                <div>
                  <div className="text-sm text-dark-400 mb-2">Historial de Escaneos</div>
                  <div className="bg-dark-700 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="space-y-3">
                      {selectedValidation.logs.map((log, idx) => (
                        <div key={idx} className="border-b border-dark-600 last:border-0 pb-3 last:pb-0">
                          <div className="text-white text-sm font-medium mb-1">
                            {formatDate(log.timestamp)}
                          </div>
                          <div className="text-xs text-dark-400">IP: {log.ip}</div>
                          <div className="text-xs text-dark-400 truncate" title={log.userAgent}>
                            UA: {log.userAgent}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="p-6 border-t border-dark-700">
              <button
                onClick={() => setSelectedValidation(null)}
                className="w-full py-3 bg-cyan-600 text-white rounded-lg font-semibold hover:bg-cyan-700 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
