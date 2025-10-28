// src/components/ResaleTicketSelector.tsx
import { useState, useEffect } from 'react';
import type { ResaleTicket } from '../types/ticket';
import { getResaleTickets } from '../services/ticketService';

interface Props {
  eventId: number;
  onSelectTicket: (ticket: ResaleTicket) => void;
  selectedTicketId: number | null;
}

export default function ResaleTicketSelector({ eventId, onSelectTicket, selectedTicketId }: Props) {
  const [tickets, setTickets] = useState<ResaleTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<{ url: string; ticket: ResaleTicket } | null>(null);

  useEffect(() => {
    loadTickets();
  }, [eventId]);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getResaleTickets(eventId);
      setTickets(data.filter((t) => !t.sold)); // Solo mostrar disponibles
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar tickets');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewImage = (ticket: ResaleTicket) => {
    // En producción, necesitarías un endpoint protegido para la imagen
    const imageUrl = `${import.meta.env.VITE_API_URL}/api/tickets/resale/${ticket.id}/image`;
    setImagePreview({ url: imageUrl, ticket });
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadTickets}
          className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800 font-medium">No hay tickets disponibles</p>
        <p className="text-yellow-700 text-sm mt-1">Todos los tickets han sido vendidos</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 font-medium">🎫 Tickets Físicos Disponibles</p>
        <p className="text-blue-700 text-sm mt-1">
          Estos son tickets originales escaneados. Selecciona el que deseas comprar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tickets.map((ticket) => (
          <div
            key={ticket.id}
            onClick={() => onSelectTicket(ticket)}
            className={`
              border-2 rounded-lg p-4 cursor-pointer transition-all
              ${
                selectedTicketId === ticket.id
                  ? 'border-blue-600 bg-blue-50 shadow-md'
                  : 'border-gray-200 hover:border-blue-400 hover:shadow'
              }
            `}
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-semibold text-lg text-gray-800">
                  Fila {ticket.row} - Asiento {ticket.seat}
                </p>
                {ticket.zone && (
                  <p className="text-sm text-gray-600">Zona: {ticket.zone}</p>
                )}
                {ticket.level && (
                  <p className="text-sm text-gray-600">Nivel: {ticket.level}</p>
                )}
              </div>
              {selectedTicketId === ticket.id && (
                <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                  Seleccionado
                </span>
              )}
            </div>

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-500">
                Código: {ticket.ticketCode}
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviewImage(ticket);
                }}
                className="text-sm text-blue-600 hover:text-blue-700 underline"
              >
                Ver ticket
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de Preview */}
      {imagePreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4"
          onClick={() => setImagePreview(null)}
        >
          <div
            className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-lg">
                  Ticket - Fila {imagePreview.ticket.row}, Asiento {imagePreview.ticket.seat}
                </h3>
                <p className="text-sm text-gray-600">Código: {imagePreview.ticket.ticketCode}</p>
              </div>
              <button
                onClick={() => setImagePreview(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <img
                src={imagePreview.url}
                alt="Ticket Preview"
                className="w-full h-auto rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/ticket-placeholder.png';
                }}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Esta es una vista previa del ticket original que recibirás
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
