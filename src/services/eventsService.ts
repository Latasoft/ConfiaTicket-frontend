// src/services/eventsService.ts
import api from "@/services/api";

export type EventDetails = {
  id: number;
  title: string;
  description: string;
  date: string;          // ISO
  location: string;
  capacity: number;
  price?: number;        // precio unitario en CLP (pesos, sin decimales)
  approved: boolean;
  coverImageUrl?: string | null;
  organizer?: { id: number; name: string; email: string };
  // agregado por backend: entradas disponibles (capacity - vendidas/holds)
  remaining?: number;
  hasStarted?: boolean;
  canBuy?: boolean;
};

export async function getEventDetails(id: number): Promise<EventDetails> {
  const { data } = await api.get(`/events/${id}`);
  return data;
}

/** Crea un HOLD temporal para quantity entradas del evento */
export async function holdTickets(eventId: number, qty: number) {
  const { data } = await api.post(`/bookings/hold`, { eventId, quantity: qty });
  return data as {
    ok: boolean;
    booking?: {
      id: number;
      code: string;
      quantity: number;
      amount: number;      // total CLP de esa reserva
      expiresAt: string;   // ISO
    };
    holdMinutes?: number;
    error?: string;        // e.g. "UNAUTHENTICATED" | "INSUFFICIENT_STOCK"
    remaining?: number;    // stock restante si falla por stock
  };
}

/** Confirma pago en modo prueba para un HOLD existente */
export async function confirmPaymentTest(bookingId: number) {
  const { data } = await api.post(`/bookings/${bookingId}/pay-test`);
  return data as { ok: boolean; booking?: any; error?: string };
}




