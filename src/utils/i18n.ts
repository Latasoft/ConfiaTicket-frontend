// src/utils/i18n.ts
export function tReservationStatus(s?: string | null): string {
  switch (s) {
    case "PAID": return "Pagado";
    case "PENDING_PAYMENT": return "Pendiente de pago";
    case "CANCELED": return "Cancelado";
    case "EXPIRED": return "Expirado";
    default: return s ?? "—";
  }
}

export function tFulfillmentStatus(s?: string | null): string {
  switch (s) {
    case "WAITING_TICKET":  return "Esperando archivo";
    case "TICKET_UPLOADED": return "Archivo subido (en revisión)";
    case "TICKET_APPROVED": return "Aprobada";
    case "TICKET_REJECTED": return "Rechazada";
    case "DELIVERED":       return "Entregada";
    default: return s ?? "—";
  }
}

export function tRefundStatus(s?: string | null): string {
  switch (s) {
    case "REQUESTED": return "Reembolso solicitado";
    case "SUCCEEDED": return "Reembolso exitoso";
    case "FAILED":    return "Reembolso fallido";
    case "NONE":
    default: return "—";
  }
}

export function tMimeShort(ct?: string | null): string {
  const mime = (ct || "").toLowerCase();
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("png")) return "PNG";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "JPG";
  return "archivo";
}
