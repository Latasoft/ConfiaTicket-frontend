// src/services/ticketsService.ts
import api from "@/services/api";

/* ========= Tipos compartidos ========= */

export type ReservationStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELED"
  | "EXPIRED";

export type FulfillmentStatus =
  | "WAITING_TICKET"
  | "TICKET_UPLOADED"
  | "TICKET_APPROVED"
  | "TICKET_REJECTED"
  | "DELIVERED";

export type RefundStatus = "NONE" | "REQUESTED" | "SUCCEEDED" | "FAILED";

export interface TicketFlowStatus {
  id: number; // reservationId
  status: ReservationStatus;
  fulfillmentStatus: FulfillmentStatus;
  ticketUploadedAt?: string | null;
  approvedAt?: string | null;
  deliveredAt?: string | null;
  rejectionReason?: string | null;
  // NUEVOS (deadline/reembolso)
  ticketUploadDeadlineAt?: string | null;
  refundStatus?: RefundStatus;
  refundedAt?: string | null;
}

/* ========= Tipos para detalle de reserva (seguimiento) ========= */

export type ReservationDetail = TicketFlowStatus & {
  reservationId: number;
  createdAt: string;
  quantity: number;
  amount: number;
  event: {
    id: number;
    title: string;
    date: string | null;
    venue?: string | null;
    city?: string | null;
    coverImageUrl?: string | null;
  };
  // Archivo de ticket (si hay)
  ticketFileName?: string | null;
  ticketMime?: string | null;
  ticketSize?: number | null;

  // Pago asociado
  payment?: {
    id: number;
    status: string;
    isDeferredCapture?: boolean;
    capturePolicy?: "IMMEDIATE" | "MANUAL_ON_APPROVAL";
    escrowStatus?: string | null;
    token?: string | null;
    buyOrder?: string | null;
    authorizedAmount?: number | null;
    capturedAmount?: number | null;
    updatedAt?: string | null;
  } | null;
};

/* ========= Tipos para listado (Mis entradas - comprador) ========= */

export type TicketListItem = {
  reservationId: number;
  createdAt: string;
  event?: { title: string; date: string };
  quantity: number;
  amount: number;
  /** WAITING_TICKET | UNDER_REVIEW | TICKET_APPROVED | DELIVERED | TICKET_REJECTED */
  flowStatus: string;
  ticketUploadedAt?: string | null;
  deliveredAt?: string | null;
  // NUEVOS (deadline/reembolso)
  ticketUploadDeadlineAt?: string | null;
  refundStatus?: RefundStatus;
  // Acciones/archivos
  canDownload: boolean;
  canPreview?: boolean;
  previewUrl?: string; // /api/tickets/:id/file
  downloadUrl: string; // /api/tickets/:id/download
  mime?: string | null;
  size?: number | null; // bytes
};

export type TicketListResponse = {
  items: TicketListItem[];
  total: number;
  page: number;
  pageSize: number;
};

/* ========= Tipos para listado (Organizador) ========= */

export type OrganizerReservationItem = {
  reservationId: number;
  createdAt: string;
  event?: { id: number; title: string; date: string | null };
  buyer?: { id: number; name: string | null; email: string | null };
  quantity: number;
  amount: number;
  status: ReservationStatus | string;
  fulfillmentStatus?: string | null;
  ticketUploadedAt?: string | null;
  deliveredAt?: string | null;
  hasTicket: boolean;
  mime?: string | null;
  size?: number | null; // bytes
  uploadUrl: string; // /api/organizer/reservations/:id/ticket
  canUpload: boolean;
  // NUEVOS (deadline/reembolso)
  ticketUploadDeadlineAt?: string | null;
  deadlineExpired?: boolean;
  refundStatus?: RefundStatus;
};

export type OrganizerReservationsResponse = {
  items: OrganizerReservationItem[];
  total: number;
  page: number;
  pageSize: number;
};

/* ========= Utils ========= */

