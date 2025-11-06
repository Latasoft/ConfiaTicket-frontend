// src/utils/errorMessages.ts
/**
 * Sistema centralizado de mensajes de error amigables para usuarios
 * 
 * Convierte errores técnicos del backend en mensajes comprensibles
 * sin símbolos técnicos ni íconos
 */

/**
 * Mapeo de códigos de error del backend a mensajes amigables
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Errores de autenticación
  'UNAUTHENTICATED': 'Por favor inicia sesión para continuar',
  'UNAUTHORIZED': 'No tienes permiso para realizar esta acción',
  'INVALID_CREDENTIALS': 'El correo o la contraseña son incorrectos',
  'TOKEN_EXPIRED': 'Tu sesión ha expirado. Por favor inicia sesión nuevamente',
  'FORBIDDEN': 'No tienes permiso para acceder a este recurso',

  // Errores de validación
  'INVALID_INPUT': 'Por favor verifica que todos los campos estén correctamente completados',
  'VALIDATION_ERROR': 'Hay errores en el formulario. Por favor revisa los campos marcados',
  'MISSING_REQUIRED_FIELD': 'Faltan campos obligatorios por completar',
  'INVALID_EMAIL': 'El formato del correo electrónico no es válido',
  'INVALID_RUT': 'El RUT ingresado no es válido',

  // Errores de stock y disponibilidad
  'INSUFFICIENT_STOCK': 'No hay suficientes tickets disponibles. Por favor reduce la cantidad',
  'EVENT_HAS_STARTED': 'Este evento ya ha comenzado y no se pueden comprar más tickets',
  'EVENT_NOT_APPROVED': 'Este evento aún no ha sido aprobado para la venta de tickets',
  'EVENT_NOT_FOUND': 'El evento que buscas no existe o ya no está disponible',
  'TICKET_NOT_AVAILABLE': 'Este ticket ya no está disponible',
  'CANNOT_BUY_OWN_EVENT': 'No puedes comprar tickets de tu propio evento',

  // Errores de reserva y pago
  'RESERVATION_EXPIRED': 'Tu reserva ha expirado. Por favor intenta realizar la compra nuevamente',
  'RESERVATION_NOT_FOUND': 'No se encontró la reserva. Por favor verifica el número de reserva',
  'PAYMENT_FAILED': 'El pago no pudo ser procesado. Por favor intenta nuevamente o usa otro método de pago',
  'PAYMENT_ALREADY_PROCESSED': 'Este pago ya fue procesado anteriormente',
  'PAYMENT_CANCELLED': 'El pago fue cancelado',
  'PAYMENT_REJECTED': 'El pago fue rechazado por tu banco. Por favor contacta a tu institución financiera',

  // Errores de límites
  'EXCEEDS_MAX_TICKETS': 'Has excedido el número máximo de tickets permitidos por compra',
  'PRICE_LIMIT_EXCEEDED': 'El precio ingresado excede el límite permitido',

  // Errores de archivo
  'FILE_TOO_LARGE': 'El archivo es demasiado grande. El tamaño máximo permitido es 10 MB',
  'INVALID_FILE_TYPE': 'El tipo de archivo no es válido. Solo se permiten imágenes PNG, JPG y archivos PDF',
  'FILE_UPLOAD_FAILED': 'No se pudo subir el archivo. Por favor intenta nuevamente',

  // Errores del servidor
  'SERVER_ERROR': 'Ocurrió un error en el servidor. Por favor intenta nuevamente en unos momentos',
  'DATABASE_ERROR': 'Ocurrió un problema al procesar tu solicitud. Por favor intenta nuevamente',
  'INTERNAL_ERROR': 'Ocurrió un error inesperado. Nuestro equipo ha sido notificado',

  // Errores de red
  'NETWORK_ERROR': 'No se pudo conectar con el servidor. Por favor verifica tu conexión a internet',
  'TIMEOUT': 'El servidor está demorando más de lo esperado. Por favor intenta nuevamente en un minuto',
  'CONNECTION_REFUSED': 'No se pudo establecer conexión con el servidor. Por favor intenta más tarde',

  // Errores de recursos no encontrados
  'NOT_FOUND': 'El recurso solicitado no fue encontrado',
  'USER_NOT_FOUND': 'No se encontró el usuario',
  
  // Errores de duplicados
  'DUPLICATE_EMAIL': 'Ya existe una cuenta registrada con este correo electrónico',
  'DUPLICATE_RUT': 'Ya existe una cuenta registrada con este RUT',
  'ALREADY_EXISTS': 'Este registro ya existe en el sistema',

  // Errores de aplicación de organizador
  'APPLICATION_ALREADY_EXISTS': 'Ya tienes una solicitud pendiente para ser organizador',
  'APPLICATION_ALREADY_APPROVED': 'Tu solicitud ya fue aprobada',
  'APPLICATION_REJECTED': 'Tu solicitud fue rechazada',

  // Errores de cuenta conectada
  'ACCOUNT_NOT_CONFIGURED': 'Debes configurar tu cuenta de pagos antes de crear eventos',
  'PAYOUTS_NOT_ENABLED': 'Tu cuenta de pagos no está habilitada. Por favor contacta a soporte',
  
  // Errores de claim/reclamos
  'CLAIM_ALREADY_EXISTS': 'Ya existe un reclamo para esta reserva',
  'CLAIM_NOT_FOUND': 'No se encontró el reclamo',
};

/**
 * Mensajes genéricos por código de estado HTTP
 */
