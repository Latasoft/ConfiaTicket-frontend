// src/pages/AdminPurchaseDetail.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminGetPurchaseDetail } from '@/services/purchasesService';

export default function AdminPurchaseDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [purchase, setPurchase] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetchPurchaseDetail();
    }
  }, [id]);

  async function fetchPurchaseDetail() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetPurchaseDetail(Number(id));
      setPurchase(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || err.message || 'Error al cargar detalle');
    } finally {
      setLoading(false);
    }
  }

  function formatAmount(amount: number) {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
    }).format(amount);
  }

  function formatDateTime(date: string) {
    return new Date(date).toLocaleString('es-CL', {
      dateStyle: 'long',
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
      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.className}`}>
        {config.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="text-center py-12">Cargando detalles...</div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error || 'Compra no encontrada'}
        </div>
        <button
          onClick={() => navigate('/admin/compras')}
          className="text-blue-600 hover:text-blue-800"
        >
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/compras')}
          className="text-blue-600 hover:text-blue-800 mb-4 inline-block"
        >
          ← Volver al listado
        </button>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Compra #{purchase.id}</h1>
          {getStatusBadge(purchase.status)}
        </div>
      </div>

      {/* Informacion General */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Informacion General</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Fecha de Compra</div>
            <div className="text-sm font-medium">{formatDateTime(purchase.createdAt)}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Comprador</div>
            <div className="text-sm font-medium">{purchase.buyer.name}</div>
            <div className="text-sm text-gray-500">{purchase.buyer.email}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Evento</div>
            <div className="text-sm font-medium">{purchase.event.title}</div>
            <div className="text-sm text-gray-500">
              Fecha evento: {new Date(purchase.event.date).toLocaleDateString('es-CL')}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Organizador</div>
            <div className="text-sm font-medium">{purchase.event.organizer.name}</div>
            <div className="text-sm text-gray-500">{purchase.event.organizer.email}</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Tipo de Evento</div>
            <div className="text-sm font-medium">
              {purchase.event.eventType === 'OWN' ? 'Propio' : 'Reventa'}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Cantidad</div>
            <div className="text-sm font-medium">{purchase.quantity} tickets</div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Monto Total</div>
            <div className="text-lg font-bold text-gray-900">
              {formatAmount(purchase.amount)}
            </div>
          </div>
          {purchase.paidAt && (
            <div>
              <div className="text-sm text-gray-600">Fecha de Pago</div>
              <div className="text-sm font-medium">{formatDateTime(purchase.paidAt)}</div>
            </div>
          )}
        </div>
      </div>

      {/* Informacion de Pago */}
      {purchase.payment && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Informacion de Pago</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">Estado del Pago</div>
              <div className="text-sm font-medium">{purchase.payment.status}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Monto</div>
              <div className="text-sm font-medium">
                {formatAmount(purchase.payment.amount)}
              </div>
            </div>
            {purchase.payment.transactionId && (
              <div>
                <div className="text-sm text-gray-600">ID de Transaccion</div>
                <div className="text-sm font-medium font-mono">
                  {purchase.payment.transactionId}
                </div>
              </div>
            )}
            <div>
              <div className="text-sm text-gray-600">Fecha de Creacion</div>
              <div className="text-sm font-medium">
                {formatDateTime(purchase.payment.createdAt)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tickets Generados (OWN) */}
      {purchase.generatedTickets && purchase.generatedTickets.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Tickets Generados</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Numero
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Asiento
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Codigo QR
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Estado
                  </th>
                  {purchase.generatedTickets.some((t: any) => t.scannedAt) && (
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                      Escaneado
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {purchase.generatedTickets.map((ticket: any) => (
                  <tr key={ticket.id}>
                    <td className="px-4 py-2 text-sm">Ticket #{ticket.ticketNumber}</td>
                    <td className="px-4 py-2 text-sm">{ticket.seatNumber || 'N/A'}</td>
                    <td className="px-4 py-2 text-sm font-mono">{ticket.qrCode}</td>
                    <td className="px-4 py-2 text-sm">
                      {ticket.scanned ? (
                        <span className="text-green-600">Escaneado</span>
                      ) : (
                        <span className="text-gray-600">No escaneado</span>
                      )}
                    </td>
                    {purchase.generatedTickets.some((t: any) => t.scannedAt) && (
                      <td className="px-4 py-2 text-sm">
                        {ticket.scannedAt ? formatDateTime(ticket.scannedAt) : '-'}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Ticket Asociado (RESALE) */}
      {purchase.ticket && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Ticket de Reventa</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-gray-600">ID del Ticket</div>
              <div className="text-sm font-medium">#{purchase.ticket.id}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600">Informacion del Asiento</div>
              <div className="text-sm font-medium">
                {purchase.ticket.seatInfo || 'No especificado'}
              </div>
            </div>
            {purchase.ticket.qrCode && (
              <div>
                <div className="text-sm text-gray-600">Codigo QR</div>
                <div className="text-sm font-medium font-mono">
                  {purchase.ticket.qrCode}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reclamo Asociado */}
      {purchase.claim && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 text-yellow-900">Reclamo Asociado</h2>
          <div className="text-sm text-yellow-800">
            Existe un reclamo asociado a esta compra. ID: #{purchase.claim.id}
          </div>
          <a
            href={`/admin/reclamos/${purchase.claim.id}`}
            className="text-blue-600 hover:text-blue-800 text-sm mt-2 inline-block"
          >
            Ver detalles del reclamo →
          </a>
        </div>
      )}
    </div>
  );
}
