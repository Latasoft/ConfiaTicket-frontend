// src/types/payout.ts
export type PayoutStatus =
  | "PENDING"
  | "SCHEDULED"
  | "IN_TRANSIT"
  | "PAID"
  | "FAILED"
  | "CANCELED";

export type AccountType = "VISTA" | "CORRIENTE" | "AHORRO" | "RUT";

export interface ConnectedAccount {
  payoutsEnabled: boolean;
  payoutBankName: string | null;
  payoutAccountType: AccountType | null;
  payoutAccountNumber: string | null;
  payoutHolderName: string | null;
  payoutHolderRut: string | null;

  // extra que devuelve el backend
  payoutsReady?: boolean;
  updatedAt?: string;
  psp?: string;
  pspAccountId?: string;
}

export interface PayoutListItem {
  id: number;
  status: PayoutStatus;
  amount: number;
  currency: string;
  paidAt: string | null;
  scheduledFor: string | null;
  reservationId: number | null;
  paymentId: number | null;

  // contexto adicional
  buyOrder: string | null;
  netAmount: number | null;
  capturedAt: string | null;
  event: { id: number; title: string; date: string } | null;
  organizer?: { id: number; name: string; email: string } | null;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
