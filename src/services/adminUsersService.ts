// src/services/adminUsersService.ts
import api from "@/services/api";

export type OrganizerAppStatus = "PENDING" | "APPROVED" | "REJECTED" | null;

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: "superadmin" | "organizer" | "buyer";
  isVerified: boolean;
  canSell: boolean;
  isActive: boolean;              // soft-activate
  deletedAt: string | null;       // soft-delete timestamp
  createdAt: string;              // 👈 NUEVO: fecha de creación
  updatedAt?: string;             // opcional (lo devuelve el backend en varias rutas)
  latestOrganizerAppStatus: OrganizerAppStatus; // estado de la última solicitud
};

/** Información detallada de un usuario */
export type AdminUserDetail = AdminUser & {
  // documentos de identificacion
  idDocumentUrl?: string | null;
  idDocumentType?: string | null;
  idDocumentNumber?: string | null;
  rut?: string | null;
  birthDate?: string | null;
  documentUrl?: string | null;
  
  // información de la solicitud para ser organizador
  application?: {
    id: number;
    legalName?: string | null;
    taxId?: string | null;
    phone?: string | null;
    idCardImage?: string | null;          // Nombre del archivo
    idCardImageUrl?: string | null;       // URL completa del endpoint
    notes?: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  
  // informacion bancaria
  bankingInfo?: {
    hasBankAccount: boolean;
    psp?: string | null;
    pspAccountId?: string | null;
    onboardingStatus?: string | null;
    payoutsEnabled?: boolean;
    bankDetails: {
      bankName?: string | null;
      accountType?: string | null;
      accountNumber?: string | null;
      holderName?: string | null;
      holderRut?: string | null;
    };
    createdAt?: string;
    updatedAt?: string;
  } | null;
  
  // Información adicional
  phone?: string | null;
  address?: string | null;
  
  // estadisticas
  stats?: {
    eventsCreated?: number;
    purchasesMade?: number;
    activeEvents?: number;
  };
  
  // informacion sobre habilitacion para venta
  effectiveCanSell?: boolean;
  
};

export type AdminUsersList = {
  items: AdminUser[];
  total: number;
  page: number;
  pageSize: number;
};

export async function adminListUsers(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  role?: "superadmin" | "organizer" | "buyer";
  verified?: "true" | "false";
  canSell?: "true" | "false";
}) {
  const { data } = await api.get("/admin/users", { params });
  return data as AdminUsersList;
}

/** Obtener el detalle de un usuario */
export async function adminGetUser(id: number) {
  const { data } = await api.get(`/admin/users/${id}`);
  return data as AdminUserDetail;
}

export async function adminSetUserVerified(id: number, isVerified: boolean) {
  const { data } = await api.patch(`/admin/users/${id}/verified`, { isVerified });
  return data as AdminUser;
}

export async function adminSetUserCanSell(id: number, canSell: boolean) {
  const { data } = await api.patch(`/admin/users/${id}/can-sell`, { canSell });
  return data as AdminUser;
}

/** Activar cuenta (revierte desactivación) */
export async function adminActivateUser(id: number) {
  const { data } = await api.post(`/admin/users/${id}/activate`);
  return data as AdminUser;
}

/** Desactivar cuenta (sin borrar datos) */
export async function adminDeactivateUser(id: number) {
  const { data } = await api.post(`/admin/users/${id}/deactivate`);
  return data as AdminUser;
}

/** Preview del impacto de borrar (soft-delete) */
export type DeletePreview = {
  reservationsCount: number;
  organizerEventsCount: number;
  asBuyerEventsCount?: number;
};

export async function adminDeleteUserPreview(id: number) {
  const { data } = await api.get(`/admin/users/${id}/delete-preview`);
  return data as DeletePreview;
}

/** Soft-delete + anonimización */
export async function adminSoftDeleteUser(id: number) {
  const { data } = await api.post(`/admin/users/${id}/soft-delete`);
  return data as AdminUser;
}





