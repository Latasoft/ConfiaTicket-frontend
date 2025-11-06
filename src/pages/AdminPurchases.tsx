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
      SUCCEEDED: { label: 'Completada', className: 'bg-green-100 text-green-800' },
      PENDING_PAYMENT: { label: 'Pendiente Pago', className: 'bg-yellow-100 text-yellow-800' },
      EXPIRED: { label: 'Expirada', className: 'bg-gray-100 text-gray-800' },
      FAILED: { label: 'Fallida', className: 'bg-red-100 text-red-800' },
      REFUNDED: { label: 'Reembolsada', className: 'bg-purple-100 text-purple-800' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  }

  function getEventTypeBadge(eventType: string) {
    const typeConfig: Record<string, { label: string; className: string }> = {
      OWN: { label: 'Propio', className: 'bg-blue-100 text-blue-800' },
      RESALE: { label: 'Reventa', className: 'bg-orange-100 text-orange-800' },
    };

    const config = typeConfig[eventType] || { label: eventType, className: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Panel de Compras</h1>

      {/* Metricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Recaudado</div>
          <div className="text-2xl font-bold text-gray-900">
            {formatAmount(metrics.totalAmount)}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Compras Exitosas</div>
          <div className="text-2xl font-bold text-green-600">
            {metrics.successfulPurchases}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Total Compras</div>
          <div className="text-2xl font-bold text-gray-900">
            {metrics.totalPurchases}
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Buscar
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              placeholder="ID, email o nombre..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              <option value="SUCCEEDED">Completada</option>
              <option value="PENDING_PAYMENT">Pendiente Pago</option>
              <option value="EXPIRED">Expirada</option>
              <option value="FAILED">Fallida</option>
              <option value="REFUNDED">Reembolsada</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo Evento
            </label>
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos</option>
              <option value="OWN">Propio</option>
              <option value="RESALE">Reventa</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={applyFilters}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Aplicar Filtros
          </button>
          <button
            onClick={clearFilters}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
          >
            Limpiar
          </button>
          <button
            onClick={fetchPurchases}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 ml-auto"
          >
            Actualizar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-8 text-gray-600">
          Cargando compras...
        </div>
      )}

      {/* Tabla */}
      {!loading && purchases.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          No se encontraron compras
        </div>
      )}

      {!loading && purchases.length > 0 && (
        <>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Comprador
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Evento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cantidad
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{purchase.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {purchase.buyer.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {purchase.buyer.email}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {purchase.event.title}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(purchase.event.date).toLocaleDateString('es-CL')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getEventTypeBadge(purchase.event.eventType)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {purchase.quantity} tickets
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatAmount(purchase.amount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(purchase.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(purchase.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <a
                          href={`/admin/compras/${purchase.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Ver Detalle
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
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Mostrando {(page - 1) * pageSize + 1} a {Math.min(page * pageSize, total)} de {total} compras
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
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
                      className={`px-3 py-2 border rounded-md ${
                        page === pageNum
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
