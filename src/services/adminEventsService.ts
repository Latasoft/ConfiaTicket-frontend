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

  /** Estado activo/inactivo del evento */
  isActive?: boolean;

  /** Fecha de creación del evento (ISO) */
  createdAt?: string | null;

  /** Última actualización (opcional) */
  updatedAt?: string | null;

  organizerId?: number;
  organizer?: { 
    id: number; 
    name: string; 
    email: string;
    rut?: string;
    phone?: string | null;
    legalName?: string | null;
    isActive?: boolean;
    deletedAt?: string | null;
  };
  /** Para deshabilitar acciones si el organizador está eliminado/inactivo */
  organizerDeletedOrInactive?: boolean;

  /** Portada del evento (opcional) */
  coverImageUrl?: string | null;

  // Campos adicionales del detalle
  city?: string;
  commune?: string;
  price?: number;

  // Estadísticas de ventas
  stats?: {
    totalReservations: number;
    paidReservations: number;
    pendingReservations: number;
    ticketsSold: number;
    availableTickets: number;
    totalRevenue: number;
    occupancyRate: number;
  };

  // Información bancaria legacy del evento
  eventBankingInfo?: {
    bankName: string;
    accountType: string;
    accountNumber: string;
    holderName: string;
    holderRut: string;
  } | null;
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

/**
 * Activa o desactiva un evento como admin (incluso con ventas).
 */
export async function adminToggleEventActive(
  id: number,
  isActive: boolean
): Promise<{
  success: boolean;
  message: string;
  event: AdminEvent;
  paidReservations: number;
}> {
  const { data } = await api.patch(`/admin/events/${id}/toggle-active`, {
    isActive,
  });
  return data;
}

export async function adminDeleteEvent(id: number): Promise<{ success: boolean; message: string }> {
  const { data } = await api.delete<{ success: boolean; message: string }>(`/admin/events/${id}`);
  return data;
}