const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'La solicitud contiene datos inválidos. Por favor verifica la información ingresada',
  401: 'Debes iniciar sesión para acceder a este contenido',
  403: 'No tienes permiso para realizar esta acción',
  404: 'No se encontró lo que buscas. Por favor verifica la información',
  408: 'El servidor está demorando más de lo esperado. Por favor intenta nuevamente en un minuto',
  409: 'La acción no pudo completarse debido a un conflicto. Por favor verifica los datos',
  413: 'El archivo es demasiado grande. Por favor reduce su tamaño',
  422: 'Los datos enviados no son válidos. Por favor revisa el formulario',
  429: 'Has realizado demasiadas solicitudes. Por favor espera un momento antes de intentar nuevamente',
  500: 'Ocurrió un error en el servidor. Por favor intenta nuevamente en unos momentos',
  502: 'El servidor no está disponible temporalmente. Por favor intenta más tarde',
  503: 'El servicio no está disponible en este momento. Por favor intenta más tarde',
  504: 'El servidor está demorando más de lo esperado. Por favor intenta nuevamente en un minuto',
};

/**
 * Extrae el mensaje de error del objeto de error de Axios
 */
function extractErrorMessage(error: any): string | null {
  // Intenta obtener el error del backend en diferentes formatos
  if (error?.response?.data?.error) {
    return error.response.data.error;
  }
  if (error?.response?.data?.message) {
    return error.response.data.message;
  }
  if (typeof error?.response?.data === 'string') {
    return error.response.data;
  }
  return null;
}

/**
 * Detecta errores de red comunes
 */
function detectNetworkError(error: any): string | null {
  const message = error?.message?.toLowerCase() || '';
  
  if (message.includes('timeout') || error?.code === 'ECONNABORTED') {
    return 'El servidor está demorando más de lo esperado. Por favor intenta nuevamente en un minuto';
  }
  
  if (message.includes('network error') || error?.code === 'ERR_NETWORK') {
    return 'No se pudo conectar con el servidor. Por favor verifica tu conexión a internet';
  }
  
  if (message.includes('connection refused') || error?.code === 'ECONNREFUSED') {
    return 'No se pudo establecer conexión con el servidor. Por favor intenta más tarde';
  }
  
  return null;
}

/**
 * Convierte un error de Axios en un mensaje amigable para el usuario
 * 
 * @param error - Error de Axios o cualquier error
 * @param defaultMessage - Mensaje por defecto si no se encuentra uno específico
 * @returns Mensaje amigable para mostrar al usuario
 * 
 * @example
 * try {
 *   await api.post('/bookings/hold', data);
 * } catch (error) {
 *   const message = getFriendlyErrorMessage(error, 'No se pudo crear la reserva');
 *   setToast({ kind: 'error', text: message });
 * }
 */
export function getFriendlyErrorMessage(
  error: any,
  defaultMessage: string = 'Ocurrió un error inesperado. Por favor intenta nuevamente'
): string {
  // 1. Verificar errores de red primero
  const networkError = detectNetworkError(error);
  if (networkError) {
    return networkError;
  }

  // 2. Extraer mensaje del backend
  const backendMessage = extractErrorMessage(error);
  
  // 3. Buscar mensaje amigable por código de error del backend
  if (backendMessage) {
    // Buscar coincidencia exacta
    if (ERROR_MESSAGES[backendMessage]) {
      return ERROR_MESSAGES[backendMessage];
    }
    
    // Buscar coincidencia parcial (ej: "INSUFFICIENT_STOCK: Solo quedan 5")
    const errorCode = backendMessage.split(':')[0].trim();
    if (ERROR_MESSAGES[errorCode]) {
      // Si el backend incluye detalles, los agregamos
      const details = backendMessage.split(':')[1]?.trim();
      return details 
        ? `${ERROR_MESSAGES[errorCode]}. ${details}`
        : ERROR_MESSAGES[errorCode];
    }
  }

  // 4. Usar mensaje HTTP por código de estado
  const statusCode = error?.response?.status;
  if (statusCode && HTTP_STATUS_MESSAGES[statusCode]) {
    return HTTP_STATUS_MESSAGES[statusCode];
  }

  // 5. Retornar mensaje por defecto
  return defaultMessage;
}

/**
 * Shorthand para casos comunes de operaciones CRUD
 */
export const getErrorMessage = {
  create: (resource: string) => (error: any) => 
    getFriendlyErrorMessage(error, `No se pudo crear ${resource}. Por favor intenta nuevamente`),
  
  update: (resource: string) => (error: any) =>
    getFriendlyErrorMessage(error, `No se pudo actualizar ${resource}. Por favor intenta nuevamente`),
  
  delete: (resource: string) => (error: any) =>
    getFriendlyErrorMessage(error, `No se pudo eliminar ${resource}. Por favor intenta nuevamente`),
  
  fetch: (resource: string) => (error: any) =>
    getFriendlyErrorMessage(error, `No se pudo cargar ${resource}. Por favor intenta nuevamente`),
  
  upload: () => (error: any) =>
    getFriendlyErrorMessage(error, 'No se pudo subir el archivo. Por favor intenta nuevamente'),
  
  download: () => (error: any) =>
    getFriendlyErrorMessage(error, 'No se pudo descargar el archivo. Por favor intenta nuevamente'),
};

/**
 * Hook helper para manejar errores en componentes
 * 
 * @example
 * const showError = useErrorHandler();
 * 
 * try {
 *   await someAction();
 * } catch (error) {
 *   showError(error, 'No se pudo completar la acción');
 * }
 */
export function createErrorHandler(
  setError: (message: string) => void
) {
  return (error: any, defaultMessage?: string) => {
    const message = getFriendlyErrorMessage(error, defaultMessage);
    setError(message);
  };
}

export default getFriendlyErrorMessage;
