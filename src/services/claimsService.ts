// src/services/claimsService.ts
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface Claim {
  id: number;
  buyerId: number;
  reservationId: number;
  eventId: number;
  reason: ClaimReason;
  description: string;
  status: ClaimStatus;
  priority: ClaimPriority;
  attachmentUrl?: string;
  adminResponse?: string;
  reviewedBy?: number;
  reviewedAt?: string;
  resolution?: string;
  resolvedAt?: string;
  reopenCount: number;
  reopenedAt?: string;
  canReopen: boolean;
  createdAt: string;
  updatedAt: string;
  reservation?: {
    id: number;
    code: string;
    quantity: number;
    amount: number;
    paidAt?: string;
    event: {
      id: number;
      title: string;
      date: string;
      location: string;
    };
  };
  buyer?: {
    id: number;
    name: string;
    email: string;
    rut?: string;
  };
}

export type ClaimReason =
  | 'TICKET_NOT_RECEIVED'
  | 'TICKET_INVALID'
  | 'TICKET_DUPLICATED'
  | 'EVENT_CANCELLED'
  | 'EVENT_CHANGED'
  | 'WRONG_SEATS'
  | 'POOR_QUALITY'
  | 'OVERCHARGED'
  | 'OTHER';

export type ClaimStatus =
  | 'PENDING'
  | 'IN_REVIEW'
  | 'WAITING_INFO'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CANCELLED';

export type ClaimPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ClaimMessageType =
  | 'BUYER_MESSAGE'
  | 'BUYER_EVIDENCE'
  | 'ADMIN_RESPONSE'
  | 'SYSTEM_NOTE';

export interface ClaimMessage {
  id: number;
  claimId: number;
  type: ClaimMessageType;
  message?: string;
  attachments?: string[];
  authorId?: number;
  authorRole?: string;
  createdAt: string;
}

export interface CreateClaimRequest {
  reservationId: number;
  reason: ClaimReason;
  description: string;
  attachmentUrl?: string;
}

export interface UpdateClaimStatusRequest {
  status: ClaimStatus;
  adminResponse?: string;
  resolution?: string;
}

// ============ API DE USUARIOS (COMPRADORES) ============

/**
 * Crear un nuevo reclamo
 */
