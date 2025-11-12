// src/services/paymentsService.ts
import api from "@/services/api";

/* ===================== Tipos: pagos ===================== */

export type PendingInfo = {
  exists: boolean;
  secondsLeft?: number;
  reservation?: {
    id: number;
    eventId: number;
    quantity: number;
    amount: number;
    expiresAt?: string | null;
    createdAt: string;
  };
  lastPayment?:
    | {
        id: number;
        status: string;
        token?: string | null;
        buyOrder?: string | null;
        createdAt: string;
        authorizationExpiresAt?: string | null;
      }
    | null;
  event?: {
    title: string;
    date: string;
    price: number;
  };
};

export type PaymentStatusResponse = {
  token: string;
  tbkStatus: any | null;
  local: {
    id: number;
    status:
      | "INITIATED"
      | "AUTHORIZED"
      | "CAPTURED"
      | "COMMITTED"
      | "VOIDED"
      | "FAILED"
      | "ABORTED"
      | "TIMEOUT"
      | "REFUNDED"
      | string;
    amount: number;
    buyOrder: string | null;
    reservationId: number;
    updatedAt: string;
    authorizationExpiresAt?: string | null;
    capturedAt?: string | null;
  };
};

export type PaymentByOrderResponse = {
  local: {
    id: number;
    status:
      | "INITIATED"
      | "AUTHORIZED"
      | "CAPTURED"
      | "COMMITTED"
      | "VOIDED"
      | "FAILED"
      | "ABORTED"
      | "TIMEOUT"
      | "REFUNDED"
      | string;
    amount: number;
    buyOrder: string | null;
    reservationId: number;
    updatedAt: string;
    authorizationExpiresAt?: string | null;
    capturedAt?: string | null;
  };
};

/* ===================== Tipos: payouts ===================== */

export type PayoutStatus =
  | "PENDING"
  | "SCHEDULED"
  | "IN_TRANSIT"
  | "PAID"
  | "FAILED"
  | "CANCELED";

export type PayoutItem = {
  id: number;
  amount: number;
  currency: string;
  status: PayoutStatus | string;

  accountId?: number | null;
  reservationId?: number | null;
  paymentId?: number | null;

  pspPayoutId?: string | null;
  scheduledFor?: string | null;
  paidAt?: string | null;

  failureCode?: string | null;
  failureMessage?: string | null;

  createdAt?: string;
  updatedAt?: string;

  // contexto
  event?: { id: number; title: string; date?: string | null } | null;
  organizer?: { id: number; name: string; email: string } | null;

  // extras del payment
  buyOrder?: string | null;
  netAmount?: number | null;
  capturedAt?: string | null;

  // datos bancarios del organizador
  bankAccount?: {
    bankName?: string | null;
    accountType?: AccountType | null;
    accountNumber?: string | null;
    holderName?: string | null;
    holderRut?: string | null;
    payoutsEnabled?: boolean;
  } | null;
};

export type PayoutListResponse = {
  items: PayoutItem[];
  total?: number;
  page?: number;
  pageSize?: number;
};

export type AdminRunPayoutsResponse = {
  ok?: boolean;
  processed: number;
  results: Array<{
    payoutId: number;
    status?: PayoutStatus | string;
    paidAt?: string | null;
    error?: string | null;
  }>;
};

/* ===================== Tipos: Connected Account ===================== */

export type AccountType = "VISTA" | "CORRIENTE" | "AHORRO" | "RUT";

export type ConnectedAccount = {
  payoutsEnabled: boolean;
  payoutBankName?: string | null;
  payoutAccountType?: AccountType | null;
  payoutAccountNumber?: string | null;
  payoutHolderName?: string | null;
  payoutHolderRut?: string | null;
  updatedAt?: string;
  /** Enviado por backend; si no viene, lo calculamos en el cliente. */
  payoutsReady?: boolean;

  // (pueden venir del backend; opcional mostrarlos)
  psp?: string;
  pspAccountId?: string;
};

