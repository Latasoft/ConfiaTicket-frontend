// src/services/adminEventsService.ts
import api from "@/services/api";

export type AdminEvent = {
  id: number;
  title: string;
  description?: string;

  /** Fecha/hora del evento (ISO) – mapeado desde `date` en backend */
  startAt: string;

  /** Lugar – mapeado desde `location` en backend */
  venue: string;

  /** Número total de entradas */
  capacity: number;

  /** Estado de publicación – mapeado desde `approved:boolean` */
  status: "approved" | "pending";

  /** Fecha de creación del evento (ISO) */
  createdAt?: string | null;

  /** Última actualización (opcional) */
  updatedAt?: string | null;

  organizerId?: number;
  organizer?: { id: number; name: string; email: string };
  /** Para deshabilitar acciones si el organizador está eliminado/inactivo */
  organizerDeletedOrInactive?: boolean;

  /** Portada del evento (opcional) */
  coverImageUrl?: string | null;
};

export type AdminListResponse = {
  items: AdminEvent[];
  total: number;
  page: number;
  pageSize: number;
};

export async function adminListEvents(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: "approved" | "pending";
  organizerId?: number;
} = {}): Promise<AdminListResponse> {
  const { data } = await api.get<AdminListResponse>("/admin/events", { params });
  return data;
}

export async function adminGetEvent(id: number): Promise<AdminEvent> {
  const { data } = await api.get<AdminEvent>(`/admin/events/${id}`);
  return data;
}

export async function adminSetEventStatus(
  id: number,
  status: "approved" | "pending"
): Promise<AdminEvent> {
  const { data } = await api.patch<AdminEvent>(`/admin/events/${id}/status`, { status });
  return data;
}

