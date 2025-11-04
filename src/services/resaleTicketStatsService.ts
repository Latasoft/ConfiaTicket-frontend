// src/services/resaleTicketStatsService.ts
import api from './api';

export interface ResaleTicketScanLog {
  timestamp: string;
  ip: string;
  userAgent: string;
}

export interface ResaleTicketStats {
  ticketId: number;
  ticketCode: string;
  seat: string;
  zone: string | null;
  level: string | null;
  event: {
    id: number;
    title: string;
  };
  stats: {
    scannedCount: number;
    lastScannedAt: string | null;
    sold: boolean;
    soldAt: string | null;
  };
  scanHistory: ResaleTicketScanLog[];
}

export interface ResaleEventStats {
  event: {
    id: number;
    title: string;
  };
  summary: {
    totalTickets: number;
    soldTickets: number;
    availableTickets: number;
    scannedTickets: number;
    totalScans: number;
  };
  tickets: Array<{
    id: number;
    ticketCode: string;
    seat: string;
    zone: string | null;
    level: string | null;
    sold: boolean;
    soldAt: string | null;
    scannedCount: number;
    lastScannedAt: string | null;
    buyer: {
      name: string;
      email: string;
    } | null;
    reservationCode: string | null;
  }>;
}

/**
 * Obtiene estadísticas detalladas de un ticket RESALE específico
 */
export async function getResaleTicketStats(proxyQrCode: string): Promise<ResaleTicketStats> {
  const response = await api.get(`/resale-tickets/${proxyQrCode}/stats`);
  return response.data;
}

/**
 * Obtiene estadísticas de todos los tickets RESALE de un evento
 */
export async function getResaleEventStats(eventId: number): Promise<ResaleEventStats> {
  const response = await api.get(`/resale-tickets/event/${eventId}/scan-stats`);
  return response.data;
}
