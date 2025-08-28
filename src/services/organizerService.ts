// src/services/organizerEventsService.ts
import api from "@/services/api";

export type OrganizerEvent = {
  id: number;
  title: string;
  description?: string;
  coverImageUrl?: string | null;
  venue: string;
  city?: string;
  startAt: string;        // ISO string
  endAt?: string | null;  // ISO string o null
  capacity: number;
  status: "draft" | "pending" | "approved" | "rejected";
  updatedAt?: string;     // ISO string
};

// Respuesta especial del update (incluye el mensaje del backend)
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

export async function createMyEvent(payload: Partial<OrganizerEvent>): Promise<OrganizerEvent> {
  const { data } = await api.post<OrganizerEvent>("/organizer/events", payload);
  return data;
}

export async function getMyEvent(id: number): Promise<OrganizerEvent> {
  const { data } = await api.get<OrganizerEvent>(`/organizer/events/${id}`);
  return data;
}

export async function updateMyEvent(
  id: number,
  payload: Partial<OrganizerEvent>
): Promise<OrganizerUpdateResponse> {
  const { data } = await api.put<OrganizerUpdateResponse>(`/organizer/events/${id}`, payload);
  return data;
}

export async function deleteMyEvent(id: number): Promise<void> {
  await api.delete(`/organizer/events/${id}`);
}


