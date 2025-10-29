// src/services/organizerTicketValidationService.ts
import api from './api';

export interface ValidateTicketResponse {
  valid: boolean;
  message?: string;
  error?: string;
  reason?: 'not_your_event' | 'payment_pending' | 'already_scanned' | 'wrong_event';
  ticket?: {
    id: number;
    ticketNumber: number;
    seatNumber: string | null;
    scannedAt: string;
  };
  event?: {
    id: number;
    title: string;
    date: string;
    location: string;
  };
  buyer?: {
    name: string;
    email: string;
  };
  reservation?: {
    id: number;
    reservationCode: string;
    totalTickets: number;
  };
  paymentStatus?: string;
  scannedAt?: string | null;
  scannedBy?: string | null;
  ticketEvent?: {
    id: number;
    title: string;
  };
}

export interface CheckTicketResponse {
  valid: boolean;
  reason?: 'not_found' | 'not_your_event';
  scanned: boolean;
  scannedAt: string | null;
  paymentStatus: string;
  event?: {
    id: number;
    title: string;
    date: string;
  };
  buyer?: {
    name: string;
  };
  ticketNumber: number;
  seatNumber: string | null;
}

export interface ValidationStats {
  eventId: number;
  eventTitle: string;
  capacity: number;
  totalTickets: number;
  scannedTickets: number;
  pendingTickets: number;
  scanProgress: string;
}

/**
 * Valida un ticket mediante su código QR
 * Marca el ticket como escaneado si es válido
 */
export async function validateTicket(qrCode: string, eventId?: number): Promise<ValidateTicketResponse> {
  const response = await api.post('/organizer/ticket-validation/validate', { 
    qrCode,
    eventId 
  });
  return response.data;
}

/**
 * Consulta el estado de un ticket sin marcarlo como escaneado
 */
export async function checkTicket(qrCode: string): Promise<CheckTicketResponse> {
  const response = await api.get(`/organizer/ticket-validation/check/${qrCode}`);
  return response.data;
}

/**
 * Obtiene estadísticas de validación para un evento específico
 */
export async function getEventStats(eventId: number): Promise<ValidationStats> {
  const response = await api.get(`/organizer/ticket-validation/events/${eventId}/stats`);
  return response.data;
}
