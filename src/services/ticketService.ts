// src/services/ticketService.ts
import api from './api';
import type { ResaleTicket, EventSection, ReservationWithTicket } from '../types/ticket';

/**
 * Obtener tickets RESALE disponibles para un evento
 */
export async function getResaleTickets(eventId: number): Promise<ResaleTicket[]> {
  const response = await api.get(`/events/${eventId}/resale-tickets`);
  return response.data;
}

/**
 * Obtener secciones de un evento OWN
 */
export async function getEventSections(eventId: number): Promise<EventSection[]> {
  const response = await api.get(`/events/${eventId}/sections`);
  return response.data;
}

/**
 * Crear una reserva (hold temporal) para cualquier tipo de evento
 */
export async function createReservation(
  eventId: number,
  quantity: number,
  ticketId?: number,
  sectionId?: number,
  seatAssignment?: string
): Promise<ReservationWithTicket> {
  const response = await api.post('/bookings/hold', {
    eventId,
    quantity,
    ticketId,
    sectionId,
    seatAssignment,
  });
  return response.data.booking;
}

/**
 * Iniciar el proceso de pago para una reserva
 */
export async function initiatePayment(reservationId: number): Promise<{ url: string; token: string }> {
  const response = await api.post(`/payments/init`, { reservationId });
  return response.data;
}

/**
 * Descargar el PDF del ticket (para eventos OWN)
 */
export async function downloadTicketPdf(reservationId: number): Promise<Blob> {
  const response = await api.get(`/tickets/${reservationId}/download`, {
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Obtener URL de imagen de ticket RESALE (protegida)
 */
export function getResaleTicketImageUrl(ticketId: number): string {
  return `${import.meta.env.VITE_API_URL}/tickets/resale/${ticketId}/image`;
}

/**
 * Obtener mis reservas (tickets comprados)
 */
export async function getMyReservations(): Promise<ReservationWithTicket[]> {
  const response = await api.get('/tickets/my');
  return response.data.items;
}

/**
 * Cancelar una reserva
 */
export async function cancelReservation(reservationId: number): Promise<void> {
  await api.post(`/bookings/${reservationId}/cancel`);
}

/**
 * Pago de prueba (solo desarrollo)
 */
export async function payTestReservation(reservationId: number): Promise<ReservationWithTicket> {
  const response = await api.post(`/bookings/${reservationId}/pay-test`);
  return response.data.booking;
}
