// src/components/TicketPurchaseFlow.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import UnifiedTicketSelector from './UnifiedTicketSelector';
import TicketsList from './TicketsList';
import api from '../services/api';
import { createReservation, initiatePayment } from '../services/ticketService';
import { confirmPaymentTest } from '../services/eventsService';
import { getSystemConfig } from '../services/configService';
import type { ResaleTicket, EventSection } from '../types/ticket';

interface SectionSelection {
  section: EventSection | ResaleTicket;
  quantity: number;
  seats: string[];
  isResale: boolean;
}

interface Props {
  eventId: number;
  eventType: 'RESALE' | 'OWN';
  eventPrice: number;
  onPurchaseComplete?: (reservationId: number) => void;
}

export default function TicketPurchaseFlow({ eventId, eventType, eventPrice, onPurchaseComplete }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<'select' | 'confirm' | 'processing' | 'success' | 'error'>('select');
  const [selections, setSelections] = useState<SectionSelection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentReservationId, setCurrentReservationId] = useState<number | null>(null);
  const [currentPurchaseGroupId, setCurrentPurchaseGroupId] = useState<string | null>(null);
  const [platformFeeBps, setPlatformFeeBps] = useState<number>(0);

  // Detectar si estamos en modo desarrollo
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

  // Cargar la configuración de la plataforma para obtener la comisión
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await getSystemConfig();
        setPlatformFeeBps(config.platformFee?.feeBps || 0);
      } catch (err) {
        console.error('❌ [ERROR] Error loading platform config:', err);
        // Si falla, usar 0 como default
        setPlatformFeeBps(0);
      }
    };
    loadConfig();
  }, []);

  // Redirigir a la página de tickets cuando el paso es 'success'
  useEffect(() => {
    if (step === 'success' && currentReservationId) {
      // Ya no redirigimos automáticamente, mostramos las entradas aquí
      // La redirección será manual cuando el usuario haga clic en "Ir a Mis Entradas"
    }
  }, [step, currentReservationId, navigate]);

  const handleSelectionsChange = (newSelections: SectionSelection[]) => {
    setSelections(newSelections);
  };

  const handleProceedToCheckout = async () => {
    // Validar autenticación ANTES de proceder
    if (!user) {
      setError('Debes iniciar sesión para comprar entradas');
      setStep('error'); // Cambiar a error en lugar de redirigir inmediatamente
      return;
    }

    if (selections.length === 0) {
      setError('Debes seleccionar al menos una entrada');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      if (eventType === 'RESALE') {
        // Para RESALE: comprar el ticket individual seleccionado
        const ticket = selections[0].section as ResaleTicket;
        const reservationData = await createReservation(eventId, 1, ticket.id);
        setCurrentReservationId(reservationData.id);
        setStep('confirm');
      } else {
        // Para OWN: enviar todas las secciones al backend
        const sectionsData = selections.map(sel => ({
          sectionId: (sel.section as EventSection).id,
          quantity: sel.quantity,
          seats: sel.seats.length > 0 ? sel.seats : undefined,
        }));

        const response = await api.post('/bookings/hold', {
          eventId,
          sections: sectionsData,
        });

        // El backend retorna purchaseGroupId y array de reservations
        const { purchaseGroupId, reservations } = response.data;
        
        // Guardar purchaseGroupId y el ID de la primera reserva
        setCurrentPurchaseGroupId(purchaseGroupId);
        setCurrentReservationId(reservations[0].id);
        setStep('confirm');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || 'Error al crear la reserva';
      
      // Mensajes de error más amigables
      let friendlyError = errorMsg;
      if (errorMsg.includes('SECTION_INSUFFICIENT_STOCK')) {
        const data = err.response?.data;
        friendlyError = `La sección "${data.sectionName}" no tiene suficientes entradas disponibles. Disponibles: ${data.available}, solicitadas: ${data.requested}`;
      } else if (errorMsg.includes('SEATS_ALREADY_RESERVED')) {
        const conflicts = err.response?.data?.conflictingSeats?.join(', ');
        friendlyError = `Los siguientes asientos ya están reservados: ${conflicts}`;
      } else if (errorMsg.includes('INSUFFICIENT_STOCK')) {
        friendlyError = `No hay suficientes entradas disponibles para este evento`;
      } else if (errorMsg.includes('EVENT_HAS_STARTED')) {
        friendlyError = 'Este evento ya ha comenzado';
      }
      
      setError(friendlyError);
      setStep('select');
    }
  };

  const handleConfirmPurchase = async () => {
    // Validar autenticación ANTES de proceder al pago
    if (!user) {
      setError('Debes iniciar sesión para completar el pago');
      const currentPath = window.location.pathname;
      navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
      return;
    }

    if (!currentReservationId) {
      setError('No hay reserva activa');
      setStep('error');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      // Iniciar pago con la reserva ya creada
      const paymentData = await initiatePayment(currentReservationId);

      // Redirigir a Transbank (o pasarela configurada)
      if (paymentData.url) {
        window.location.href = `${paymentData.url}?token_ws=${paymentData.token}`;
      } else {
        setStep('success');
        onPurchaseComplete?.(currentReservationId);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const errorMsg = err?.response?.data?.error || err?.response?.data?.userMessage || 'Error al procesar el pago';
      
      // Si es 401, redirigir a login
      if (status === 401) {
        setError('Tu sesión expiró. Por favor, inicia sesión nuevamente.');
        const currentPath = window.location.pathname;
        navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
        return;
      }
      
      setError(errorMsg);
      setStep('error');
    }
  };

  const handleTestPayment = async () => {
    if (!currentReservationId) {
      setError('No hay reserva activa');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      const result = await confirmPaymentTest(currentReservationId);
      
      if (result.ok) {
        setStep('success');
        onPurchaseComplete?.(currentReservationId);
      } else {
        setError(result.error || 'Error al confirmar pago de prueba');
        setStep('error');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Error al confirmar pago de prueba';
      
      if (errorMsg === 'TEST_PAYMENT_DISABLED') {
        setError('Los pagos de prueba están deshabilitados. Configura ALLOW_TEST_PAYMENTS en el backend.');
      } else {
        setError(errorMsg);
      }
      
      setStep('confirm'); // Volver a confirmación en caso de error
    }
  };

  const getTotalPrice = () => {
    if (selections.length > 0) {
      const total = selections.reduce((sum, s) => sum + (eventPrice * s.quantity), 0);
      return total;
    }
    return 0;
  };

  const getPlatformFee = () => {
    const subtotal = getTotalPrice();
    const fee = Math.round(subtotal * platformFeeBps / 10000);
    return fee;
  };

  const getGrandTotal = () => {
    const total = getTotalPrice() + getPlatformFee();
    return total;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Mensaje de error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 animate-fade-in">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Paso 1: Selección */}
      {step === 'select' && (
        <>
          <UnifiedTicketSelector
            eventId={eventId}
            eventType={eventType}
            onSelectionsChange={handleSelectionsChange}
          />

          {selections.length > 0 && (
            <div className="mt-6 flex justify-end animate-fade-in">
              <button
                onClick={handleProceedToCheckout}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 transform"
              >
                Continuar con la compra
              </button>
            </div>
          )}
        </>
      )}

      {/* Paso 2: Confirmación */}
      {step === 'confirm' && (
        <div className="bg-white border rounded-lg p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900">Confirmar Compra</h2>

          {eventType === 'RESALE' && selections[0] && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo de ticket:</span>
                  <span className="font-medium">Ticket Físico (Reventa)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Ubicación:</span>
                  <span className="font-medium">
                    Fila {(selections[0].section as ResaleTicket).row} - Asiento {(selections[0].section as ResaleTicket).seat}
                  </span>
                </div>
                {(selections[0].section as ResaleTicket).zone && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Zona:</span>
                    <span className="font-medium">{(selections[0].section as ResaleTicket).zone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Código:</span>
                  <span className="font-mono text-sm">{(selections[0].section as ResaleTicket).ticketCode}</span>
                </div>
              </div>

              {/* Desglose de costos para RESALE */}
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                  Resumen de Compra
                </h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Precio del ticket:</span>
                    <span className="font-medium text-gray-900">${getTotalPrice().toLocaleString('es-CL')}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Comisión de servicio ({(platformFeeBps / 100).toFixed(2)}%):</span>
                    <span className="font-medium text-gray-900">${getPlatformFee().toLocaleString('es-CL')}</span>
                  </div>
                  
                  <div className="border-t-2 border-gray-300 pt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total a pagar:</span>
                    <span className="font-bold text-lg text-green-600">${getGrandTotal().toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {eventType === 'OWN' && selections.length > 0 && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Tipo de tickets:</strong> PDF con código QR
                </p>
              </div>

              {selections.map(({ section, quantity, seats }, index) => (
                <div key={(section as EventSection).id} className="bg-gray-50 rounded-lg p-4 border-2 border-gray-200">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold text-lg text-gray-900">
                      {index + 1}. {(section as EventSection).name}
                    </h3>
                    <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                      {quantity} {quantity === 1 ? 'entrada' : 'entradas'}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Precio unitario:</span>
                      <span className="font-medium">${eventPrice.toLocaleString('es-CL')}</span>
                    </div>
                    
                    {seats.length > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Asientos:</span>
                        <span className="font-medium">{seats.join(', ')}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between pt-2 border-t">
                      <span className="text-gray-600">Subtotal:</span>
                      <span className="font-bold text-gray-900">
                        ${(eventPrice * quantity).toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Desglose de costos */}
              <div className="bg-white border-2 border-gray-300 rounded-lg p-4 space-y-3">
                <h4 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                  Resumen de Compra
                </h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal ({selections.reduce((sum, s) => sum + s.quantity, 0)} entradas):</span>
                    <span className="font-medium text-gray-900">${getTotalPrice().toLocaleString('es-CL')}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Comisión de servicio ({(platformFeeBps / 100).toFixed(2)}%):</span>
                    <span className="font-medium text-gray-900">${getPlatformFee().toLocaleString('es-CL')}</span>
                  </div>
                  
                  <div className="border-t-2 border-gray-300 pt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total a pagar:</span>
                    <span className="font-bold text-lg text-green-600">${getGrandTotal().toLocaleString('es-CL')}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              <strong>Nota:</strong>{' '}
              {eventType === 'RESALE'
                ? 'Recibirás el ticket original escaneado después del pago.'
                : 'Recibirás un PDF con código QR automáticamente después del pago.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <div className="flex gap-4">
              <button
                onClick={() => setStep('select')}
                className="flex-1 border-2 border-gray-300 hover:border-gray-400 text-gray-700 font-semibold py-3 rounded-lg transition"
              >
                ← Volver
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition shadow-md hover:shadow-lg"
              >
                Pagar ${getGrandTotal().toLocaleString('es-CL')}
              </button>
            </div>

            {/* Botón de pago de prueba (solo en desarrollo) */}
            {isDevelopment && (
              <button
                onClick={handleTestPayment}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 rounded-lg transition shadow-md hover:shadow-lg border-2 border-purple-400"
                title="Solo disponible en modo desarrollo"
              >
                🧪 Pago de Prueba (DEV)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Paso 3: Procesando */}
      {step === 'processing' && (
        <div className="bg-white border rounded-lg p-12 text-center animate-fade-in">
          <div className="relative inline-block mb-6">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-t-4 border-blue-600 mx-auto"></div>
            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border-4 border-blue-300 opacity-20"></div>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Procesando tu compra</h3>
          <p className="text-gray-600">Por favor espera un momento</p>
          <div className="mt-4 flex justify-center space-x-1">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}

      {/* Paso 4: Éxito - Mostrar tickets */}
      {/* Success - Modal grande con entradas */}
      {step === 'success' && currentReservationId && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 animate-fade-in"
          onClick={() => navigate('/mis-entradas')}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-y-auto animate-slide-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del modal */}
            <div className="sticky top-0 bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 rounded-t-2xl z-10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-white bg-opacity-20 rounded-full p-3">
                    <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">¡Compra exitosa!</h2>
                    <p className="text-green-100 text-sm">Tu pago ha sido procesado correctamente</p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/mis-entradas')}
                  className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                  title="Cerrar"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del modal */}
            <div className="p-6">
              {/* Lista de entradas */}
              <div className="bg-gray-50 rounded-xl p-6 mb-6">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  Tus Entradas
                </h3>
                <TicketsList 
                  reservationId={currentReservationId} 
                  purchaseGroupId={currentPurchaseGroupId || undefined}
                  showFullView={true} 
                />
              </div>

              {/* Botones de acción */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={() => navigate('/mis-entradas')}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  Ver Todas Mis Entradas
                </button>
                <button
                  onClick={() => navigate('/eventos')}
                  className="px-8 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Explorar Más Eventos
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {step === 'error' && error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 animate-slide-in shadow-lg">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0">
              <svg className="h-6 w-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-xl font-semibold text-red-800 mb-2">Error en la compra</h3>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
          
          {/* Si el error es por falta de autenticación, mostrar botón de login */}
          {!user && error.toLowerCase().includes('iniciar sesión') ? (
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const currentPath = window.location.pathname;
                  navigate(`/login?redirect=${encodeURIComponent(currentPath)}`);
                }}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 transform shadow-md hover:shadow-lg"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => setStep('select')}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 transform shadow-md hover:shadow-lg"
              >
                Volver
              </button>
            </div>
          ) : (
            <button
              onClick={() => setStep('select')}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 hover:scale-105 transform shadow-md hover:shadow-lg"
            >
              Intentar nuevamente
            </button>
          )}
        </div>
      )}
    </div>
  );
}
