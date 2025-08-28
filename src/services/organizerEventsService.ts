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
  startAt: string;        // ISO
  endAt?: string | null;  // ISO o null

  // Cupos/estado
  capacity: number;
  status: "draft" | "pending" | "approved" | "rejected";
  updatedAt?: string;

  // 💲 Precio de publicación (CLP, entero)
  price?: number;

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


