// src/components/TicketDownload.tsx
import { useState, useEffect } from 'react';
import api from '../services/api';

interface Props {
  reservationId: number;
}

export default function TicketDownload({ reservationId }: Props) {
  const [reservation, setReservation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadReservation();
  }, [reservationId]);

  const loadReservation = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/bookings/${reservationId}`);
      setReservation(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar los tickets');
    } finally {
      setLoading(false);
    }
  };

  const downloadTicket = async () => {
    try {
      const response = await api.get(`/bookings/${reservationId}/ticket`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ticket-${reservation.code}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Error descargando ticket:', err);
      alert('Error al descargar el ticket');
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
    <div className="bg-white border rounded-lg p-6 space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">¡Pago Exitoso!</h2>
        <p className="text-gray-600">Tu compra ha sido confirmada</p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Código de reserva:</span>
            <span className="font-mono font-semibold">{reservation.code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Cantidad:</span>
            <span className="font-semibold">{reservation.quantity} {reservation.quantity === 1 ? 'entrada' : 'entradas'}</span>
          </div>
          {reservation.seatAssignment && (
            <div className="flex justify-between">
              <span className="text-gray-600">Asientos:</span>
              <span className="font-semibold">{reservation.seatAssignment}</span>
            </div>
          )}
          <div className="flex justify-between border-t pt-2">
            <span className="text-gray-600">Total pagado:</span>
            <span className="font-bold text-lg">${reservation.amount?.toLocaleString('es-CL')}</span>
          </div>
        </div>
      </div>

      {reservation.generatedPdfPath && (
        <div className="space-y-3">
          <button
            onClick={downloadTicket}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-lg transition flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Descargar {reservation.quantity > 1 ? 'Tickets' : 'Ticket'} (PDF)
          </button>

          {reservation.qrCode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
              <p className="text-sm text-blue-800 mb-3">
                <strong>Código QR:</strong>
              </p>
              <div className="bg-white p-4 rounded-lg inline-block">
                <img 
                  src={`data:image/png;base64,${reservation.qrCode}`} 
                  alt="QR Code" 
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <p className="text-xs text-blue-700 mt-3">
                Presenta este código en el evento
              </p>
            </div>
          )}
        </div>
      )}

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-sm text-yellow-800">
          <strong>Importante:</strong> También hemos enviado tus tickets al correo electrónico registrado.
          Revisa tu bandeja de entrada y spam.
        </p>
      </div>
    </div>
  );
}
