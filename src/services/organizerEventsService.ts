// src/services/organizerEventsService.ts
import api from "@/services/api";

export type OrganizerEvent = {
  id: number;
  title: string;
  description?: string;
  coverImageUrl?: string | null;

  // Lugar/fechas
  venue: string;
  city?: string;
  commune?: string;
  startAt: string;        // ISO
  endAt?: string | null;  // ISO o null

  // Cupos/estado
  capacity: number;
  status: "draft" | "pending" | "approved" | "rejected";
  isActive?: boolean;
  updatedAt?: string;

  // 💲 Precio de publicación (CLP, entero)
  price?: number;
  priceBase?: number | null;

  // Tipo de evento
  eventType?: "OWN" | "RESALE";

  // 👇 metadatos visibles en el form (autocompletados)
  organizerName?: string | null;
  organizerRut?: string | null;

  // 👇 datos de pago (se mostrarán y enviaremos desde el form)
  bankName?: string | null;
  accountType?: "corriente" | "vista" | "ahorro" | "rut" | string | null;
  accountNumber?: string | null;
  accountHolderName?: string | null;
  accountHolderRut?: string | null;
  payoutsEmail?: string | null;
};

// 👉 Respuesta del update con mensaje del backend
export type OrganizerUpdateResponse = OrganizerEvent & {
  _message?: string;
};

export type ListMyEventsResponse = {
  items: OrganizerEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export async function listMyEvents(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: OrganizerEvent["status"];
} = {}): Promise<ListMyEventsResponse> {
  const { data } = await api.get<ListMyEventsResponse>("/organizer/events", { params });
  return data;
}

/**
 * Crea un evento del organizador.
 * El backend debe aceptar `price` (CLP entero) junto con los demás campos.
 * Nota: si envías strings numéricos, el backend debería convertirlos; idealmente
 * envía `price` y `capacity` como number desde el form (ya lo hacemos).
 */
export async function createMyEvent(
  payload: Partial<OrganizerEvent>
): Promise<OrganizerEvent> {
  const { data } = await api.post<OrganizerEvent>("/organizer/events", payload);
  return data;
}

export async function getMyEvent(id: number): Promise<OrganizerEvent> {
  const { data } = await api.get<OrganizerEvent>(`/organizer/events/${id}`);
  return data;
}

/**
 * Actualiza un evento del organizador.
 * Incluye `price` si fue modificado desde el formulario.
 */
export async function updateMyEvent(
  id: number,
  payload: Partial<OrganizerEvent>
): Promise<OrganizerUpdateResponse> {
  const { data } = await api.put<OrganizerUpdateResponse>(
    `/organizer/events/${id}`,
    payload
  );
  return data;
}

export async function deleteMyEvent(id: number): Promise<void> {
  await api.delete(`/organizer/events/${id}`);
}

/**
 * Activa o desactiva un evento (incluso con ventas).
 * @param id - ID del evento
 * @param isActive - true para activar, false para desactivar
 */
export async function toggleEventActive(
  id: number,
  isActive: boolean
): Promise<{
  success: boolean;
  message: string;
  event: OrganizerEvent;
  paidReservations: number;
}> {
  const { data } = await api.patch(`/organizer/events/${id}/toggle-active`, {
    isActive,
  });
  return data;
}

/* ============ Event Sections (OWN events) ============ */
export type EventSection = {
  id: number;
  eventId: number;
  name: string;
  rowStart: string | null;
  rowEnd: string | null;
  seatsPerRow: number | null;
  seatStart: number | null;
  seatEnd: number | null;
  totalCapacity: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateSectionPayload = {
  name: string;
  rowStart?: string;
  rowEnd?: string;
  seatsPerRow?: number;
  seatStart?: number;
  seatEnd?: number;
};

export async function createEventSection(
  eventId: number,
  payload: CreateSectionPayload
): Promise<EventSection> {
  const { data } = await api.post<EventSection>(
    `/organizer/events/${eventId}/sections`,
    payload
  );
  return data;
}

export async function listEventSections(eventId: number): Promise<EventSection[]> {
  const { data } = await api.get<EventSection[]>(
    `/organizer/events/${eventId}/sections`
  );
  return data;
}

export async function updateEventSection(
  eventId: number,
  sectionId: number,
  payload: Partial<CreateSectionPayload>
): Promise<EventSection> {
  const { data } = await api.put<EventSection>(
    `/organizer/events/${eventId}/sections/${sectionId}`,
    payload
  );
  return data;
}

export async function deleteEventSection(
  eventId: number,
  sectionId: number
): Promise<void> {
  await api.delete(`/organizer/events/${eventId}/sections/${sectionId}`);
}

/* ============ Resale Tickets (RESALE events) ============ */
export type ResaleTicket = {
  id: number;
  eventId: number;
  row: string;
  seat: string;
  zone?: string | null;
  level?: string | null;
  description?: string | null;
  ticketImagePath: string;
  sold: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateResaleTicketPayload = {
  row: string;
  seat: string;
  ticketCode: string;
  zone?: string;
  level?: string;
  description?: string;
  ticketFile: File;
};

export async function createResaleTicket(
  eventId: number,
  payload: CreateResaleTicketPayload
): Promise<ResaleTicket> {
  const formData = new FormData();
  formData.append("row", payload.row);
  formData.append("seat", payload.seat);
  if (payload.ticketCode) formData.append("ticketCode", payload.ticketCode);
  if (payload.zone) formData.append("zone", payload.zone);
  if (payload.level) formData.append("level", payload.level);
  if (payload.description) formData.append("description", payload.description);
  formData.append("file", payload.ticketFile);

  const { data } = await api.post<ResaleTicket>(
    `/organizer/events/${eventId}/tickets`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function listResaleTickets(eventId: number): Promise<ResaleTicket[]> {
  const { data } = await api.get<ResaleTicket[]>(
    `/organizer/events/${eventId}/tickets`
  );
  return data;
}

export async function updateResaleTicket(
  eventId: number,
  ticketId: number,
  payload: Partial<Omit<CreateResaleTicketPayload, 'ticketFile'>> & { ticketFile?: File }
): Promise<ResaleTicket> {
  const formData = new FormData();
  if (payload.row) formData.append("row", payload.row);
  if (payload.seat) formData.append("seat", payload.seat);
  if (payload.zone !== undefined) formData.append("zone", payload.zone);
  if (payload.level !== undefined) formData.append("level", payload.level);
  if (payload.description !== undefined) formData.append("description", payload.description);
  if (payload.ticketFile) formData.append("file", payload.ticketFile);

  const { data } = await api.put<ResaleTicket>(
    `/organizer/events/${eventId}/tickets/${ticketId}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

export async function deleteResaleTicket(
  eventId: number,
  ticketId: number
): Promise<void> {
  await api.delete(`/organizer/events/${eventId}/tickets/${ticketId}`);
}


