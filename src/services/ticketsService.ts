// src/services/ticketsService.ts
import api from "@/services/api";

/* ========= Tipos compartidos ========= */

export type ReservationStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "CANCELED"
  | "EXPIRED";

export type RefundStatus = "NONE" | "REQUESTED" | "SUCCEEDED" | "FAILED";

/**
 * FulfillmentStatus - Para eventos RESALE donde el organizador sube tickets manualmente
 */
export type FulfillmentStatus = 
  | "WAITING_TICKET"
  | "TICKET_UPLOADED" 
  | "TICKET_APPROVED"
  | "TICKET_REJECTED"
  | "DELIVERED"
  | null;

/**
 * NUEVO FLUJO (OWN events): Ya no hay fulfillmentStatus LEGACY
 * El flujo ahora es:
 * 1. HOLD → reserva temporal
 * 2. PAID → pago confirmado
 * 3. GENERATED → tickets generados automáticamente (con retry 3x)
 * 
 * El frontend solo necesita verificar: status === "PAID" && hasTicket
 */
export interface BookingStatus {
  id: number;
  status: ReservationStatus;
  paidAt?: string | null;
  expiresAt?: string | null;
  hasTicket: boolean;
  ticketReady: boolean; // true si PAID + hasTicket
}

/**
 * ResaleBookingStatus - Para eventos RESALE con flujo manual de tickets
 */
export interface ResaleBookingStatus {
  id: number;
  status: ReservationStatus;
  fulfillmentStatus: FulfillmentStatus;
  ticketUploadedAt?: string | null;
  approvedAt?: string | null;
  deliveredAt?: string | null;
  rejectionReason?: string | null;
  ticketUploadDeadlineAt?: string | null;
  refundStatus?: RefundStatus;
  refundedAt?: string | null;
  paidAt?: string | null;
  expiresAt?: string | null;
}

/* ========= Tipos para detalle de reserva (seguimiento) ========= */

export type ReservationDetail = {
  ok: boolean;
  reservation: {
    id: number;
    status: ReservationStatus;
    createdAt: string;
    quantity: number;
    amount: number;
    paidAt?: string | null;
    expiresAt?: string | null;
    generatedPdfPath?: string | null;
    qrCode?: string | null;
    event?: {
      id: number;
      title: string;
      date: string | null;
      location?: string | null;
      coverImageUrl?: string | null;
    } | null;
    payment?: {
      id: number;
      status: string;
      amount: number;
      updatedAt: string | null;
    } | null;
  };
};

/* ========= Tipos para listado (Mis entradas - comprador) ========= */

export type TicketListItem = {
  reservationId: number;
  id: number;
  eventId: number;
  code: string | null;
  status: ReservationStatus;
  paidAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  event?: {
    id: number;
    title: string;
    date: string | null;
    eventType: "OWN" | "RESALE";
    location?: string | null;
    coverImageUrl?: string | null;
  };
  quantity: number;
  amount: number;
  // OWN events
  generatedPdfPath?: string | null;
  qrCode?: string | null;
  seatAssignment?: string | null;
  scanned?: boolean | null;
  scannedAt?: string | null;
  // RESALE ticket
  ticket?: {
    id: number;
    ticketCode: string | null;
    row?: string | null;
    seat?: string | null;
    zone?: string | null;
    level?: string | null;
  } | null;
  // Download
  canDownload: boolean;
  downloadUrl: string;
  previewUrl: string;
};

export type TicketListResponse = {
  items: TicketListItem[];
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

/**
 * GET /api/bookings/:id/status
 * Reemplaza getTicketStatus de LEGACY
 */
export async function getBookingStatus(reservationId: number): Promise<BookingStatus> {
  const { data } = await api.get(`/bookings/${reservationId}/status`);
  return data as BookingStatus;
}

/**
 * GET /api/bookings/:id/ticket
 * Reemplaza downloadTicket de LEGACY
 */
export async function downloadTicket(
  reservationId: number
): Promise<{ blob: Blob; filename: string }> {
  const resp = await api.get(`/bookings/${reservationId}/ticket`, { responseType: "blob" });
  const ct = (resp.headers?.["content-type"] as string | undefined) || "application/octet-stream";
  const blob = new Blob([resp.data], { type: ct });
  const cd = (resp.headers?.["content-disposition"] as string | undefined) ?? null;
  const filename = extractFilenameFromContentDisposition(cd) || `entrada-${reservationId}.pdf`;
  return { blob, filename };
}

/**
 * GET /api/bookings/:id/ticket (modo inline para preview)
 */
export async function buyerGetTicketFile(
  reservationId: number,
  mode: "inline" | "attachment" = "inline"
): Promise<{ blob: Blob; filename?: string; contentType?: string }> {
  const resp = await api.get(`/bookings/${reservationId}/ticket`, {
    params: { mode },
    responseType: "blob",
  });
  const ct = (resp.headers?.["content-type"] as string | undefined) || "application/octet-stream";
  const blob = new Blob([resp.data], { type: ct });
  const cd = (resp.headers?.["content-disposition"] as string | undefined) ?? null;
  const filename = extractFilenameFromContentDisposition(cd);
  return { blob, filename, contentType: ct };
}

/**
 * GET /api/bookings/my-tickets
 * Reemplaza /tickets/my de LEGACY
 */
export async function getMyTickets(params: { q?: string; page?: number; pageSize?: number }) {
  const { data } = await api.get<TicketListResponse>("/bookings/my-tickets", { params });
  return data;
}

/**
 * GET /api/bookings/:id
 * Reemplaza getReservationDetail de LEGACY
 */
export async function getReservationDetail(reservationId: number): Promise<ReservationDetail> {
  const { data } = await api.get(`/bookings/${reservationId}`);
  return data as ReservationDetail;
}

/**
 * POST /api/bookings/:id/refresh-payment
 * Reemplaza refreshPaymentStatus de LEGACY
 */
export async function refreshPaymentStatus(reservationId: number): Promise<ReservationDetail> {
  const { data } = await api.post(`/bookings/${reservationId}/refresh-payment`);
  return data as ReservationDetail;
}

/**
 * POST /api/bookings/:id/refresh-ticket
 * Reemplaza refreshTicketStatus de LEGACY
 */
export async function refreshTicketStatus(reservationId: number): Promise<BookingStatus> {
  const { data } = await api.post(`/bookings/${reservationId}/refresh-ticket`);
  return data as BookingStatus;
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
  getBookingStatus,      // reemplaza getTicketStatus
  downloadTicket,
  buyerGetTicketFile,
  getMyTickets,
  getReservationDetail,
  refreshPaymentStatus,
  refreshTicketStatus,
  // Admin
  adminListPendingTickets,
  adminApproveTicket,
  adminRejectTicket,
  adminApproveAndCapture,
  adminCapturePayment,
  adminGetTicketFile,
  adminSweepOverdue,
  // Utils
  extractFilenameFromContentDisposition,
  triggerBrowserDownload,
  detectFileKind,
  formatBytes,
};

export default ticketsService;









