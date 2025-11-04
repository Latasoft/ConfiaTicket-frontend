// src/services/resaleValidationService.ts
import api from './api';

export interface ResaleValidationResponse {
  valid: boolean;
  message: string;
  scannedCount: number;
  lastScannedAt: string;
  ticket: {
    id: number;
    ticketCode: string;
    row: string;
    seat: string;
    zone: string | null;
    level: string | null;
  };
  event: {
    id: number;
    title: string;
    date: string;
    location: string | null;
    city: string | null;
    commune: string | null;
  };
  buyer: {
    name: string;
    email: string;
  } | null;
  reservationCode: string;
  originalQrCode: string;
}

export interface ValidationError {
  error: string;
  valid: false;
  message: string;
  reason?: string;
  paymentStatus?: string;
}

/**
 * Valida un ticket de reventa usando su código QR proxy
 * Este endpoint es público y registra automáticamente el escaneo
 */
export async function validateResaleTicket(
  proxyQrCode: string
): Promise<ResaleValidationResponse> {
  const response = await api.get(`/resale-tickets/validate/${proxyQrCode}`);
  return response.data;
}