/* ===================== Helpers internos ===================== */

function postToWebpay(url: string, token: string) {
  // Webpay exige POST con "token_ws"
  const f = document.createElement("form");
  f.method = "POST";
  f.action = url;
  f.style.display = "none";

  const input = document.createElement("input");
  input.type = "hidden";
  input.name = "token_ws";
  input.value = token;

  f.appendChild(input);
  document.body.appendChild(f);
  f.submit();

  setTimeout(() => f.remove(), 1000);
}

function nullIfEmpty<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const k of Object.keys(obj)) {
    const v = (obj as any)[k];
    out[k] =
      v === "" || v === undefined
        ? null
        : typeof v === "string"
        ? v.trim()
        : v;
  }
  return out as T;
}

/** ✅ Calcula si la cuenta está lista para recibir payouts. */
export function isPayoutsReady(acc?: ConnectedAccount | null): boolean {
  if (!acc || !acc.payoutsEnabled) return false;
  const t = acc.payoutAccountType;
  const bank = acc.payoutBankName && acc.payoutBankName.trim();
  const num = acc.payoutAccountNumber && acc.payoutAccountNumber.trim();
  const name = acc.payoutHolderName && acc.payoutHolderName.trim();
  const rut = acc.payoutHolderRut && acc.payoutHolderRut.trim();
  const typeOk =
    t === "VISTA" || t === "CORRIENTE" || t === "AHORRO" || t === "RUT";
  return Boolean(bank && typeOk && num && name && rut);
}

/* ===================== Pagos ===================== */

export async function startPayment(eventId: number, quantity: number) {
  const { data } = await api.post("/payments/create", { eventId, quantity });
  if (!data?.url || !data?.token) {
    throw new Error("Respuesta inválida del servidor de pagos.");
  }
  postToWebpay(String(data.url), String(data.token));
}

export async function getMyPending(
  eventId: number
): Promise<PendingInfo | null> {
  const { data } = await api.get("/payments/my-pending", {
    params: { eventId },
  });
  if (!data || !data.exists) return data ?? null;
  return data as PendingInfo;
}

export async function restartPayment(reservationId: number) {
  const { data } = await api.post("/payments/restart", { reservationId });
  if (!data?.url || !data?.token) {
    throw new Error("Respuesta inválida del servidor de pagos.");
  }
  postToWebpay(String(data.url), String(data.token));
}

export async function getPaymentStatus(
  token: string
): Promise<PaymentStatusResponse> {
  if (!token) throw new Error("Falta token");
  const { data } = await api.get(
    `/payments/status/${encodeURIComponent(token)}`
  );
  return data as PaymentStatusResponse;
}

export async function getPaymentByOrder(
  buyOrder: string
): Promise<PaymentByOrderResponse> {
  if (!buyOrder) throw new Error("Falta buyOrder");
  const { data } = await api.get(
    `/payments/by-order/${encodeURIComponent(buyOrder)}`
  );
  return data as PaymentByOrderResponse;
}

/* ===== Admin: aprobar ticket + capturar (todo-en-uno) =====
   Usamos POST /payments/capture (tu backend crea el Payout PENDING si aplica) */
export async function adminApproveAndCapture(
  reservationId: number
): Promise<{
  ok: boolean;
  capturedAmount?: number;
  paymentId?: number;
  reservationId?: number;
  payoutId?: number | null;
}> {
  const { data } = await api.post("/payments/capture", { reservationId });
  return data;
}

/* ===================== Connected Account (organizador) ===================== */

export async function getMyConnectedAccount(): Promise<ConnectedAccount> {
  const { data } = await api.get("/payments/connected-account");
  const acc = (data ?? { payoutsEnabled: false }) as ConnectedAccount;
  const ready =
    typeof (acc as any).payoutsReady === "boolean"
      ? (acc as any).payoutsReady
      : isPayoutsReady(acc);
  return { ...acc, payoutsReady: ready };
}

