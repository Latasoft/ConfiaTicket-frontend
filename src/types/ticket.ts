// src/types/ticket.ts

export interface ResaleTicket {
  id: number;
  eventId: number;
  ticketCode: string;
  row: string;
  seat: string;
  zone: string | null;
  level: string | null;
  imageFilePath: string;
  imageFileName: string;
  imageMime: string;
  sold: boolean;
  soldAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventSection {
  id: number;
  eventId: number;
  name: string;
  rowStart: string | null;
  rowEnd: string | null;
  seatsPerRow: number | null;
  seatStart: number | null;
  seatEnd: number | null;
  totalCapacity: number;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  // Información de disponibilidad (desde backend)
  reserved?: number;
  available?: number;
}

export interface TicketPurchaseRequest {
  eventId: number;
  quantity: number;
  // Para RESALE
  ticketId?: number;
  // Para OWN
  sectionId?: number;
  seatAssignment?: string;
}

export interface ReservationWithTicket {
  id: number;
  eventId: number;
  quantity: number;
  amount: number;
  status: 'PENDING_PAYMENT' | 'PAID' | 'EXPIRED' | 'CANCELED';
  code: string;
  expiresAt: Date | null;
  paidAt: Date | null;
  createdAt: Date;
  // Información del evento
  event?: {
    id: number;
    title: string;
    date: Date | string;
    eventType: 'OWN' | 'RESALE';
  };
  // Para eventos OWN
  generatedPdfPath: string | null;
  qrCode: string | null;
  seatAssignment: string | null;
  scanned?: boolean;
  scannedAt?: Date | null;
  // Para eventos RESALE
  ticket?: ResaleTicket;
}
