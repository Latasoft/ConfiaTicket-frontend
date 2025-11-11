// src/components/TicketsList.tsx
import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import api from '../services/api';
import { getSystemConfig } from '../services/configService';

interface GeneratedTicket {
  id: number;
  reservationId?: number; // Para tickets de grupos de compra
  ticketNumber: number;
  seatNumber: string | null;
  qrCode: string;
  scanned: boolean;
  scannedAt: string | null;
  section?: {
    id: number;
    name: string;
  } | null;
}

interface ReservationInfo {
  id: number;
  code: string;
  status: string;
  quantity: number;
  amount: number;
  paidAt: string;
  event: {
    title: string;
    date: string;
    location: string;
    eventType: string;
    price?: number;
  };
  section?: {
    id: number;
    name: string;
  } | null;
}

interface Props {
  reservationId?: number;
  purchaseGroupId?: string;
  showFullView?: boolean;
}

export default function TicketsList({ reservationId, purchaseGroupId, showFullView = false }: Props) {
  const [reservation, setReservation] = useState<ReservationInfo | null>(null);
  const [reservations, setReservations] = useState<ReservationInfo[]>([]);
  const [tickets, setTickets] = useState<GeneratedTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingTicket, setDownloadingTicket] = useState<number | null>(null);
  const [platformFeePercent, setPlatformFeePercent] = useState<string>('0');

  const isGroupPurchase = !!purchaseGroupId;

  // Cargar configuración de la plataforma
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getSystemConfig();
        // Convertir BPS a porcentaje (ej: 1000 BPS = 10%)
        const feeBps = config.platformFee?.feeBps || 0;
        const feePercent = (feeBps / 100).toFixed(2);
        setPlatformFeePercent(feePercent);
      } catch (err) {
        console.error('Error loading platform config:', err);
      }
    };
    loadConfig();
  }, []);

  useEffect(() => {
    loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId, purchaseGroupId]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      
      if (isGroupPurchase && purchaseGroupId) {
        // Cargar todas las reservaciones del grupo
        const response = await api.get(`/bookings/group/${purchaseGroupId}/tickets`);
        setReservations(response.data.reservations);
        setTickets(response.data.tickets);
        // Usar la primera reservación como principal para mostrar info del evento
        if (response.data.reservations.length > 0) {
          setReservation(response.data.reservations[0]);
        }
      } else if (reservationId) {
        // Cargar una sola reservación (flujo original)
        const response = await api.get(`/bookings/${reservationId}/tickets`);
        setReservation(response.data.reservation);
        setReservations([response.data.reservation]);
        setTickets(response.data.tickets);
      }
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Error al cargar los tickets');
    } finally {
      setLoading(false);
    }
  };

  const downloadTicket = async (ticket: GeneratedTicket) => {
    try {
      setDownloadingTicket(ticket.id);
      
      // Usar el reservationId del ticket si existe (compras múltiples), 
      // o el reservationId general (compra simple)
      const resId = ticket.reservationId || reservationId;
      
      if (!resId) {
        alert('Error: No se puede determinar la reservación del ticket');
        return;
      }
      
      const response = await api.get(
        `/bookings/${resId}/tickets/${ticket.id}/download`,
        { responseType: 'blob' }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${ticket.ticketNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error descargando ticket:', err);
      alert('Error al descargar el ticket');
    } finally {
      setDownloadingTicket(null);
    }
  };

  const downloadAllTickets = async () => {
    for (const ticket of tickets) {
      await downloadTicket(ticket);
      // Pequeña pausa entre descargas
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  if (!reservation) return null;

  return (
    <div className="space-y-6">
      {/* Header con información de la compra */}
      <div className="bg-white border rounded-lg p-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Pago Exitoso!</h2>
          <p className="text-gray-600">Tu compra ha sido confirmada</p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-600">Evento:</span>
            <span className="font-semibold">{reservation.event.title}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Fecha:</span>
            <span className="font-semibold">
              {new Date(reservation.event.date).toLocaleString('es-CL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Ubicación:</span>
            <span className="font-semibold">{reservation.event.location}</span>
          </div>
          
          {/* Mostrar información de compras múltiples */}
          {isGroupPurchase && reservations.length > 1 ? (
            <>
              <div className="border-t pt-2 mt-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">Detalles por sección:</p>
                {reservations.map((res, index) => {
                  const sectionName = res.section?.name || `Sección ${index + 1}`;
                  const feePercent = parseFloat(platformFeePercent);
                  const subtotalSection = Math.round(res.amount / (1 + feePercent / 100));
                  const commissionSection = res.amount - subtotalSection;
                  
                  return (
                    <div key={res.id} className="mb-3 p-2 bg-gray-100 rounded">
                      <div className="flex justify-between text-sm font-medium mb-1">
                        <span className="text-blue-600">{sectionName}</span>
                        <span className="text-gray-700">
                          {res.quantity} {res.quantity === 1 ? 'entrada' : 'entradas'}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Subtotal:</span>
                        <span>${subtotalSection.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Comisión ({platformFeePercent}%):</span>
                        <span>${commissionSection.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between text-sm font-medium mt-1">
                        <span>Total:</span>
                        <span>${res.amount.toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Total general */}
              <div className="border-t pt-3 mt-3 space-y-2">
                {(() => {
                  const totalAmount = reservations.reduce((sum, r) => sum + r.amount, 0);
                  const feePercent = parseFloat(platformFeePercent);
                  const subtotal = Math.round(totalAmount / (1 + feePercent / 100));
                  const commission = totalAmount - subtotal;
                  
                  return (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Subtotal total ({reservations.reduce((sum, r) => sum + r.quantity, 0)} entradas):</span>
                        <span className="font-medium">${subtotal.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Comisión total ({platformFeePercent}%):</span>
                        <span className="font-medium">${commission.toLocaleString('es-CL')}</span>
                      </div>
                      <div className="flex justify-between border-t pt-2">
                        <span className="text-gray-900 font-bold">Total Pagado:</span>
                        <span className="font-bold text-green-600 text-lg">
                          ${totalAmount.toLocaleString('es-CL')}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </>
          ) : (
            /* Compra simple */
            (() => {
              const feePercent = parseFloat(platformFeePercent);
              const subtotal = Math.round(reservation.amount / (1 + feePercent / 100));
              const commission = reservation.amount - subtotal;
              
              return (
                <div className="border-t pt-3 mt-3 space-y-2">
                  {reservation.section && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sección:</span>
                      <span className="font-medium text-blue-600">{reservation.section.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Cantidad:</span>
                    <span className="font-medium">
                      {reservation.quantity} {reservation.quantity === 1 ? 'entrada' : 'entradas'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${subtotal.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Comisión de servicio ({platformFeePercent}%):</span>
                    <span className="font-medium">${commission.toLocaleString('es-CL')}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-900 font-bold">Total Pagado:</span>
                    <span className="font-bold text-green-600 text-lg">
                      ${reservation.amount.toLocaleString('es-CL')}
                    </span>
                  </div>
                </div>
              );
            })()
          )}
        </div>

        {tickets.length > 1 && (
          <div className="mt-4">
            <button
              onClick={downloadAllTickets}
              className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar Todas las Entradas
            </button>
          </div>
        )}
      </div>

      {/* Lista de tickets individuales */}
      <div className="space-y-4">
        {!showFullView && <h3 className="text-lg font-semibold text-gray-900">Tus Entradas</h3>}
        <div className={showFullView ? "grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3" : "grid gap-4 md:grid-cols-2"}>
          {tickets.map((ticket) => (
            <div key={ticket.id} className={`bg-white border rounded-lg p-4 hover:shadow-md transition-shadow ${showFullView ? 'animate-fade-in' : ''}`}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="font-semibold text-gray-900">
                    Entrada #{ticket.ticketNumber}
                  </h4>
                  {ticket.section && (
                    <p className="text-sm font-medium text-blue-600">
                      {ticket.section.name}
                    </p>
                  )}
                  {ticket.seatNumber && (
                    <p className="text-sm text-gray-600">Asiento: {ticket.seatNumber}</p>
                  )}
                  {ticket.scanned && (
                    <span className="inline-flex mt-1 px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      ✓ Escaneado
                    </span>
                  )}
                </div>
                <div className="flex-shrink-0">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                </div>
              </div>

              {/* QR Code Preview */}
              <div className="bg-gray-50 rounded p-3 mb-3 text-center">
                <p className="text-xs text-gray-500 mb-2">Código QR</p>
                <div className="bg-white p-3 inline-block rounded shadow-sm">
                  <QRCodeSVG 
                    value={ticket.qrCode} 
                    size={96}
                    level="H"
                    includeMargin={false}
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">ID: {ticket.qrCode.slice(0, 8)}...</p>
              </div>

              <button
                onClick={() => downloadTicket(ticket)}
                disabled={downloadingTicket === ticket.id}
                className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {downloadingTicket === ticket.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Descargando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Descargar PDF
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Instrucciones Importantes:</h4>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Descarga y guarda cada entrada en tu dispositivo</li>
          <li>Presenta el código QR de cada entrada al ingresar al evento</li>
          <li>Cada entrada es individual e intransferible</li>
          <li>Se requiere documento de identidad para validar</li>
          <li>Puedes reimprimir las entradas accediendo a "Mis Tickets"</li>
        </ul>
      </div>
    </div>
  );
}