export async function updateMyConnectedAccount(payload: {
  payoutsEnabled?: boolean;
  payoutBankName?: string | null;
  payoutAccountType?: AccountType | "" | null;
  payoutAccountNumber?: string | null;
  payoutHolderName?: string | null;
  payoutHolderRut?: string | null;
}): Promise<ConnectedAccount> {
  const body = nullIfEmpty({
    ...payload,
    payoutAccountType:
      payload.payoutAccountType === "" ? null : payload.payoutAccountType,
  });
  const { data } = await api.patch("/payments/connected-account", body);
  const acc = (data ?? { payoutsEnabled: false }) as ConnectedAccount;
  const ready =
    typeof (acc as any).payoutsReady === "boolean"
      ? (acc as any).payoutsReady
      : isPayoutsReady(acc);
  return { ...acc, payoutsReady: ready };
}

/* ===================== Payouts (organizador / admin) ===================== */

// Organizador: lista sus payouts
export async function listMyPayouts(params?: {
  page?: number;
  pageSize?: number;
  status?: PayoutStatus | ""; // "" = todos
  q?: string;
}): Promise<PayoutListResponse> {
  const { data } = await api.get("/payments/payouts/my", { params });
  if (Array.isArray(data)) {
    return {
      items: data as PayoutItem[],
      total: data.length,
      page: 1,
      pageSize: data.length,
    };
  }
  return data as PayoutListResponse;
}

// Admin: listar todos los payouts
export type AdminPayoutListParams = {
  page?: number;
  pageSize?: number;
  status?: PayoutStatus | ""; // "" = todos
  q?: string;
  organizerId?: number;
  eventId?: number;
};

export async function adminListPayouts(
  params?: AdminPayoutListParams
): Promise<PayoutListResponse> {
  const { data } = await api.get("/admin/payouts", { params });
  if (Array.isArray(data)) {
    return {
      items: data as PayoutItem[],
      total: data.length,
      page: 1,
      pageSize: data.length,
    };
  }
  return data as PayoutListResponse;
}

// Admin: marcar payout como pagado (simulación)
export async function adminMarkPayoutPaid(
  payoutId: number
): Promise<{
  ok: boolean;
  payoutId: number;
  paidAt: string | null;
}> {
  const { data } = await api.post(
    `/admin/payouts/${encodeURIComponent(payoutId)}/mark-paid`
  );
  const paidAt = data?.payout?.paidAt ?? data?.paidAt ?? null;
  return { ok: !!data?.ok, payoutId, paidAt };
}

// Admin: ejecutar batch de pagos ahora (driver http/sim)
export async function adminRunPayoutsNow(
  limit?: number
): Promise<AdminRunPayoutsResponse> {
  const body =
    typeof limit === "number" && Number.isFinite(limit) ? { limit } : {};
  const { data } = await api.post("/admin/payouts/run", body);

  const results = Array.isArray(data?.results)
    ? data.results.map((r: any) => ({
        payoutId: r?.payoutId ?? r?.id ?? 0,
        status: r?.status,
        paidAt: r?.paidAt ?? null,
        error: r?.error ?? null,
      }))
    : [];

  return {
    ok: !!data?.ok,
    processed: data?.processed ?? 0,
    results,
  };
}

/* ===================== Export por defecto ===================== */

const paymentsService = {
  // Pagos
  startPayment,
  getMyPending,
  restartPayment,
  getPaymentStatus,
  getPaymentByOrder,
  adminApproveAndCapture,
  // Connected account
  getMyConnectedAccount,
  updateMyConnectedAccount,
  isPayoutsReady,
  // Organizer payouts
  listMyPayouts,
  // Admin payouts
  adminListPayouts,
  adminMarkPayoutPaid,
  adminRunPayoutsNow,
};

export default paymentsService;











