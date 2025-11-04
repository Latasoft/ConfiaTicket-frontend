// src/pages/ResaleTicketValidation.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { validateResaleTicket, type ResaleValidationResponse } from '@/services/resaleValidationService';

export default function ResaleTicketValidation() {
  const { proxyQrCode } = useParams<{ proxyQrCode: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationData, setValidationData] = useState<ResaleValidationResponse | null>(null);

  useEffect(() => {
    if (!proxyQrCode) {
      setError('Código QR inválido');
      setLoading(false);
      return;
    }

    validateTicket();
  }, [proxyQrCode]);

  async function validateTicket() {
    if (!proxyQrCode) return;
    
    setLoading(true);
    setError(null);

    try {
      const data = await validateResaleTicket(proxyQrCode);
      setValidationData(data);
    } catch (err: any) {
      console.error('Error al validar ticket:', err);
      setError(
        err.response?.data?.message || 
        'Error al validar el ticket. Por favor, intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Validando ticket...</p>
        </div>
      </div>
    );
  }

  if (error || !validationData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-600 to-pink-700 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Ticket No Válido</h1>
            <p className="text-gray-600">{error}</p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-gray-600 text-white py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const { ticket, event, buyer, reservationCode, originalQrCode, scannedCount, lastScannedAt } = validationData;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden">
        {/* Header de validación exitosa */}
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 text-white text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2">TICKET VALIDADO</h1>
          <p className="text-green-100">El ticket ha sido registrado exitosamente</p>
        </div>

        {/* Información del evento */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{event.title}</h2>
          <div className="text-gray-600 space-y-1">
            <p className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {event.location}, {event.city} {event.commune}
            </p>
            <p className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {new Date(event.date).toLocaleDateString('es-CL', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
        </div>

        {/* Detalles del ticket */}
        <div className="p-6 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Detalles del Ticket</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Asiento</p>
              <p className="text-lg font-bold text-gray-900">Fila {ticket.row} - Asiento {ticket.seat}</p>
            </div>
            {ticket.zone && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Zona</p>
                <p className="text-lg font-bold text-gray-900">{ticket.zone}</p>
              </div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Titular</p>
              <p className="text-lg font-bold text-gray-900">{buyer?.name || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Código Reserva</p>
              <p className="text-lg font-bold text-gray-900">{reservationCode}</p>
            </div>
          </div>
        </div>

        {/* Sección del QR Original - PASO 2 */}
        <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-t-4 border-orange-400">
          <div className="text-center mb-4">
            <div className="inline-block bg-orange-100 px-4 py-2 rounded-full mb-3">
              <p className="text-orange-800 font-bold text-sm">PASO 2 - VALIDACIÓN EN EL EVENTO</p>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              Escanear Código Original
            </h3>
            <p className="text-gray-600 text-sm">
              Presenta este código QR al personal del evento para validar tu entrada
            </p>
          </div>

          {/* QR Code Original */}
          <div className="bg-white p-8 rounded-xl shadow-lg inline-block mx-auto">
            {originalQrCode ? (
              <QRCodeSVG
                value={originalQrCode}
                size={280}
                level="H"
                includeMargin={true}
              />
            ) : (
              <div className="w-72 h-72 bg-gray-100 flex items-center justify-center rounded-lg">
                <p className="text-gray-500">QR no disponible</p>
              </div>
            )}
          </div>

          <div className="mt-6 bg-orange-100 border-l-4 border-orange-500 p-4 rounded">
            <p className="text-orange-800 text-sm font-medium">
              El personal del evento debe escanear este código con su sistema de validación
            </p>
          </div>
        </div>

        {/* Información de escaneos */}
        <div className="p-6 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Escaneos registrados: <strong>{scannedCount}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Última validación: {new Date(lastScannedAt).toLocaleString('es-CL')}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-100 text-center text-xs text-gray-500">
          Ticket de reventa validado por ConfiaTicket<br />
          Este código ha sido verificado y registrado en nuestro sistema
        </div>
      </div>
    </div>
  );
}
