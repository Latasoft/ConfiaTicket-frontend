// src/pages/ReservationDetail.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  getReservationDetail as apiGetReservationDetail,
  refreshPaymentStatus as apiRefreshPaymentStatus,
  refreshTicketStatus as apiRefreshTicketStatus,
} from "@/services/ticketsService";

/** Tipos ligeros (flexibles) para no acoplar al backend */
type Reservation = {
  id: number;
  code?: string;
  status?: "PENDING_PAYMENT" | "PAID" | "CANCELED" | "EXPIRED" | string;
  amount?: number;
  expiresAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  event?: {
    id?: number;
    title?: string;
    date?: string | null;
    location?: string | null;
    venue?: string | null;
    city?: string | null;
  } | null;
  payment?: Payment | null;
  // flujo de ticket
  fulfillmentStatus?: "WAITING_TICKET" | "TICKET_UPLOADED" | "TICKET_APPROVED" | "TICKET_REJECTED" | "DELIVERED" | string;
  ticketUploadDeadlineAt?: string | null;
  // archivo
  ticketFileName?: string | null;
  ticketMime?: string | null;
  ticketSize?: number | null;
};

type Payment = {
  id?: number;
  token?: string | null;
  buyOrder?: string | null;
  status?:
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
  amount?: number | null;
  currency?: string | null;

  // autorización diferida
  isDeferredCapture?: boolean | null;
  authorizationExpiresAt?: string | null; // plazo para capturar / subir ticket
  authorizedAmount?: number | null;
  capturedAmount?: number | null;

  // split/escrow (opcional)
  capturePolicy?: "IMMEDIATE" | "MANUAL_ON_APPROVAL" | string;
  escrowStatus?: "NONE" | "HELD" | "RELEASED" | "RELEASE_FAILED" | "EXPIRED" | string;

  transactionDate?: string | null;
};

function fmtCLP(v?: number | null) {
  if (typeof v !== "number") return "—";
  try {
    return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(v);
  } catch {
    return `$${v}`;
  }
}

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("es-CL", {
      dateStyle: "short",
      timeStyle: "medium",
    }).format(d);
  } catch {
    return iso ?? "—";
  }
}

function useCountdown(targetIso?: string | null) {
  const [left, setLeft] = useState<number>(0);
  const ref = useRef<number | null>(null);

  useEffect(() => {
    if (!targetIso) {
      setLeft(0);
      return;
    }
    const tick = () => {
      const now = Date.now();
      const limit = new Date(targetIso).getTime();
      setLeft(Math.max(0, Math.floor((limit - now) / 1000)));
    };
    tick();
    if (ref.current) clearInterval(ref.current);
    ref.current = window.setInterval(tick, 1_000) as unknown as number;
    return () => {
      if (ref.current) clearInterval(ref.current);
      ref.current = null;
    };
  }, [targetIso]);

  const mmss = useMemo(() => {
    const h = Math.floor(left / 3600);
    const m = Math.floor((left % 3600) / 60);
    const s = left % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }, [left]);

  return { seconds: left, label: mmss };
}

