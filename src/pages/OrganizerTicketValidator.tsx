// src/pages/OrganizerTicketValidator.tsx
import { useState, useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { 
  validateTicket, 
  getEventStats,
  type ValidateTicketResponse,
  type ValidationStats 
} from '@/services/organizerTicketValidationService';
import { listMyEvents, type OrganizerEvent } from '@/services/organizerEventsService';
import { getFriendlyErrorMessage } from '@/utils/errorMessages';
import { 
  getResaleEventStats, 
  type ResaleEventStats 
} from '@/services/resaleTicketStatsService';

type ScanResult = ValidateTicketResponse & {
  timestamp: string;
};

export default function OrganizerTicketValidator() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<OrganizerEvent | null>(null);
  const [stats, setStats] = useState<ValidationStats | null>(null);
  const [resaleStats, setResaleStats] = useState<ResaleEventStats | null>(null);
  
  const [scanMode, setScanMode] = useState<'camera' | 'manual' | 'image'>('manual');
  const [manualCode, setManualCode] = useState('');
  
  const [scanning, setScanning] = useState(false);
  const [validating, setValidating] = useState(false);
  
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [scanningImage, setScanningImage] = useState(false);
  
  const [lastResult, setLastResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Cargar eventos del organizador
  useEffect(() => {
    loadEvents();
  }, []);

  // Cargar estadísticas cuando se selecciona un evento
  useEffect(() => {
    if (selectedEventId) {
      const event = events.find(e => e.id === selectedEventId);
      setSelectedEvent(event || null);
      loadStats();
    }
  }, [selectedEventId, events]);

  async function loadEvents() {
    try {
      const response = await listMyEvents({ status: 'approved', pageSize: 100 });
      setEvents(response.items);
      if (response.items.length > 0 && !selectedEventId) {
        setSelectedEventId(response.items[0].id);
        setSelectedEvent(response.items[0]);
      }
    } catch (error) {
      console.error('Error al cargar eventos:', error);
    }
  }

  async function loadStats() {
    if (!selectedEventId || !selectedEvent) return;
    
    try {
      // Cargar estadísticas según el tipo de evento
      if (selectedEvent.eventType === 'RESALE') {
        const data = await getResaleEventStats(selectedEventId);
        setResaleStats(data);
        setStats(null); // Limpiar stats de OWN
      } else {
        const data = await getEventStats(selectedEventId);
        setStats(data);
        setResaleStats(null); // Limpiar stats de RESALE
      }
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  }

  async function handleValidate(qrCode: string) {
    if (!qrCode.trim()) return;
    
    setValidating(true);
    try {
      // Pasar el eventId seleccionado para validar que el ticket pertenece a ese evento
      const result = await validateTicket(qrCode, selectedEventId || undefined);
      
      const scanResult: ScanResult = {
        ...result,
        timestamp: new Date().toISOString(),
      };
      
      setLastResult(scanResult);
      setScanHistory(prev => [scanResult, ...prev.slice(0, 19)]);
      
      // Recargar estadísticas
      if (selectedEventId) {
        await loadStats();
      }
      
      // Limpiar input manual
      setManualCode('');
      
    } catch (error: any) {
      const message = getFriendlyErrorMessage(error, 'No se pudo validar el ticket');
      const errorResult: ScanResult = {
        valid: false,
        error: message,
        reason: error?.response?.data?.reason,
        timestamp: new Date().toISOString(),
      };
      setLastResult(errorResult);
      setScanHistory(prev => [errorResult, ...prev.slice(0, 19)]);
    } finally {
      setValidating(false);
    }
  }

  async function startCameraScanner() {
    try {
      setCameraError(null);
      
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('qr-reader');
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        async (decodedText) => {
          if (!validating) {
            await handleValidate(decodedText);
          }
        },
        undefined
      );
      
      setScanning(true);
    } catch (error: any) {
      console.error('Error al iniciar cámara:', error);
      const message = getFriendlyErrorMessage(error, 'No se pudo acceder a la cámara. Verifica los permisos o usa el modo manual');
      setCameraError(message);
      setScanning(false);
    }
  }

  async function stopCameraScanner() {
    try {
      if (scannerRef.current) {
        await scannerRef.current.stop();
      }
      setScanning(false);
    } catch (error) {
      console.error('Error al detener cámara:', error);
    }
  }

  async function handleImageScan(file: File) {
    setScanningImage(true);
    
    try {
      // Para escanear archivos, necesitamos un scanner temporal
      // No requiere un elemento HTML en el DOM
      let scanner = scannerRef.current;
      
      // Si no existe el scanner o el elemento qr-reader no está en el DOM, crear uno temporal
      if (!scanner || scanMode !== 'camera') {
        // Crear un div temporal oculto para el scanner
        const tempDiv = document.createElement('div');
        tempDiv.id = 'qr-reader-temp';
        tempDiv.style.display = 'none';
        document.body.appendChild(tempDiv);
        
        scanner = new Html5Qrcode('qr-reader-temp');
      }
      
      const decodedText = await scanner.scanFile(file, true);
      console.log('QR detectado en imagen:', decodedText);
      
      // Limpiar el div temporal si fue creado
      const tempDiv = document.getElementById('qr-reader-temp');
      if (tempDiv) {
        tempDiv.remove();
      }
      
      // Validar el código detectado
      await handleValidate(decodedText);
      
    } catch (error) {
      console.error('Error al escanear imagen:', error);
      
      // Limpiar el div temporal si existe
      const tempDiv = document.getElementById('qr-reader-temp');
      if (tempDiv) {
        tempDiv.remove();
      }
      
      const errorResult: ScanResult = {
        valid: false,
        error: 'No se pudo detectar un código QR en la imagen',
        timestamp: new Date().toISOString(),
      };
      setLastResult(errorResult);
      setScanHistory(prev => [errorResult, ...prev.slice(0, 19)]);
    } finally {
      // Limpiar imagen después de procesar (éxito o error)
      setSelectedImage(null);
      setScanningImage(false);
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      // No escanear automáticamente, esperar a que el usuario presione el botón
    }
    // Resetear el input para permitir seleccionar el mismo archivo nuevamente
    e.target.value = '';
  }

  useEffect(() => {
    return () => {
      // Cleanup: detener el scanner solo si existe y está corriendo
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2) { // 2 = Html5QrcodeScannerState.SCANNING
          scannerRef.current.stop().catch(console.error);
        }
      }
    };
  }, []);

  function formatTimestamp(iso: string) {
    const date = new Date(iso);
    return date.toLocaleTimeString('es-CL', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Validar Tickets</h1>
        <p className="text-gray-600 mt-2">Escanea los códigos QR de las entradas para validar el ingreso</p>
      </div>

      {/* Selector de evento */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Evento seleccionado
        </label>
        <select
          value={selectedEventId || ''}
          onChange={(e) => setSelectedEventId(Number(e.target.value))}
          className="w-full border rounded-lg px-3 py-2"
        >
          {events.length === 0 && (
            <option value="">No hay eventos aprobados</option>
          )}
          {events.map(event => (
            <option key={event.id} value={event.id}>
              {event.title} - {new Date(event.startAt).toLocaleDateString('es-CL')}
            </option>
          ))}
        </select>
      </div>

      {/* Estadísticas para eventos OWN */}
      {stats && selectedEvent?.eventType !== 'RESALE' && (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Estadísticas del evento</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.capacity}</div>
              <div className="text-sm text-gray-600">Capacidad</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{stats.totalTickets}</div>
              <div className="text-sm text-gray-600">Vendidos</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{stats.scannedTickets}</div>
              <div className="text-sm text-gray-600">Validados</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{stats.pendingTickets}</div>
              <div className="text-sm text-gray-600">Pendientes</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Progreso de validación</span>
              <span className="text-sm font-semibold text-gray-900">{stats.scanProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${stats.scanProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard de estadísticas para eventos RESALE */}
      {resaleStats && selectedEvent?.eventType === 'RESALE' && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Dashboard de Reventa</h2>
            <span className="px-3 py-1 bg-orange-100 text-orange-800 text-sm font-medium rounded-full">
              Evento de Reventa
            </span>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">{resaleStats.summary.totalTickets}</div>
              <div className="text-sm text-gray-600">Total Tickets</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{resaleStats.summary.soldTickets}</div>
              <div className="text-sm text-gray-600">Vendidos</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">{resaleStats.summary.scannedTickets}</div>
              <div className="text-sm text-gray-600">Escaneados</div>
            </div>
            <div className="bg-white rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{resaleStats.summary.totalScans}</div>
              <div className="text-sm text-gray-600">Total Escaneos</div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-amber-800">
              <strong>ℹNota:</strong> Los tickets de reventa se validan automáticamente cuando los compradores escanean el QR proxy. 
              No necesitas validarlos manualmente desde aquí.
            </p>
          </div>

          {/* Lista de tickets escaneados */}
          {resaleStats.tickets.filter(t => t.scannedCount > 0).length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">Tickets Escaneados</h3>
              </div>
              <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
                {resaleStats.tickets
                  .filter(t => t.scannedCount > 0)
                  .sort((a, b) => new Date(b.lastScannedAt || 0).getTime() - new Date(a.lastScannedAt || 0).getTime())
                  .map((ticket) => (
                    <div key={ticket.id} className="px-4 py-3 hover:bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="font-medium text-gray-900">
                            Asiento: {ticket.seat}
                            {ticket.zone && <span className="text-gray-500 ml-2">({ticket.zone})</span>}
                          </div>
                          <div className="text-sm text-gray-500">Código: {ticket.ticketCode}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-purple-600">{ticket.scannedCount}</div>
                          <div className="text-xs text-gray-500">escaneos</div>
                        </div>
                      </div>
                      {ticket.lastScannedAt && (
                        <div className="text-xs text-gray-500">
                          Último escaneo: {new Date(ticket.lastScannedAt).toLocaleString('es-CL')}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selector de modo - Solo para eventos OWN */}
      {selectedEvent?.eventType !== 'RESALE' && (
      <div className="bg-white border rounded-lg p-4 mb-6">
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => {
              setScanMode('manual');
              setSelectedImage(null); // Limpiar imagen
              if (scanning) stopCameraScanner();
            }}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              scanMode === 'manual'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Modo Manual
          </button>
          <button
            onClick={() => {
              setScanMode('camera');
              setSelectedImage(null); // Limpiar imagen
            }}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              scanMode === 'camera'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Modo Cámara
          </button>
          <button
            onClick={() => {
              setScanMode('image');
              setSelectedImage(null); // Limpiar imagen
              if (scanning) stopCameraScanner();
            }}
            className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
              scanMode === 'image'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Modo Imagen
          </button>
        </div>

        {scanMode === 'manual' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Código QR del ticket
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && !validating) {
                    handleValidate(manualCode);
                  }
                }}
                placeholder="Ingresa o pega el código del ticket"
                className="flex-1 border rounded-lg px-3 py-2"
                autoFocus
              />
              <button
                onClick={() => handleValidate(manualCode)}
                disabled={validating || !manualCode.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {validating ? 'Validando...' : 'Validar'}
              </button>
            </div>
          </div>
        )}

        {scanMode === 'camera' && (
          <div>
            {cameraError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {cameraError}
              </div>
            )}
            
            <div id="qr-reader" className="mb-4"></div>
            
            <div className="flex gap-2">
              {!scanning ? (
                <button
                  onClick={startCameraScanner}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
                >
                  Iniciar Escáner
                </button>
              ) : (
                <button
                  onClick={stopCameraScanner}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700"
                >
                  Detener Escáner
                </button>
              )}
            </div>
          </div>
        )}

        {scanMode === 'image' && (
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Sube una imagen con un código QR para escanearlo sin usar la cámara
            </p>
            
            <div className="mb-4">
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer">
                  <div className="mb-2">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600">
                    {scanningImage ? (
                      <span className="text-blue-600 font-medium">Escaneando imagen...</span>
                    ) : selectedImage ? (
                      <span className="text-gray-500 font-medium">Imagen cargada - Click para cambiar</span>
                    ) : (
                      <>
                        <span className="text-blue-600 font-medium">Click para seleccionar imagen</span>
                        {' '}o arrastra aquí
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, JPEG (hasta 10MB)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleFileChange}
                  disabled={scanningImage}
                  className="hidden"
                />
              </label>
            </div>
            
            {selectedImage && (
              <div className="border rounded-lg p-4 bg-gray-50 mb-4">
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Imagen seleccionada:
                </p>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{selectedImage.name}</p>
                    <p className="text-xs text-gray-500">
                      {(selectedImage.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedImage(null)}
                    disabled={scanningImage}
                    className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Eliminar
                  </button>
                </div>
                
                {/* Botón para escanear */}
                <button
                  onClick={() => handleImageScan(selectedImage)}
                  disabled={scanningImage || validating}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {scanningImage ? 'Escaneando...' : validating ? 'Validando...' : 'Escanear código QR'}
                </button>
              </div>
            )}
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800 font-medium mb-2">
                Cómo generar una imagen QR de prueba:
              </p>
              <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
                <li>Descarga el PDF de un ticket desde "Mis entradas"</li>
                <li>Toma un screenshot del código QR</li>
                <li>Guarda como PNG o JPG</li>
                <li>Sube la imagen aquí</li>
              </ol>
              <p className="text-xs text-blue-600 mt-2">
                También puedes usar un generador online (qr-code-generator.com) con un código de la base de datos
              </p>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Resultado del último escaneo - Solo para eventos OWN */}
      {selectedEvent?.eventType !== 'RESALE' && lastResult && (
        <div className={`border-2 rounded-lg p-6 mb-6 ${
          lastResult.valid 
            ? 'bg-green-50 border-green-400' 
            : 'bg-red-50 border-red-400'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${
              lastResult.valid ? 'bg-green-600' : 'bg-red-600'
            }`}>
              {lastResult.valid ? (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </div>
            
            <div className="flex-1">
              <h3 className={`text-xl font-bold mb-2 ${
                lastResult.valid ? 'text-green-900' : 'text-red-900'
              }`}>
                {lastResult.valid ? 'Ticket Válido - Admisión Permitida' : 'Ticket Inválido'}
              </h3>
              
              {lastResult.valid && lastResult.buyer && (
                <div className="space-y-1 text-sm text-gray-700">
                  <p><strong>Comprador:</strong> {lastResult.buyer.name}</p>
                  <p><strong>Email:</strong> {lastResult.buyer.email}</p>
                  {lastResult.ticket?.seatNumber && (
                    <p><strong>Asiento:</strong> {lastResult.ticket.seatNumber}</p>
                  )}
                  {lastResult.ticket && (
                    <p><strong>Ticket:</strong> {lastResult.ticket.ticketNumber} de {lastResult.reservation?.totalTickets}</p>
                  )}
                  {lastResult.event && (
                    <p><strong>Evento:</strong> {lastResult.event.title}</p>
                  )}
                </div>
              )}
              
              {!lastResult.valid && (
                <div className="text-red-800">
                  <p className="font-medium">{lastResult.error}</p>
                  {lastResult.reason === 'already_scanned' && lastResult.scannedAt && (
                    <p className="text-sm mt-1">
                      Escaneado anteriormente: {new Date(lastResult.scannedAt).toLocaleString('es-CL')}
                    </p>
                  )}
                  {lastResult.reason === 'payment_pending' && (
                    <p className="text-sm mt-1">
                      Estado del pago: {lastResult.paymentStatus}
                    </p>
                  )}
                  {lastResult.reason === 'wrong_event' && lastResult.ticketEvent && (
                    <p className="text-sm mt-1 bg-yellow-100 border border-yellow-300 rounded p-2">
                      ⚠️ Este ticket pertenece al evento: <strong>{lastResult.ticketEvent.title}</strong>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Historial de escaneos - Solo para eventos OWN */}
      {selectedEvent?.eventType !== 'RESALE' && scanHistory.length > 0 && (
        <div className="bg-white border rounded-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Historial de validaciones</h2>
          <div className="space-y-2">
            {scanHistory.map((scan, index) => (
              <div 
                key={index}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  scan.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    scan.valid ? 'bg-green-600' : 'bg-red-600'
                  }`}></div>
                  <div>
                    <div className={`font-medium ${
                      scan.valid ? 'text-green-900' : 'text-red-900'
                    }`}>
                      {scan.valid ? scan.buyer?.name || 'Ticket válido' : scan.error || 'Error'}
                    </div>
                    {scan.valid && scan.ticket?.seatNumber && (
                      <div className="text-sm text-gray-600">Asiento: {scan.ticket.seatNumber}</div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-gray-500">
                  {formatTimestamp(scan.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
