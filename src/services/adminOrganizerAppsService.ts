// src/services/adminOrganizerAppsService.ts
import api from "@/services/api";

export type AppStatus = "PENDING" | "APPROVED" | "REJECTED";

export type AdminOrganizerApplication = {
  id: number;
  userId: number;
  legalName: string;
  taxId: string;
  phone?: string | null;
  notes?: string | null;
  idCardImage: string;              // nombre del archivo
  idCardImageUrl?: string | null;   // URL completa del endpoint
  status: AppStatus;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  user?: { id: number; name: string; email: string } | null;
};

export type AdminOrganizerAppsListResponse = {
  items: AdminOrganizerApplication[];
  total: number;
  page: number;
  pageSize: number;
};

export async function adminListOrganizerApplications(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: AppStatus;
}): Promise<AdminOrganizerAppsListResponse> {
  // OJO: /admin/organizer-applications
  const { data } = await api.get("/admin/organizer-applications", { params });
  return data as AdminOrganizerAppsListResponse;
}

export async function adminApproveOrganizerApplication(
  id: number
): Promise<{ ok: true }> {
  const { data } = await api.post(`/admin/organizer-applications/${id}/approve`);
  return data as { ok: true };
}

export async function adminRejectOrganizerApplication(
  id: number,
  notes?: string
): Promise<{ ok: true }> {
  // Enviar body solo si hay notas
  const body = notes && notes.trim() ? { notes: notes.trim() } : {};
  const { data } = await api.post(
    `/admin/organizer-applications/${id}/reject`,
    body
  );
  return data as { ok: true };
}

// Reabrir solicitud (volver a estado PENDING)
export async function adminReopenOrganizerApplication(
  id: number
): Promise<{ ok: true }> {
  const { data } = await api.post(`/admin/organizer-applications/${id}/reopen`);
  return data as { ok: true };
}




