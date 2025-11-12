// src/pages/AdminPurchases.tsx
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminListPurchases } from '@/services/purchasesService';

export default function AdminPurchases() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [metrics, setMetrics] = useState({
    totalAmount: 0,
    totalPurchases: 0,
    successfulPurchases: 0,
  });

  // Filtros
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');
  const [eventTypeFilter, setEventTypeFilter] = useState(searchParams.get('eventType') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const pageSize = 20;

  useEffect(() => {
    fetchPurchases();
  }, [page, searchParams]);

  async function fetchPurchases() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListPurchases({
        page,
        pageSize,
        q: searchParams.get('q') || undefined,
        status: searchParams.get('status') || undefined,
        eventType: searchParams.get('eventType') || undefined,
      });

      setPurchases(data.items);
      setTotal(data.total);
      setTotalPages(data.totalPages);
      setMetrics(data.metrics);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Error al cargar compras');
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (statusFilter) params.set('status', statusFilter);
    if (eventTypeFilter) params.set('eventType', eventTypeFilter);
    params.set('page', '1');
    setSearchParams(params);
    setPage(1);
  }

  function clearFilters() {
    setSearchQuery('');
    setStatusFilter('');
    setEventTypeFilter('');
    setSearchParams({});
    setPage(1);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams);
    params.set('page', newPage.toString());
    setSearchParams(params);
    setPage(newPage);
  }

  function formatAmount(amount: number) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString('es-CL', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  }

  function getStatusBadge(status: string) {
    const statusConfig: Record<string, { label: string; className: string }> = {
      SUCCEEDED: { label: 'Completada', className: 'bg-green-500/20 text-green-300 border-green-400/50' },
      PENDING_PAYMENT: { label: 'Pendiente Pago', className: 'bg-amber-500/20 text-amber-300 border-amber-400/50' },
      EXPIRED: { label: 'Expirada', className: 'bg-gray-500/20 text-gray-300 border-gray-400/50' },
      FAILED: { label: 'Fallida', className: 'bg-red-500/20 text-red-300 border-red-400/50' },
      REFUNDED: { label: 'Reembolsada', className: 'bg-purple-500/20 text-purple-300 border-purple-400/50' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-dark-700 text-dark-200 border-dark-600' };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${config.className}`}>
        {config.label}
      </span>
    );
  }

  function getEventTypeBadge(eventType: string) {
    const typeConfig: Record<string, { label: string; className: string }> = {
      OWN: { label: 'Propio', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/50' },
      RESALE: { label: 'Reventa', className: 'bg-orange-500/20 text-orange-300 border-orange-400/50' },
    };

    const config = typeConfig[eventType] || { label: eventType, className: 'bg-dark-700 text-dark-200 border-dark-600' };
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${config.className}`}>
        {config.label}
      </span>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8">Panel de Compras</h1>

        {/* Metricas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-2 border-green-400/50 p-6 rounded-2xl shadow-xl">
            <div className="text-sm text-green-300 font-medium mb-1">Total Recaudado</div>
            <div className="text-3xl font-bold text-white">
              {formatAmount(metrics.totalAmount)}
            </div>
          </div>
          <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-2 border-cyan-400/50 p-6 rounded-2xl shadow-xl">
            <div className="text-sm text-cyan-300 font-medium mb-1">Compras Exitosas</div>
            <div className="text-3xl font-bold text-white">
              {metrics.successfulPurchases}
            </div>
          </div>
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-2 border-purple-400/50 p-6 rounded-2xl shadow-xl">
            <div className="text-sm text-purple-300 font-medium mb-1">Total Compras</div>
            <div className="text-3xl font-bold text-white">
              {metrics.totalPurchases}
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-dark-850 border-2 border-dark-700 p-6 rounded-2xl shadow-xl mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-dark-100 mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="ID, email o nombre..."
                className="w-full px-4 py-2.5 bg-dark-800 border-2 border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-100 mb-2">
                Estado
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-800 border-2 border-dark-600 rounded-lg text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              >
                <option value="" className="bg-dark-800">Todos</option>
                <option value="SUCCEEDED" className="bg-dark-800">Completada</option>
                <option value="PENDING_PAYMENT" className="bg-dark-800">Pendiente Pago</option>
                <option value="EXPIRED" className="bg-dark-800">Expirada</option>
                <option value="FAILED" className="bg-dark-800">Fallida</option>
                <option value="REFUNDED" className="bg-dark-800">Reembolsada</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-dark-100 mb-2">
                Tipo Evento
              </label>
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="w-full px-4 py-2.5 bg-dark-800 border-2 border-dark-600 rounded-lg text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              >
                <option value="" className="bg-dark-800">Todos</option>
                <option value="OWN" className="bg-dark-800">Propio</option>
                <option value="RESALE" className="bg-dark-800">Reventa</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button
              onClick={applyFilters}
              className="px-6 py-2.5 bg-cyan-500 text-white font-bold rounded-lg hover:bg-cyan-600 shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105"
            >
              🔍 Aplicar Filtros
            </button>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 bg-purple-500 text-white font-bold rounded-lg hover:bg-purple-600 shadow-lg shadow-purple-500/30 transition-all transform hover:scale-105"
            >
              Limpiar
            </button>
            <button
              onClick={fetchPurchases}
              className="px-6 py-2.5 bg-dark-700 border-2 border-dark-600 text-white font-bold rounded-lg hover:bg-dark-600 transition-all ml-auto"
            >
              ↻ Actualizar
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border-2 border-red-400/50 text-red-200 px-6 py-4 rounded-xl mb-6 font-medium">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="text-center py-16 text-dark-200">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mb-4"></div>
            <p className="text-lg">Cargando compras...</p>
          </div>
        )}

        {/* Tabla */}
        {!loading && purchases.length === 0 && (
          <div className="text-center py-16 bg-dark-850 border-2 border-dark-700 rounded-2xl">
            <p className="text-xl text-dark-300">No se encontraron compras</p>
          </div>
        )}

        {!loading && purchases.length > 0 && (
          <>
            <div className="bg-dark-850 border-2 border-dark-700 rounded-2xl shadow-2xl overflow-hidden mb-8">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="bg-dark-800 border-b-2 border-dark-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                        ID
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                        Comprador
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                        Evento
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                        Tipo
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                        Cantidad
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                        Monto
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                        Fecha
                      </th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-700">
                    {purchases.map((purchase) => (
                      <tr key={purchase.id} className="hover:bg-dark-800/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold font-mono text-cyan-400">
                          #{purchase.id}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-white">
                            {purchase.buyer.name}
                          </div>
                          <div className="text-sm text-dark-400">
                            {purchase.buyer.email}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-white font-medium">
                            {purchase.event.title}
                          </div>
                          <div className="text-sm text-dark-400">
                            {new Date(purchase.event.date).toLocaleDateString('es-CL')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getEventTypeBadge(purchase.event.eventType)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-bold">
                          {purchase.quantity} tickets
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-400 text-lg">
                          {formatAmount(purchase.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(purchase.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                          {formatDate(purchase.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <a
                            href={`/admin/compras/${purchase.id}`}
                            className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
                          >
                            Ver Detalle →
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginacion */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between bg-dark-850 border-2 border-dark-700 rounded-2xl p-6">
                <div className="text-sm text-dark-200">
                  Mostrando <span className="font-bold text-white">{(page - 1) * pageSize + 1}</span> a <span className="font-bold text-white">{Math.min(page * pageSize, total)}</span> de <span className="font-bold text-white">{total}</span> compras
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                    className="px-4 py-2 border-2 border-dark-600 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-dark-700 text-white font-medium transition-all"
                  >
                    ← Anterior
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5) {
                      if (page > 3) {
                        pageNum = page - 2 + i;
                      }
                      if (pageNum > totalPages) {
                        pageNum = totalPages - 4 + i;
                      }
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-4 py-2 border-2 rounded-lg font-bold transition-all ${
                          page === pageNum
                            ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/30'
                            : 'border-dark-600 text-white hover:bg-dark-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                    className="px-4 py-2 border-2 border-dark-600 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-dark-700 text-white font-medium transition-all"
                  >
                    Siguiente →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
