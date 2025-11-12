// src/pages/OrganizerTicketValidations.tsx
import { useState, useEffect, useCallback } from 'react';
import { 
  listOrganizerValidations,
  type ValidationRecord,
  type ValidationsListResponse 
} from '@/services/ticketValidationsService';
import { listMyEvents, type OrganizerEvent } from '@/services/organizerEventsService';

export default function OrganizerTicketValidations() {
  const [validations, setValidations] = useState<ValidationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  
  // Filtros
  const [eventId, setEventId] = useState<string>('');
  const [eventType, setEventType] = useState<'' | 'OWN' | 'RESALE'>('');
  
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

      const data = await listOrganizerValidations(params as any);
      setValidations(data.validations);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error cargando validaciones:', error);
    } finally {
      setLoading(false);
    }
  }, [page, eventId, eventType]);

  useEffect(() => {
    loadValidations();
  }, [loadValidations]);

  async function loadEvents() {
    try {
      const data = await listMyEvents();
      setEvents(data.items);
    } catch (error) {
      console.error('Error cargando eventos:', error);
    }
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
        <h1 className="text-4xl font-bold text-white mb-2">Historial de Validaciones</h1>
        <p className="text-dark-300">Consulta los escaneos de tus eventos OWN y RESALE</p>
      </div>

      {/* Filtros */}
      <div className="bg-dark-800 rounded-lg p-6 mb-6 border border-dark-700">
        <h2 className="text-xl font-semibold text-white mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              <option value="">Todos mis eventos</option>
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
              onChange={(e) => { setEventType(e.target.value as '' | 'OWN' | 'RESALE'); setPage(1); }}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              <option value="OWN">OWN (Propios)</option>
              <option value="RESALE">RESALE (Reventa)</option>
            </select>
          </div>
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
            <p>No se encontraron validaciones</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-700 border-b border-dark-600">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Tipo</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Evento</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Ticket</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Comprador</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Escaneos</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Último</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-dark-300 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {validations.map((validation) => (
                    <tr key={`${validation.type}-${validation.ticketId}`} className="hover:bg-dark-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          validation.type === 'OWN' 
                            ? 'bg-purple-900/50 text-purple-300' 
                            : 'bg-pink-900/50 text-pink-300'
                        }`}>
                          {validation.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{validation.event.title}</td>
                      <td className="px-4 py-3 text-sm text-dark-200">
                        {validation.type === 'OWN' ? `#${validation.ticketNumber}` : validation.ticketCode}
                      </td>
                      <td className="px-4 py-3 text-sm text-white">{validation.buyer?.name || 'N/A'}</td>
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
                          className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
                        >
                          Detalles
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 bg-dark-700 flex justify-between items-center">
                <div className="text-sm text-dark-300">Página {pagination.page} de {pagination.totalPages}</div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 bg-dark-600 text-white rounded-lg hover:bg-dark-500 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === pagination.totalPages}
                    className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Modal simplificado - similar al de Admin pero más compacto */}
      {selectedValidation && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-lg max-w-lg w-full border border-dark-700">
            <div className="p-6 border-b border-dark-700 flex justify-between">
              <h3 className="text-xl font-bold text-white">Detalles</h3>
              <button onClick={() => setSelectedValidation(null)} className="text-dark-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-dark-700 rounded p-3">
                <div className="text-dark-400 text-sm">Evento</div>
                <div className="text-white font-medium">{selectedValidation.event.title}</div>
              </div>
              {selectedValidation.buyer && (
                <div className="bg-dark-700 rounded p-3">
                  <div className="text-dark-400 text-sm">Comprador</div>
                  <div className="text-white">{selectedValidation.buyer.name}</div>
                  <div className="text-dark-300 text-sm">{selectedValidation.buyer.email}</div>
                </div>
              )}
              <div className="bg-dark-700 rounded p-3">
                <div className="text-dark-400 text-sm">Escaneos</div>
                <div className="text-cyan-400 font-bold text-2xl">{selectedValidation.scannedCount}</div>
              </div>
            </div>
            <div className="p-6">
              <button
                onClick={() => setSelectedValidation(null)}
                className="w-full py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
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
