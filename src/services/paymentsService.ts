// src/services/paymentsService.ts
import api from "@/services/api";

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
  lastPayment?: {
    id: number;
    status: string;
    token?: string | null;
    buyOrder?: string | null;
    createdAt: string;
  } | null;
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
    status: "INITIATED" | "COMMITTED" | "FAILED" | "ABORTED" | "REFUNDED" | string;
    amount: number;
    buyOrder: string | null;
    reservationId: number;
    updatedAt: string;
  };
};

export type PaymentByOrderResponse = {
  local: {
    id: number;
    status: "INITIATED" | "COMMITTED" | "FAILED" | "ABORTED" | "REFUNDED" | string;
    amount: number;
    buyOrder: string | null;
    reservationId: number;
    updatedAt: string;
  };
};

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

/**
 * Inicia un pago nuevo para un evento (crea reserva + transacción).
 */
export async function startPayment(eventId: number, quantity: number) {
  const { data } = await api.post("/payments/create", { eventId, quantity });
  if (!data?.url || !data?.token) {
    throw new Error("Respuesta inválida del servidor de pagos.");
  }
  postToWebpay(String(data.url), String(data.token));
}

/**
 * Si el usuario tiene una reserva pendiente vigente para el evento.
 */
export async function getMyPending(eventId: number): Promise<PendingInfo | null> {
  const { data } = await api.get("/payments/my-pending", { params: { eventId } });
  if (!data || !data.exists) return data ?? null;
  return data as PendingInfo;
}

/**
 * Reanuda el pago usando la MISMA reserva (genera nuevo token).
 */
export async function restartPayment(reservationId: number) {
  const { data } = await api.post("/payments/restart", { reservationId });
  if (!data?.url || !data?.token) {
    throw new Error("Respuesta inválida del servidor de pagos.");
  }
  postToWebpay(String(data.url), String(data.token));
}

/**
 * Consulta estado por token (usa GET /payments/status/:token).
 */
export async function getPaymentStatus(token: string): Promise<PaymentStatusResponse> {
  if (!token) throw new Error("Falta token");
  const { data } = await api.get(`/payments/status/${encodeURIComponent(token)}`);
  return data as PaymentStatusResponse;
}

/**
 * Consulta estado local por buyOrder (usa GET /payments/by-order/:buyOrder).
 * Útil cuando el retorno fue abortado y no hay token_ws.
 */
export async function getPaymentByOrder(buyOrder: string): Promise<PaymentByOrderResponse> {
  if (!buyOrder) throw new Error("Falta buyOrder");
  const { data } = await api.get(`/payments/by-order/${encodeURIComponent(buyOrder)}`);
  return data as PaymentByOrderResponse;
}



