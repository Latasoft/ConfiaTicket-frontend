// src/pages/AdminClaims.tsx
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  adminGetAllClaims,
  type Claim,
  type ClaimStatus,
  type ClaimPriority,
  getStatusLabel,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
  getReasonLabel,
} from '../services/claimsService';

export default function AdminClaims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Filtros
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | ''>('');
  const [priorityFilter, setPriorityFilter] = useState<ClaimPriority | ''>('');

  const loadClaims = useCallback(async () => {
    try {
      setLoading(true);
      const params: { status?: ClaimStatus; priority?: ClaimPriority } = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      
      const data = await adminGetAllClaims(params);
      setClaims(data);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Error al cargar reclamos');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, priorityFilter]);

  useEffect(() => {
    loadClaims();
  }, [loadClaims]);

  // Estadísticas rápidas
  const stats = {
    total: claims.length,
    pending: claims.filter((c) => c.status === 'PENDING').length,
    inReview: claims.filter((c) => c.status === 'IN_REVIEW').length,
    urgent: claims.filter((c) => c.priority === 'URGENT').length,
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-dark-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400"></div>
          <p className="mt-4 text-dark-200 text-lg">Cargando reclamos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 px-4 md:px-8 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Gestión de Reclamos
          </h1>
          <p className="text-dark-200 text-lg">
            Administra y responde a los reclamos de los compradores
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/20 border-2 border-red-400/50 text-red-200 px-6 py-4 rounded-xl font-medium">
            {error}
          </div>
        )}

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-2 border-cyan-400/50 rounded-2xl p-6 shadow-xl">
            <p className="text-sm text-cyan-300 mb-2 font-medium">Total Reclamos</p>
            <p className="text-4xl font-bold text-white">{stats.total}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border-2 border-amber-400/50 rounded-2xl p-6 shadow-xl">
            <p className="text-sm text-amber-300 mb-2 font-medium">Pendientes</p>
            <p className="text-4xl font-bold text-white">{stats.pending}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-2 border-blue-400/50 rounded-2xl p-6 shadow-xl">
            <p className="text-sm text-blue-300 mb-2 font-medium">En Revisión</p>
            <p className="text-4xl font-bold text-white">{stats.inReview}</p>
          </div>
          <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 border-2 border-red-400/50 rounded-2xl p-6 shadow-xl">
            <p className="text-sm text-red-300 mb-2 font-medium">Urgentes</p>
            <p className="text-4xl font-bold text-white">{stats.urgent}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl p-6 mb-8 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-dark-100 mb-2">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ClaimStatus | '')}
                className="w-full px-4 py-2.5 bg-dark-800 border-2 border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
              >
                <option value="" className="bg-dark-800">Todos los estados</option>
                <option value="PENDING" className="bg-dark-800">Pendiente</option>
                <option value="IN_REVIEW" className="bg-dark-800">En revisión</option>
                <option value="WAITING_INFO" className="bg-dark-800">Esperando información</option>
                <option value="RESOLVED" className="bg-dark-800">Resuelto</option>
                <option value="REJECTED" className="bg-dark-800">Rechazado</option>
                <option value="CANCELLED" className="bg-dark-800">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-100 mb-2">
                Prioridad
              </label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as ClaimPriority | '')}
                className="w-full px-4 py-2.5 bg-dark-800 border-2 border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-all"
              >
                <option value="" className="bg-dark-800">Todas las prioridades</option>
                <option value="LOW" className="bg-dark-800">Baja</option>
                <option value="MEDIUM" className="bg-dark-800">Media</option>
                <option value="HIGH" className="bg-dark-800">Alta</option>
                <option value="URGENT" className="bg-dark-800">Urgente</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setStatusFilter('');
                  setPriorityFilter('');
                }}
                className="px-4 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-bold rounded-lg transition w-full shadow-lg shadow-purple-500/30 transform hover:scale-105"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {/* Lista de reclamos */}
        {claims.length === 0 ? (
          <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl p-16 text-center shadow-xl">
            <svg
              className="mx-auto h-16 w-16 text-dark-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-xl font-bold text-white">
              No hay reclamos
            </h3>
            <p className="mt-2 text-dark-300 text-lg">
              No se encontraron reclamos con los filtros seleccionados
            </p>
          </div>
        ) : (
          <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl shadow-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-dark-800 border-b-2 border-dark-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase tracking-wider">
                      Comprador
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase tracking-wider">
                      Evento
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase tracking-wider">
                      Motivo
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase tracking-wider">
                      Prioridad
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {claims.map((claim) => (
                    <tr
                      key={claim.id}
                      className="hover:bg-dark-800/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/admin/reclamos/${claim.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-cyan-400">
                        #{claim.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-white">
                          {claim.buyer?.name}
                        </div>
                        <div className="text-sm text-dark-400">{claim.buyer?.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-white max-w-xs truncate font-medium">
                          {claim.reservation?.event.title}
                        </div>
                        <div className="text-sm text-dark-400">
                          {new Date(claim.reservation?.event.date || '').toLocaleDateString(
                            'es-CL'
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-white">
                          {getReasonLabel(claim.reason)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getStatusColor(
                            claim.status
                          )}`}
                        >
                          {getStatusLabel(claim.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${getPriorityColor(
                            claim.priority
                          )}`}
                        >
                          {getPriorityLabel(claim.priority)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                        {new Date(claim.createdAt).toLocaleDateString('es-CL')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/admin/reclamos/${claim.id}`);
                          }}
                          className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                        >
                          Ver detalle →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
