// src/services/ticketValidationsService.ts
import api from './api';

export interface ValidationRecord {
  type: 'OWN' | 'RESALE';
  ticketId: number;
  // OWN específico
  ticketNumber?: number;
  seatNumber?: string | null;
  qrCode?: string;
  scannedAt?: string;
  scannedBy?: string;
  // RESALE específico
  ticketCode?: string;
  seatInfo?: string;
  row?: string;
  seat?: string;
  zone?: string | null;
  level?: string | null;
  proxyQrCode?: string | null;
  lastScannedAt?: string;
  logs?: Array<{
    timestamp: string;
    ip: string;
    userAgent: string;
  }> | null;
  // Común
  scannedCount: number;
  event: {
    id: number;
    title: string;
    date: string;
    location: string | null;
    eventType: 'OWN' | 'RESALE';
    organizer?: {
      id: number;
      name: string;
      email: string;
    };
  };
  buyer: {
    id: number;
    name: string;
    email: string;
  } | null;
  reservationCode: string | null;
}

export interface ValidationsListResponse {
  validations: ValidationRecord[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    ownCount: number;
    resaleCount: number;
  };
}

export interface ValidationDetailsResponse {
  type: 'OWN' | 'RESALE';
  ticket: any;
  event: any;
  buyer: any;
  reservation: any;
}

/**
 * Lista validaciones para admin
 */
export async function listAllValidations(params?: {
  eventId?: number;
  eventType?: 'OWN' | 'RESALE';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<ValidationsListResponse> {
  const response = await api.get('/admin/ticket-validations', { params });
  return response.data;
}

/**
 * Obtiene detalles de una validación (admin)
 */
export async function getValidationDetails(
  ticketId: number,
  type: 'OWN' | 'RESALE'
): Promise<ValidationDetailsResponse> {
  const response = await api.get(`/admin/ticket-validations/${ticketId}`, {
    params: { type },
  });
  return response.data;
}

/**
 * Lista validaciones para organizador
 */
export async function listOrganizerValidations(params?: {
  eventId?: number;
  eventType?: 'OWN' | 'RESALE';
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<ValidationsListResponse> {
  const response = await api.get('/organizer/ticket-validations', { params });
  return response.data;
}

/**
 * Obtiene detalles de una validación (organizador)
 */
export async function getOrganizerValidationDetails(
  ticketId: number,
  type: 'OWN' | 'RESALE'
): Promise<ValidationDetailsResponse> {
  const response = await api.get(`/organizer/ticket-validations/${ticketId}`, {
    params: { type },
  });
  return response.data;
}