export function extractFilenameFromContentDisposition(cd?: string | null): string | undefined {
  if (!cd) return;
  const star = cd.match(/filename\*=(?:UTF-8''|)([^;]+)/i);
  if (star && star[1]) {
    try {
      return decodeURIComponent(star[1].replace(/^["']|["']$/g, "").trim());
    } catch {
      return star[1].replace(/^["']|["']$/g, "").trim();
    }
  }
  const simple = cd.match(/filename="?([^";\n]+)"?/i);
  if (simple && simple[1]) return simple[1].trim();
}

export function triggerBrowserDownload(blob: Blob, filename = "archivo") {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function detectFileKind(contentType?: string, filename?: string) {
  const ct = (contentType || "").toLowerCase().trim();
  const name = (filename || "").toLowerCase();
  const byExt =
    name.endsWith(".pdf") ? "pdf" :
    name.match(/\.(png)$/) ? "png" :
    name.match(/\.(jpe?g)$/) ? "jpg" :
    null;

  if (ct.includes("pdf") || byExt === "pdf") return "pdf";
  if (ct.includes("png") || byExt === "png") return "png";
  if (ct.includes("jpeg") || ct.includes("jpg") || byExt === "jpg") return "jpg";
  return "file";
}

export function formatBytes(n?: number) {
  if (!n || n <= 0) return "—";
  const k = 1024;
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let v = n;
  while (v >= k && i < units.length - 1) { v /= k; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

/* ========= Comprador ========= */

export async function getTicketStatus(reservationId: number): Promise<TicketFlowStatus> {
  const { data } = await api.get(`/tickets/${reservationId}/status`);
  return data as TicketFlowStatus;
}

export async function downloadTicket(
  reservationId: number
): Promise<{ blob: Blob; filename: string }> {
  const resp = await api.get(`/tickets/${reservationId}/download`, { responseType: "blob" });
  const ct = (resp.headers?.["content-type"] as string | undefined) || "application/octet-stream";
  const blob = new Blob([resp.data], { type: ct });
  const cd = (resp.headers?.["content-disposition"] as string | undefined) ?? null;
  const filename = extractFilenameFromContentDisposition(cd) || `entrada-${reservationId}.pdf`;
  return { blob, filename };
}

export async function buyerGetTicketFile(
  reservationId: number,
  mode: "inline" | "attachment" = "inline"
): Promise<{ blob: Blob; filename?: string; contentType?: string }> {
  const resp = await api.get(`/tickets/${reservationId}/file`, {
    params: { mode },
    responseType: "blob",
  });
  const ct = (resp.headers?.["content-type"] as string | undefined) || "application/octet-stream";
  const blob = new Blob([resp.data], { type: ct });
  const cd = (resp.headers?.["content-disposition"] as string | undefined) ?? null;
  const filename = extractFilenameFromContentDisposition(cd);
  return { blob, filename, contentType: ct };
}

export async function getMyTickets(params: { q?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<TicketListResponse>("/tickets/my", { params });
  return data;
}

/** ✅ NUEVO: detalle completo de una reserva (seguimiento) */
export async function getReservationDetail(reservationId: number): Promise<ReservationDetail> {
  const { data } = await api.get(`/tickets/reservations/${reservationId}`);
  return data as ReservationDetail;
}

/** ✅ NUEVO: refrescar estado del pago asociado a la reserva */
export async function refreshPaymentStatus(reservationId: number): Promise<ReservationDetail> {
  const { data } = await api.post(`/tickets/reservations/${reservationId}/refresh-payment`);
  return data as ReservationDetail;
}

/** ✅ NUEVO: refrescar estado del flujo de ticket */
export async function refreshTicketStatus(reservationId: number): Promise<TicketFlowStatus> {
  const { data } = await api.post(`/tickets/reservations/${reservationId}/refresh-ticket`);
  return data as TicketFlowStatus;
}

/* ========= Organizador ========= */

export async function listOrganizerReservations(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
  eventId?: number;
  needsTicket?: boolean;
}): Promise<OrganizerReservationsResponse> {
  const { data } = await api.get("/organizer/reservations", { params });
  return data as OrganizerReservationsResponse;
}

export async function organizerUploadTicket(
  reservationId: number,
  file: File
): Promise<any> {
  const form = new FormData();
  form.append("ticket", file);
  const { data } = await api.post(
    `/organizer/reservations/${reservationId}/ticket`,
    form,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
}

/* ========= Admin ========= */

export async function adminListPendingTickets(params?: {
  page?: number;
  pageSize?: number;
  q?: string;
}): Promise<any> {
  const { data } = await api.get("/admin/tickets/pending", { params });
  return data;
}

export async function adminApproveTicket(reservationId: number): Promise<any> {
  const { data } = await api.post(`/admin/reservations/${reservationId}/approve-ticket`);
  return data;
}

export async function adminRejectTicket(reservationId: number, reason?: string): Promise<any> {
  const { data } = await api.post(
    `/admin/reservations/${reservationId}/reject-ticket`,
    reason ? { reason } : {}
  );
  return data;
}

/** ✅ NUEVO preferido: aprobar, capturar y crear payout en un paso */
export async function adminApproveAndCapture(reservationId: number): Promise<{
  ok: boolean; capturedAmount: number; paymentId: number; reservationId: number; payoutId?: number | null;
}> {
  const { data } = await api.post(`/admin/reservations/${reservationId}/approve-and-capture`);
  return data;
}

/** Fallback: capturar diferida si ya fue aprobada por la ruta antigua */
export async function adminCapturePayment(reservationId: number): Promise<{
  ok: boolean; capturedAmount: number; paymentId: number; reservationId: number; payoutId?: number | null;
}> {
  const { data } = await api.post("/payments/capture", { reservationId });
  return data;
}

export async function adminGetTicketFile(
  reservationId: number,
  mode: "inline" | "attachment" = "inline"
): Promise<{ blob: Blob; filename?: string }> {
  const resp = await api.get(`/admin/reservations/${reservationId}/ticket-file`, {
    params: { mode },
    responseType: "blob",
  });
  const ct = (resp.headers?.["content-type"] as string | undefined) || "application/octet-stream";
  const blob = new Blob([resp.data], { type: ct });
  const cd = (resp.headers?.["content-disposition"] as string | undefined) ?? null;
  const filename = extractFilenameFromContentDisposition(cd);
  return { blob, filename };
}

export async function adminSweepOverdue(limit?: number): Promise<{
  processed: number;
  results: Array<{ reservationId: number; ok: boolean; reason?: string }>;
}> {
  const { data } = await api.post("/admin/tickets/sweep-overdue", typeof limit === "number" ? { limit } : {});
  return data;
}

/* ========= Export por defecto ========= */
const ticketsService = {
  // Comprador
  getTicketStatus,
  downloadTicket,
  buyerGetTicketFile,
  getMyTickets,
  getReservationDetail,     // nuevo
  refreshPaymentStatus,     // nuevo
  refreshTicketStatus,      // nuevo
  // Organizador
  listOrganizerReservations,
  organizerUploadTicket,
  // Admin
  adminListPendingTickets,
  adminApproveTicket,
  adminRejectTicket,
  adminApproveAndCapture,  // nuevo
  adminCapturePayment,     // fallback
  adminGetTicketFile,
  adminSweepOverdue,
  // Utils
  extractFilenameFromContentDisposition,
  triggerBrowserDownload,
  detectFileKind,
  formatBytes,
};

export default ticketsService;