export async function createClaim(data: CreateClaimRequest): Promise<Claim> {
  const token = localStorage.getItem('token');
  const response = await axios.post(`${API_URL}/api/claims`, data, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

/**
 * Listar mis reclamos
 */
export async function getMyClaims(): Promise<Claim[]> {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/api/claims`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

/**
 * Obtener detalle de un reclamo
 */
export async function getClaim(id: number): Promise<Claim> {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/api/claims/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

/**
 * Cancelar un reclamo
 */
export async function cancelClaim(id: number): Promise<Claim> {
  const token = localStorage.getItem('token');
  const response = await axios.put(
    `${API_URL}/api/claims/${id}/cancel`,
    {},
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

/**
 * Reabrir un reclamo
 */
export async function reopenClaim(
  id: number,
  additionalInfo?: string
): Promise<Claim> {
  const token = localStorage.getItem('token');
  const response = await axios.put(
    `${API_URL}/api/claims/${id}/reopen`,
    { additionalInfo },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

// ============ API DE ADMIN ============

/**
 * Listar todos los reclamos (admin)
 */
export async function adminGetAllClaims(params?: {
  status?: ClaimStatus;
  priority?: ClaimPriority;
  eventId?: number;
}): Promise<Claim[]> {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/api/claims/admin/all`, {
    headers: { Authorization: `Bearer ${token}` },
    params,
  });
  return response.data;
}

/**
 * Obtener detalle completo de un reclamo (admin)
 */
export async function adminGetClaim(id: number): Promise<Claim> {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/api/claims/admin/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

/**
 * Actualizar estado de un reclamo (admin)
 */
export async function adminUpdateClaimStatus(
  id: number,
  data: UpdateClaimStatusRequest
): Promise<Claim> {
  const token = localStorage.getItem('token');
  const response = await axios.put(
    `${API_URL}/api/claims/admin/${id}/status`,
    data,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

/**
 * Actualizar prioridad de un reclamo (admin)
 */
export async function adminUpdateClaimPriority(
  id: number,
  priority: ClaimPriority
): Promise<Claim> {
  const token = localStorage.getItem('token');
  const response = await axios.put(
    `${API_URL}/api/claims/admin/${id}/priority`,
    { priority },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

// ============ UTILIDADES ============

/**
 * Obtener el nombre legible del motivo
 */
export function getReasonLabel(reason: ClaimReason): string {
  const labels: Record<ClaimReason, string> = {
    TICKET_NOT_RECEIVED: 'No recibí el ticket',
    TICKET_INVALID: 'Ticket inválido o falso',
    TICKET_DUPLICATED: 'Ticket duplicado/ya usado',
    EVENT_CANCELLED: 'Evento cancelado',
    EVENT_CHANGED: 'Evento cambió de fecha/lugar',
    WRONG_SEATS: 'Asientos incorrectos',
    POOR_QUALITY: 'Mala calidad del ticket',
    OVERCHARGED: 'Cobro excesivo',
    OTHER: 'Otro motivo',
  };
  return labels[reason] || reason;
}

/**
 * Obtener el nombre legible del estado
 */
export function getStatusLabel(status: ClaimStatus): string {
  const labels: Record<ClaimStatus, string> = {
    PENDING: 'Pendiente',
    IN_REVIEW: 'En revisión',
    WAITING_INFO: 'Esperando información',
    RESOLVED: 'Resuelto',
    REJECTED: 'Rechazado',
    CANCELLED: 'Cancelado',
  };
  return labels[status] || status;
}

/**
 * Obtener el color del badge según el estado
 */
export function getStatusColor(status: ClaimStatus): string {
  const colors: Record<ClaimStatus, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    IN_REVIEW: 'bg-blue-100 text-blue-800',
    WAITING_INFO: 'bg-orange-100 text-orange-800',
    RESOLVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    CANCELLED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Obtener el nombre legible de la prioridad
 */
export function getPriorityLabel(priority: ClaimPriority): string {
  const labels: Record<ClaimPriority, string> = {
    LOW: 'Baja',
    MEDIUM: 'Media',
    HIGH: 'Alta',
    URGENT: 'Urgente',
  };
  return labels[priority] || priority;
}

/**
 * Obtener el color del badge según la prioridad
 */
export function getPriorityColor(priority: ClaimPriority): string {
  const colors: Record<ClaimPriority, string> = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  };
  return colors[priority] || 'bg-gray-100 text-gray-800';
}

// ============ API DE MENSAJES ============

/**
 * Obtener mensajes de un reclamo (comprador)
 */
export async function getClaimMessages(claimId: number): Promise<ClaimMessage[]> {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/api/claims/${claimId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

/**
 * Agregar mensaje o evidencia a un reclamo (comprador)
 */
export async function addClaimMessage(
  claimId: number,
  data: { message?: string; attachments?: string[] }
): Promise<ClaimMessage> {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/api/claims/${claimId}/messages`,
    data,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

/**
 * Subir archivos de evidencia a un reclamo (comprador)
 */
export async function uploadClaimEvidence(
  claimId: number,
  files: File[],
  message?: string
): Promise<ClaimMessage> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  
  files.forEach((file) => {
    formData.append('evidence', file);
  });
  
  if (message) {
    formData.append('message', message);
  }
  
  const response = await axios.post(
    `${API_URL}/api/claims/${claimId}/upload-evidence`,
    formData,
    {
      headers: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
    }
  );
  return response.data;
}

/**
 * Obtener mensajes de un reclamo (admin)
 */
export async function adminGetClaimMessages(claimId: number): Promise<ClaimMessage[]> {
  const token = localStorage.getItem('token');
  const response = await axios.get(`${API_URL}/api/claims/admin/${claimId}/messages`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return response.data;
}

/**
 * Agregar respuesta del admin
 */
export async function adminAddClaimMessage(
  claimId: number,
  message: string
): Promise<ClaimMessage> {
  const token = localStorage.getItem('token');
  const response = await axios.post(
    `${API_URL}/api/claims/admin/${claimId}/messages`,
    { message },
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  return response.data;
}

/**
 * Obtener el nombre legible del tipo de mensaje
 */
export function getMessageTypeLabel(type: ClaimMessageType): string {
  const labels: Record<ClaimMessageType, string> = {
    BUYER_MESSAGE: 'Mensaje del comprador',
    BUYER_EVIDENCE: 'Evidencia subida',
    ADMIN_RESPONSE: 'Respuesta del administrador',
    SYSTEM_NOTE: 'Nota del sistema',
  };
  return labels[type] || type;
}