export default function ReservationDetail() {
  const { id } = useParams<{ id: string }>();
  const reservationId = Number(id);
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [resv, setResv] = useState<Reservation | null>(null);
  const [busy, setBusy] = useState<"pay" | "ticket" | null>(null);

  const pay = resv?.payment ?? undefined;

  // ¿captura diferida?
  const deferred = Boolean(pay?.isDeferredCapture) || pay?.capturePolicy === "MANUAL_ON_APPROVAL";
  const authDeadline = pay?.authorizationExpiresAt || resv?.ticketUploadDeadlineAt || null; // usamos cualquiera disponible
  const { seconds, label } = useCountdown(authDeadline);

  // Mostrar banner solo si:
  // - es diferido
  // - el pago está AUTHORIZED (o en escrow HELD)
  // - NO está aprobado/entregado
  // - y el plazo no venció
  const showYellowBanner =
    deferred &&
    (pay?.status === "AUTHORIZED" || pay?.escrowStatus === "HELD" || resv?.status === "PENDING_PAYMENT") &&
    resv?.fulfillmentStatus !== "TICKET_APPROVED" &&
    resv?.fulfillmentStatus !== "DELIVERED" &&
    !!authDeadline &&
    new Date(authDeadline).getTime() > Date.now();

  async function fetchReservation() {
    if (!reservationId || Number.isNaN(reservationId)) {
      setErr("ID de reserva inválido.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setErr(null);
    try {
      const data = await apiGetReservationDetail(reservationId);
      setResv(data as any);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error || e?.response?.data?.message || e?.message || "No se pudo cargar la reserva.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReservation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationId]);

  async function refreshPayment() {
    if (!resv) return;
    try {
      setBusy("pay");
      await apiRefreshPaymentStatus(resv.id);
    } catch {
      /* noop */
    } finally {
      setBusy(null);
      fetchReservation();
    }
  }

  async function refreshTicket() {
    if (!resv) return;
    try {
      setBusy("ticket");
      await apiRefreshTicketStatus(resv.id);
    } catch {
      /* noop */
    } finally {
      setBusy(null);
      fetchReservation();
    }
  }

  // Etiquetas de estado
  const paymentLabel = (() => {
    if (!pay?.status) return "—";
    const map: Record<string, string> = {
      INITIATED: "Iniciado",
      AUTHORIZED: "Pre-autorizado",
      CAPTURED: "Capturado",
      COMMITTED: "Confirmado",
      VOIDED: "Anulado",
      FAILED: "Fallido",
      ABORTED: "Abortado",
      TIMEOUT: "Tiempo agotado",
      REFUNDED: "Reembolsado",
    };
    return map[pay.status] || pay.status;
  })();

  const reservationLabel = (() => {
    const s = resv?.status;
    if (!s) return "—";
    const map: Record<string, string> = {
      PENDING_PAYMENT: "Pendiente de pago / captura",
      PAID: "Pagado",
      CANCELED: "Cancelado",
      EXPIRED: "Vencido",
    };
    return map[s] || s;
  })();

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Detalle de mi reserva</h1>

      {loading && <div className="rounded-md p-4 bg-gray-100 animate-pulse">Cargando…</div>}

      {!loading && err && (
        <div className="rounded-md p-4 bg-red-50 text-red-800 border border-red-200">{err}</div>
      )}

      {!loading && !err && resv && (
        <>
          {showYellowBanner && (
            <div className="mb-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="font-semibold mb-1">Pago pre-autorizado</div>
              <p className="text-sm">
                Tu pago quedó <b>pre-autorizado</b>. El organizador tiene hasta el plazo indicado para subir tu
                entrada. Si no lo hace dentro de ese plazo, <b>te devolveremos tu dinero automáticamente</b>.
              </p>
              <p className="text-sm mt-2">
                Plazo: <b>{fmtDateTime(authDeadline)}</b>{" "}
                — tiempo restante: <b>{seconds > 0 ? label : "Plazo vencido"}</b>
              </p>
              {resv.ticketUploadDeadlineAt && (
                <p className="text-xs mt-1 text-amber-800">
                  (Plazo para subir ticket: {fmtDateTime(resv.ticketUploadDeadlineAt)})
                </p>
              )}
            </div>
          )}

          <div className="rounded-lg border p-4 space-y-4">
            {/* Encabezado / Evento */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm text-gray-500">Reserva</div>
                <div className="text-lg font-semibold">
                  #{resv.id}
                  {resv.code ? ` — ${resv.code}` : ""}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Estado</div>
                <div className="font-semibold">{reservationLabel}</div>
              </div>
            </div>

            {resv.event?.title && (
              <div className="rounded-md bg-gray-50 p-3">
                <div className="text-sm text-gray-600">Evento</div>
                <div className="font-medium">
                  {resv.event.title}{" "}
                  {resv.event.id ? (
                    <Link to={`/eventos/${resv.event.id}`} className="text-indigo-600 hover:underline ml-2">
                      Ver evento
                    </Link>
                  ) : null}
                </div>
                <div className="text-sm text-gray-600">
                  {fmtDateTime(resv.event.date)}{" "}
                  {resv.event.venue || resv.event.location ? `— ${resv.event.venue ?? resv.event.location}` : ""}
                  {resv.event.city ? `, ${resv.event.city}` : ""}
                </div>
              </div>
            )}

            {/* Resumen principal */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-md border p-3">
                <div className="text-sm text-gray-500 mb-1">Orden de compra</div>
                <div className="font-mono">{pay?.buyOrder || "—"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-sm text-gray-500 mb-1">Monto</div>
                <div className="font-semibold">{fmtCLP(pay?.amount ?? resv.amount ?? null)}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-sm text-gray-500 mb-1">Token</div>
                <div className="font-mono break-all">{pay?.token || "—"}</div>
              </div>
              <div className="rounded-md border p-3">
                <div className="text-sm text-gray-500 mb-1">Estado del pago</div>
                <div className="font-semibold">{paymentLabel}</div>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/eventos")}
                className="px-3 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Ver más eventos
              </button>
              <button onClick={() => navigate("/")} className="px-3 py-2 rounded border hover:bg-black/5">
                Volver al inicio
              </button>
              <button
                onClick={() => navigate("/mis-entradas")}
                className="px-3 py-2 rounded border hover:bg-black/5"
              >
                Ver mis entradas
              </button>
              <button
                onClick={refreshPayment}
                disabled={busy === "pay"}
                className="px-3 py-2 rounded border hover:bg-black/5 disabled:opacity-60"
                title="Vuelve a consultar el estado del pago en el PSP"
              >
                {busy === "pay" ? "Actualizando pago…" : "Refrescar estado pago"}
              </button>
              <button
                onClick={refreshTicket}
                disabled={busy === "ticket"}
                className="px-3 py-2 rounded border hover:bg-black/5 disabled:opacity-60"
                title="Vuelve a consultar si el ticket ya fue subido/aprobado"
              >
                {busy === "ticket" ? "Actualizando ticket…" : "Refrescar estado ticket"}
              </button>
            </div>

            {/* Información técnica opcional */}
            <details className="pt-2">
              <summary className="cursor-pointer text-sm text-gray-600">Información técnica (opcional)</summary>
              <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-md bg-gray-50 p-3">
                  <div className="text-gray-500">Reserva</div>
                  <pre className="mt-1 whitespace-pre-wrap text-xs">
                    {JSON.stringify(
                      {
                        id: resv.id,
                        code: resv.code,
                        status: resv.status,
                        amount: resv.amount,
                        createdAt: resv.createdAt,
                        updatedAt: resv.updatedAt,
                        expiresAt: resv.expiresAt,
                        fulfillmentStatus: resv.fulfillmentStatus,
                        ticketUploadDeadlineAt: resv.ticketUploadDeadlineAt,
                      },
                      null,
                      2
                    )}
                  </pre>
                </div>
                <div className="rounded-md bg-gray-50 p-3">
                  <div className="text-gray-500">Pago</div>
                  <pre className="mt-1 whitespace-pre-wrap text-xs">{JSON.stringify(pay ?? {}, null, 2)}</pre>
                </div>
              </div>
            </details>
          </div>
        </>
      )}
    </div>
  );
}




