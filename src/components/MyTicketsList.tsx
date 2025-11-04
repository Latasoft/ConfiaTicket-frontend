// src/components/MyTicketsList.tsx
import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { getMyReservations, downloadTicketPdf } from '../services/ticketService';
import api from '../services/api';
import type { ReservationWithTicket } from '../types/ticket';
import CreateClaimModal from './CreateClaimModal';

interface GeneratedTicket {
  id: number;
  ticketNumber: number;
  seatNumber: string | null;
  qrCode: string;
  scanned: boolean;
  scannedAt: Date | null;
  pdfPath: string | null;
}

interface ReservationWithGenerated extends ReservationWithTicket {
  generatedTickets?: GeneratedTicket[];
}

export default function MyTicketsList() {
  const [reservations, setReservations] = useState<ReservationWithGenerated[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [expandedReservation, setExpandedReservation] = useState<number | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<ReservationWithGenerated | null>(null);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMyReservations();
      // Solo mostrar tickets pagados
      const paidReservations = data.filter((t) => t.status === 'PAID');
      
      // Cargar tickets generados para cada reserva
      const withGenerated = await Promise.all(
        paidReservations.map(async (reservation) => {
          try {
            const response = await api.get(`/bookings/${reservation.id}/tickets`);
            return { ...reservation, generatedTickets: response.data.tickets || [] };
          } catch (err) {
            console.error(`Error loading tickets for reservation ${reservation.id}:`, err);
            return { ...reservation, generatedTickets: [] };
          }
        })
      );
      
      setReservations(withGenerated);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar tus tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (reservation: ReservationWithGenerated, ticketId?: number) => {
    try {
      setDownloadingId(ticketId || reservation.id);
      
      if (ticketId) {
        // Descargar ticket individual generado
        const response = await api.get(`/bookings/${reservation.id}/tickets/${ticketId}/download`, {
          responseType: 'blob'
        });
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${ticketId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        // Descargar reserva completa (para RESALE)
        const blob = await downloadTicketPdf(reservation.id);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ticket-${reservation.code}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error al descargar ticket');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleOpenClaimModal = (reservation: ReservationWithGenerated) => {
    setSelectedReservation(reservation);
    setClaimModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-medium mb-2">Error</p>
          <p className="text-red-700">{error}</p>
          <button
            onClick={loadTickets}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-xl p-12 text-center">
          <svg className="w-24 h-24 mx-auto mb-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <p className="text-2xl font-bold text-gray-800 mb-2">No tienes entradas aún</p>
          <p className="text-gray-600 mb-6">Compra tu primera entrada y aparecerá aquí</p>
          <a
            href="/eventos"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg transition font-semibold shadow-md hover:shadow-lg transform hover:scale-105"
          >
            Explorar Eventos
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-lg">
        <h2 className="text-3xl font-bold mb-2">Mis Entradas</h2>
        <p className="text-blue-100">
          {reservations.length} {reservations.length === 1 ? 'compra realizada' : 'compras realizadas'}
        </p>
      </div>

      <div className="space-y-6">
        {reservations.map((reservation) => {
          const isOwnEvent = reservation.event?.eventType === 'OWN';
          const isExpanded = expandedReservation === reservation.id;
          const generatedTickets = reservation.generatedTickets || [];

          return (
            <div
              key={reservation.id}
              className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200"
            >
              {/* Header de la reserva */}
              <div
                className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 cursor-pointer hover:from-gray-100 hover:to-gray-150 transition-colors"
                onClick={() => setExpandedReservation(isExpanded ? null : reservation.id)}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          isOwnEvent
                            ? 'bg-green-100 text-green-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {isOwnEvent ? 'EVENTO PROPIO' : 'REVENTA'}
                      </span>
                      <span className="text-sm text-gray-500">Código: {reservation.code}</span>
                    </div>

                                        <h3 className="font-bold text-xl text-gray-900 mb-2">
                      {reservation.event?.title || `Evento #${reservation.eventId}`}
                    </h3>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      {reservation.event?.date && (
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {new Date(reservation.event.date).toLocaleDateString('es-CL', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                        </svg>
                        {generatedTickets.length || reservation.quantity} {generatedTickets.length === 1 || reservation.quantity === 1 ? 'entrada' : 'entradas'}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        ${new Intl.NumberFormat('es-CL').format(reservation.amount)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-gray-500">Total</div>
                      <div className="text-2xl font-bold text-gray-900">
                        ${new Intl.NumberFormat('es-CL').format(reservation.amount)}
                      </div>
                      {reservation.paidAt && (
                        <div className="text-xs text-gray-500 mt-1">
                          Pagado: {new Date(reservation.paidAt).toLocaleDateString('es-CL')}
                        </div>
                      )}
                    </div>

                    <button
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                      aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                    >
                      <svg
                        className={`w-5 h-5 text-gray-700 transition-transform ${
                          isExpanded ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Contenido expandible */}
              {isExpanded && (
                <div className="p-6 border-t-2 border-gray-100 bg-white">
                  {generatedTickets.length > 0 && (
                    // Mostrar tickets generados individuales
                    <div className="mb-6">
                      <h4 className="font-bold text-lg text-gray-900 mb-4">
                        {isOwnEvent ? 'Entradas Individuales' : 'Tus Entradas de Reventa'}
                      </h4>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {generatedTickets.map((ticket) => (
                          <div key={ticket.id} className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="font-semibold text-gray-900">Entrada #{ticket.ticketNumber}</p>
                                {ticket.seatNumber && (
                                  <p className="text-sm text-gray-600">Asiento: {ticket.seatNumber}</p>
                                )}
                              </div>
                              {ticket.scanned && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  ✓ Escaneado
                                </span>
                              )}
                            </div>

                            {/* QR Code */}
                            <div className="bg-gray-50 rounded-lg p-3 mb-3 text-center">
                              <div className="bg-white p-2 inline-block rounded shadow-sm">
                                <QRCodeSVG 
                                  value={ticket.qrCode} 
                                  size={120}
                                  level="H"
                                  includeMargin={false}
                                />
                              </div>
                              <p className="text-xs text-gray-400 mt-2">ID: {ticket.qrCode.slice(0, 8)}...</p>
                            </div>

                            <button
                              onClick={() => handleDownload(reservation, ticket.id)}
                              disabled={downloadingId === ticket.id}
                              className="w-full py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all hover:scale-105 transform disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
                            >
                              {downloadingId === ticket.id ? (
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
                  )}

                  {!isOwnEvent && reservation.ticket && (
                    // Información del ticket original de reventa
                    <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                      <h4 className="font-bold text-lg text-purple-900 mb-4">Información del Ticket Original</h4>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-1">Ubicación Original</p>
                          <p className="font-semibold text-gray-900">
                            Fila {reservation.ticket.row} - Asiento {reservation.ticket.seat}
                          </p>
                          {reservation.ticket.zone && (
                            <>
                              <p className="text-sm text-gray-600 mt-2 mb-1">Zona</p>
                              <p className="font-semibold text-gray-900">{reservation.ticket.zone}</p>
                            </>
                          )}
                          {reservation.ticket.level && (
                            <>
                              <p className="text-sm text-gray-600 mt-2 mb-1">Nivel</p>
                              <p className="font-semibold text-gray-900">{reservation.ticket.level}</p>
                            </>
                          )}
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="text-center p-4 bg-white rounded-lg border border-purple-300">
                            <p className="text-xs text-gray-600 mb-2">Código Original</p>
                            <p className="font-mono text-sm font-bold text-purple-900">{reservation.ticket.ticketCode}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {generatedTickets.length === 0 && !reservation.ticket && (
                    <div className="text-center py-8 text-gray-500">
                      <p>No hay información de entradas disponible</p>
                    </div>
                  )}

                  {/* Botón de Crear Reclamo */}
                  <div className="mt-6 pt-6 border-t-2 border-gray-100">
                    <button
                      onClick={() => handleOpenClaimModal(reservation)}
                      className="w-full md:w-auto px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-all transform hover:scale-105 flex items-center justify-center gap-2 font-medium shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Crear Reclamo
                    </button>
                    <p className="text-xs text-gray-500 mt-2 text-center md:text-left">
                      ¿Tienes algún problema con tu compra? Crea un reclamo y te ayudaremos.
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal de Crear Reclamo */}
      {claimModalOpen && selectedReservation && (
        <CreateClaimModal
          reservationId={selectedReservation.id}
          eventTitle={selectedReservation.event?.title || `Evento #${selectedReservation.eventId}`}
          onClose={() => {
            setClaimModalOpen(false);
            setSelectedReservation(null);
          }}
        />
      )}
    </div>
  );
}
