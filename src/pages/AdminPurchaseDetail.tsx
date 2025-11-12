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
      SUCCEEDED: { label: 'Completada', className: 'bg-green-500/20 text-green-300 border-2 border-green-400/50' },
      PENDING_PAYMENT: { label: 'Pendiente Pago', className: 'bg-amber-500/20 text-amber-300 border-2 border-amber-400/50' },
      EXPIRED: { label: 'Expirada', className: 'bg-gray-500/20 text-gray-300 border-2 border-gray-400/50' },
      FAILED: { label: 'Fallida', className: 'bg-red-500/20 text-red-300 border-2 border-red-400/50' },
      REFUNDED: { label: 'Reembolsada', className: 'bg-purple-500/20 text-purple-300 border-2 border-purple-400/50' },
    };

    const config = statusConfig[status] || { label: status, className: 'bg-gray-500/20 text-gray-300 border-2 border-gray-400/50' };
    return (
      <span className={`px-3 py-1 rounded-full text-sm font-bold ${config.className}`}>
        {config.label}
      </span>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-900 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center py-12 text-cyan-400 text-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            Cargando detalles...
          </div>
        </div>
      </div>
    );
  }

  if (error || !purchase) {
    return (
      <div className="min-h-screen bg-dark-900 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-red-500/20 border-2 border-red-400/50 text-red-300 px-6 py-4 rounded-2xl mb-6">
            {error || 'Compra no encontrada'}
          </div>
          <button
            onClick={() => navigate('/admin/compras')}
            className="text-cyan-400 hover:text-cyan-300 font-bold transition-colors"
          >
            ← Volver al listado
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/admin/compras')}
            className="text-cyan-400 hover:text-cyan-300 font-bold mb-4 inline-block transition-colors"
          >
            ← Volver al listado
          </button>
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-bold text-white">Compra #{purchase.id}</h1>
            {getStatusBadge(purchase.status)}
          </div>
        </div>

        {/* Informacion General */}
        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-2 border-cyan-400/50 rounded-2xl p-6 mb-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-6 text-white">Informacion General</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="text-sm text-dark-100 font-bold mb-1">Fecha de Compra</div>
              <div className="text-sm text-white">{formatDateTime(purchase.createdAt)}</div>
            </div>
            <div>
              <div className="text-sm text-dark-100 font-bold mb-1">Comprador</div>
              <div className="text-sm font-medium text-white">{purchase.buyer.name}</div>
              <div className="text-sm text-dark-400">{purchase.buyer.email}</div>
            </div>
            <div>
              <div className="text-sm text-dark-100 font-bold mb-1">Evento</div>
              <div className="text-sm font-medium text-white">{purchase.event.title}</div>
              <div className="text-sm text-dark-400">
                Fecha evento: {new Date(purchase.event.date).toLocaleDateString('es-CL')}
              </div>
            </div>
            <div>
              <div className="text-sm text-dark-100 font-bold mb-1">Organizador</div>
              <div className="text-sm font-medium text-white">{purchase.event.organizer.name}</div>
              <div className="text-sm text-dark-400">{purchase.event.organizer.email}</div>
            </div>
            <div>
              <div className="text-sm text-dark-100 font-bold mb-1">Tipo de Evento</div>
              <div className="text-sm text-white">
                {purchase.event.eventType === 'OWN' ? 'Propio' : 'Reventa'}
              </div>
            </div>
            <div>
              <div className="text-sm text-dark-100 font-bold mb-1">Cantidad</div>
              <div className="text-sm font-bold text-white">{purchase.quantity} tickets</div>
            </div>
            <div>
              <div className="text-sm text-dark-100 font-bold mb-1">Monto Total</div>
              <div className="text-2xl font-bold text-green-400">
                {formatAmount(purchase.amount)}
              </div>
            </div>
            {purchase.paidAt && (
              <div>
                <div className="text-sm text-dark-100 font-bold mb-1">Fecha de Pago</div>
                <div className="text-sm text-white">{formatDateTime(purchase.paidAt)}</div>
              </div>
            )}
          </div>
        </div>

        {/* Informacion de Pago */}
        {purchase.payment && (
          <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-2 border-purple-400/50 rounded-2xl p-6 mb-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-white">Informacion de Pago</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-dark-100 font-bold mb-1">Estado del Pago</div>
                <div className="text-sm font-medium text-white">{purchase.payment.status}</div>
              </div>
              <div>
                <div className="text-sm text-dark-100 font-bold mb-1">Monto</div>
                <div className="text-lg font-bold text-green-400">
                  {formatAmount(purchase.payment.amount)}
                </div>
              </div>
              {purchase.payment.transactionId && (
                <div>
                  <div className="text-sm text-dark-100 font-bold mb-1">ID de Transaccion</div>
                  <div className="text-sm font-medium font-mono text-cyan-400">
                    {purchase.payment.transactionId}
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm text-dark-100 font-bold mb-1">Fecha de Creacion</div>
                <div className="text-sm text-white">
                  {formatDateTime(purchase.payment.createdAt)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tickets Generados (OWN) */}
        {purchase.generatedTickets && purchase.generatedTickets.length > 0 && (
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border-2 border-green-400/50 rounded-2xl p-6 mb-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-white">Tickets Generados</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-dark-800 border-b-2 border-dark-700">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                      Numero
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                      Asiento
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                      Codigo QR
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                      Estado
                    </th>
                    {purchase.generatedTickets.some((t: any) => t.scannedAt) && (
                      <th className="px-6 py-4 text-left text-xs font-bold text-dark-100 uppercase">
                        Escaneado
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-dark-700">
                  {purchase.generatedTickets.map((ticket: any) => (
                    <tr key={ticket.id} className="hover:bg-dark-800/50 transition-colors">
                      <td className="px-6 py-4 text-sm font-bold text-white">Ticket #{ticket.ticketNumber}</td>
                      <td className="px-6 py-4 text-sm text-white">{ticket.seatNumber || 'N/A'}</td>
                      <td className="px-6 py-4 text-sm font-mono text-cyan-400">{ticket.qrCode}</td>
                      <td className="px-6 py-4 text-sm">
                        {ticket.scanned ? (
                          <span className="text-green-400 font-bold">Escaneado</span>
                        ) : (
                          <span className="text-dark-400">○ No escaneado</span>
                        )}
                      </td>
                      {purchase.generatedTickets.some((t: any) => t.scannedAt) && (
                        <td className="px-6 py-4 text-sm text-dark-300">
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
          <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-2 border-orange-400/50 rounded-2xl p-6 mb-8 shadow-xl">
            <h2 className="text-2xl font-bold mb-6 text-white">Ticket de Reventa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="text-sm text-dark-100 font-bold mb-1">ID del Ticket</div>
                <div className="text-sm font-medium text-white">#{purchase.ticket.id}</div>
              </div>
              <div>
                <div className="text-sm text-dark-100 font-bold mb-1">Informacion del Asiento</div>
                <div className="text-sm font-medium text-white">
                  {purchase.ticket.seatInfo || 'No especificado'}
                </div>
              </div>
              {purchase.ticket.qrCode && (
                <div>
                  <div className="text-sm text-dark-100 font-bold mb-1">Codigo QR</div>
                  <div className="text-sm font-medium font-mono text-cyan-400">
                    {purchase.ticket.qrCode}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Reclamo Asociado */}
        {purchase.claim && (
          <div className="bg-amber-500/20 border-2 border-amber-400/50 rounded-2xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-amber-400">Reclamo Asociado</h2>
            <div className="text-sm text-amber-300 mb-3">
              Existe un reclamo asociado a esta compra. ID: #{purchase.claim.id}
            </div>
            <a
              href={`/admin/reclamos/${purchase.claim.id}`}
              className="text-cyan-400 hover:text-cyan-300 text-sm font-bold transition-colors inline-block"
            >
              Ver detalles del reclamo →
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
