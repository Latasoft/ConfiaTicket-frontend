// src/pages/PaymentResult.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getPaymentStatus, getPaymentByOrder } from "@/services/paymentsService";
import api from "@/services/api";

type LocalStatus =
  | "success"
  | "authorized"          // ✅ pre-autorizado (captura diferida)
  | "failed"
  | "aborted"
  | "timeout"             // ✅ pago expiró (Webpay timeout)
  | "error"               // ✅ error general del sistema
  | "own-event-forbidden"
  | "unknown";

type TicketFlowStatus = {
  id: number;
  status: "PENDING_PAYMENT" | "PAID" | "CANCELED" | "EXPIRED";
  fulfillmentStatus:
    | "WAITING_TICKET"
    | "TICKET_UPLOADED"
    | "TICKET_APPROVED"
    | "TICKET_REJECTED"
    | "DELIVERED";
  ticketUploadedAt?: string | null;
  approvedAt?: string | null;
  deliveredAt?: string | null;
  rejectionReason?: string | null;
  ticketUploadDeadlineAt?: string | null;
  refundStatus?: "NONE" | "REQUESTED" | "SUCCEEDED" | "FAILED";
};

function formatMoneyCLP(v: number | null | undefined) {
  if (v == null) return "—";
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `$${v}`;
  }
}

function formatHMS(seconds: number) {
  const s = Math.max(0, seconds | 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(r)}`;
}

export default function PaymentResult() {
  const [params] = useSearchParams();

  // ¿Viene de flujo normal o reventa?
  const typeParam = (params.get("type") || "").toLowerCase(); // "" | "resale"
  const isResale = typeParam === "resale";

  // Parámetros comunes que envía el backend en la redirección
  const statusParam = (params.get("status") || "").toLowerCase() as LocalStatus;
  const token = params.get("token") || "";
  const buyOrderParam = params.get("buyOrder") || "";
  const amountParam = params.get("amount");
  const errorParam = params.get("error") || ""; // ✅ mensaje de error personalizado

  // Parámetros específicos
  const reservationIdParam = params.get("reservationId") || "";
  const eventIdParam = params.get("eventId") || "";
  const orderIdParam = params.get("orderId") || ""; // reventa

  // ✅ NUEVO: plazo para subida (cuando commit devolvió autorizado)
  const uploadDeadlineAt = params.get("uploadDeadlineAt") || "";

  const [loading, setLoading] = useState<boolean>(!!(token || buyOrderParam));
  const [error, setError] = useState<string | null>(null);
  const [tbkInfo, setTbkInfo] = useState<Record<string, unknown> | null>(null);
  const [localInfo, setLocalInfo] = useState<{
    status?: string;
    amount?: number;
    buyOrder?: string;
    reservationId?: number;
    updatedAt?: string;
  } | null>(null);

  // Estado del flujo de ticket
  const [ticketStatus, setTicketStatus] = useState<TicketFlowStatus | null>(null);
  const [downloading, setDownloading] = useState(false);

  // ✅ contador hacia el deadline (si viene)
  const [deadlineLeft, setDeadlineLeft] = useState<number | null>(null);
  useEffect(() => {
    if (!uploadDeadlineAt) {
      setDeadlineLeft(null);
      return;
    }
    const target = new Date(uploadDeadlineAt).getTime();
    const tick = () =>
      setDeadlineLeft(Math.max(0, Math.floor((target - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [uploadDeadlineAt]);

  const amountFromQuery = useMemo(() => {
    const n = Number(amountParam);
    return Number.isFinite(n) ? n : undefined;
  }, [amountParam]);

  const localStatus: LocalStatus = useMemo(() => {
    // Si el backend puso algo explícito en la URL, respétalo
    if (
      statusParam === "success" ||
      statusParam === "failed" ||
      statusParam === "aborted" ||
      statusParam === "timeout" ||
      statusParam === "error" ||
      statusParam === "own-event-forbidden" ||
      statusParam === "authorized"
    ) {
      return statusParam;
    }
    // Si no vino, inferimos por estado local del pago
    if (localInfo?.status === "COMMITTED" || localInfo?.status === "CAPTURED") return "success";
    if (localInfo?.status === "AUTHORIZED") return "authorized";
    if (localInfo?.status === "FAILED") return "failed";
    if (localInfo?.status === "ABORTED") return "aborted";
    return "unknown";
  }, [statusParam, localInfo?.status]);

  // Etiqueta amigable para el resumen
  const displayStatus = useMemo(() => {
    switch (localStatus) {
      case "success":
        return "Aprobado";
      case "authorized":
        return "Pre-autorizado (pendiente de captura)";
      case "failed":
        return "Rechazado";
      case "aborted":
        return "Cancelado";
      case "timeout":
        return "Expirado";
      case "error":
        return "Error";
      case "own-event-forbidden":
        return "Acción no permitida";
      default:
        return "En revisión";
    }
  }, [localStatus]);

  // Consultar estado pago (TBK + local o solo local por buyOrder)
  useEffect(() => {
    let active = true;
    (async () => {
      if (!token && !buyOrderParam) {
        setLoading(false);
        return;
      }
      setLoading(true);
      setError(null);
      try {
        if (token) {
          const data = await getPaymentStatus(token);
          if (!active) return;
          setLocalInfo({
            status: (data?.local?.status ?? undefined) as string | undefined,
            amount: (data?.local?.amount ?? undefined) as number | undefined,
            buyOrder: (data?.local?.buyOrder ?? undefined) as string | undefined,
            reservationId: (data?.local?.reservationId ?? undefined) as number | undefined,
            updatedAt: (data?.local?.updatedAt ?? undefined) as string | undefined,
          });
          setTbkInfo(data?.tbkStatus ?? null);
        } else if (buyOrderParam) {
          const data = await getPaymentByOrder(buyOrderParam);
          if (!active) return;
          const l = data?.local;
          setLocalInfo({
            status: l?.status as string | undefined,
            amount: l?.amount as number | undefined,
            buyOrder: (l?.buyOrder ?? buyOrderParam) as string | undefined,
            reservationId: l?.reservationId as number | undefined,
            updatedAt: l?.updatedAt as string | undefined,
          });
          setTbkInfo(null);
        }
      } catch (e) {
        if (!active) return;
        const error = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
        const errText =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          error?.message ||
          "No se pudo obtener el estado del pago.";
        setError(errText);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [token, buyOrderParam]);

  // Si el pago fue aprobado o autorizado y hay reservationId, consultamos el estado del ticket
  useEffect(() => {
    const id = Number(reservationIdParam || (localInfo?.reservationId ?? ""));
    if ((localStatus !== "success" && localStatus !== "authorized") || !Number.isFinite(id)) {
      setTicketStatus(null);
      return;
    }
    let active = true;
    (async () => {
      try {
        const { data } = await api.get(`/tickets/${id}/status`);
        if (!active) return;
        setTicketStatus(data as TicketFlowStatus);
      } catch {
        // No bloquea la vista si falla
      }
    })();
    return () => {
      active = false;
    };
  }, [localStatus, reservationIdParam, localInfo?.reservationId]);

  const amountToShow =
    amountFromQuery ?? (localInfo?.amount != null ? localInfo.amount : undefined);

  const buyOrderToShow = buyOrderParam || localInfo?.buyOrder || "—";
  const reservationIdToShow =
    reservationIdParam ||
    (localInfo?.reservationId != null ? String(localInfo.reservationId) : "—");

  // Mensaje según estado de fulfillment
  const ticketMessage = useMemo(() => {
    switch (ticketStatus?.fulfillmentStatus) {
      case "WAITING_TICKET":
        return "Pago recibido. El organizador debe subir tu entrada. Te avisaremos cuando lo haga.";
      case "TICKET_UPLOADED":
        return "El organizador subió la entrada. Está en revisión por un administrador.";
      case "TICKET_APPROVED":
        return "¡Entrada aprobada! Ya puedes descargarla.";
      case "DELIVERED":
        return "Entrada entregada. Puedes volver a descargarla cuando quieras.";
      case "TICKET_REJECTED":
        return `La entrada fue rechazada por el administrador${
          ticketStatus.rejectionReason ? `: ${ticketStatus.rejectionReason}` : ""
        }. El organizador deberá subir una nueva.`;
      default:
        return null;
    }
  }, [ticketStatus]);

  // Descargar usando el endpoint seguro (con Authorization)
  async function handleDownload() {
    try {
      const id = Number(reservationIdParam || localInfo?.reservationId);
      if (!Number.isFinite(id)) return;
      setDownloading(true);
      const resp = await api.get(`/tickets/${id}/download`, { responseType: "blob" });
      const blob = new Blob([resp.data]);
      const cd = resp.headers?.["content-disposition"] as string | undefined;
      const match = cd?.match(/filename\*?=(?:UTF-8''|")?([^";\n]+)/i);
      const filename = match ? decodeURIComponent(match[1]) : `entrada-${id}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      const error = e as { response?: { data?: { error?: string } }; message?: string };
      setError(
        error?.response?.data?.error ||
          error?.message ||
          "No se pudo descargar la entrada. Intenta nuevamente."
      );
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-2xl mx-auto">
      {/* Encabezados según estado */}
      {localStatus === "success" && (
        <div className="mb-4 glass border border-neon-green/50 rounded-lg p-4 text-white">
          <h1 className="text-xl font-semibold">
            ¡Pago aprobado{isResale ? " (reventa)" : ""}!
          </h1>
          {isResale ? (
            <p className="text-sm text-dark-100">
              El aviso fue pausado y ahora <strong>el vendedor debe subir la entrada</strong>.
              Cuando un administrador la apruebe, podrás confirmar la recepción para liberar el pago.
            </p>
          ) : (
            <>
              <p className="text-sm text-dark-100">Tu transacción fue confirmada correctamente.</p>
              {ticketMessage && <p className="mt-1 text-sm text-dark-100">{ticketMessage}</p>}
              {!ticketMessage && (
                <p className="mt-1 text-sm text-dark-200">Consultando estado del ticket…</p>
              )}
            </>
          )}
        </div>
      )}

      {localStatus === "authorized" && (
        <div className="mb-4 glass border border-neon-yellow/50 rounded-lg p-4 text-white">
          <h1 className="text-xl font-semibold">Pago pre-autorizado</h1>
          <p className="text-sm text-dark-100">
            Tu pago quedó <strong>pre-autorizado</strong>.{" "}
            <strong>El organizador tiene {uploadDeadlineAt ? "hasta el plazo indicado" : "24 horas"}</strong>{" "}
            para subir tu entrada. Si no lo hace dentro de ese plazo,{" "}
            <strong>te devolveremos tu dinero automáticamente</strong>.
          </p>
          {uploadDeadlineAt && (
            <p className="mt-1 text-sm text-dark-100">
              Plazo: <b>{new Date(uploadDeadlineAt).toLocaleString()}</b>
              {deadlineLeft != null && (
                <> • tiempo restante: <b>{formatHMS(deadlineLeft)}</b></>
              )}
            </p>
          )}
          {ticketMessage && <p className="mt-1 text-sm text-dark-100">{ticketMessage}</p>}
        </div>
      )}

      {localStatus === "failed" && (
        <div className="mb-4 glass border border-red-500/50 rounded-lg p-4 text-white">
          <h1 className="text-xl font-semibold">Pago rechazado</h1>
          <p className="text-sm text-dark-100">
            {errorParam || "No pudimos confirmar la transacción."}{" "}
            Si el problema persiste, intenta nuevamente o usa otro medio de pago.
          </p>
        </div>
      )}

      {localStatus === "aborted" && (
        <div className="mb-4 glass border border-neon-yellow/50 rounded-lg p-4 text-white">
          <h1 className="text-xl font-semibold">Pago cancelado</h1>
          <p className="text-sm text-dark-100">
            Cancelaste el pago en Webpay.{" "}
            {isResale
              ? "Puedes reintentarlo desde Mis órdenes de reventa."
              : "Puedes volver al evento y reintentar cuando quieras."}
          </p>
        </div>
      )}

      {localStatus === "timeout" && (
        <div className="mb-4 glass border border-neon-orange/50 rounded-lg p-4 text-white">
          <h1 className="text-xl font-semibold">Pago expirado</h1>
          <p className="text-sm text-dark-100">
            {errorParam || "El pago expiró o fue cancelado. Tu reserva ha sido liberada."}{" "}
            {isResale
              ? "Puedes reintentarlo desde Mis órdenes de reventa."
              : "Puedes volver al evento y reintentar cuando quieras."}
          </p>
        </div>
      )}

      {localStatus === "error" && (
        <div className="mb-4 glass border border-red-500/50 rounded-lg p-4 text-white">
          <h1 className="text-xl font-semibold">Error en el pago</h1>
          <p className="text-sm text-dark-100">
            {errorParam || "Ocurrió un error al procesar tu pago."}{" "}
            Si el problema persiste, contacta a soporte.
          </p>
        </div>
      )}

      {localStatus === "own-event-forbidden" && (
        <div className="mb-4 glass border border-red-500/50 rounded-lg p-4 text-white">
          <h1 className="text-xl font-semibold">Acción no permitida</h1>
          <p className="text-sm text-dark-100">
            No puedes comprar entradas de tu propio evento. La reserva asociada fue cancelada.
          </p>
        </div>
      )}

      {localStatus === "unknown" && (
        <div className="mb-4 glass-light border border-dark-600 rounded-lg p-4 text-white">
          <h1 className="text-xl font-semibold">Estado en revisión</h1>
          <p className="text-sm text-dark-200">
            No pudimos determinar el estado del pago todavía. A continuación te mostramos la información disponible.
          </p>
        </div>
      )}

      {/* Resumen */}
      <div className="card-modern p-4">
        <h2 className="text-lg font-semibold text-white mb-3">
          {isResale ? "Resumen de reventa" : "Resumen de transacción"}
        </h2>

        {/* Vista RESALE */}
        {isResale ? (
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Orden de reventa</dt>
              <dd className="font-medium">{orderIdParam || "—"}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Compra (buyOrder)</dt>
              <dd className="font-medium">{buyOrderToShow}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Monto</dt>
              <dd className="font-medium">
                {amountToShow != null ? formatMoneyCLP(amountToShow) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Token</dt>
              <dd className="font-mono text-xs break-all">{token || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Estado del pago</dt>
              <dd className="font-medium">{displayStatus}</dd>
            </div>
          </dl>
        ) : (
          // Vista NORMAL (eventos)
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Orden de compra</dt>
              <dd className="font-medium">{buyOrderToShow}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Monto</dt>
              <dd className="font-medium">
                {amountToShow != null ? formatMoneyCLP(amountToShow) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Reserva</dt>
              <dd className="font-medium">{reservationIdToShow}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Token</dt>
              <dd className="font-mono text-xs break-all">{token || "—"}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Estado</dt>
              <dd className="font-medium">{displayStatus}</dd>
            </div>
          </dl>
        )}

        {/* Acciones */}
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          {/* NUEVO: Ver resumen/seguimiento de la reserva */}
          {!isResale && reservationIdToShow !== "—" && (
            <Link
              to={`/reservas/${reservationIdToShow}`}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              Ver resumen / seguimiento
            </Link>
          )}

          {isResale ? (
            <>
              <Link
                to="/reventa/mis-ordenes"
                className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Ir a mis órdenes de reventa
              </Link>
              <Link
                to="/reventa"
                className="inline-flex items-center justify-center rounded-md px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Ver más reventas
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/eventos"
                className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700"
              >
                Ver más eventos
              </Link>

              {eventIdParam ? (
                <Link
                  to={`/eventos/${eventIdParam}`}
                  className="inline-flex items-center justify-center rounded-md px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Volver al evento
                </Link>
              ) : (
                <Link
                  to="/"
                  className="inline-flex items-center justify-center rounded-md px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Volver al inicio
                </Link>
              )}
              <Link
                to="/mis-entradas"
                className="inline-flex items-center justify-center rounded-md px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Ver mis entradas
              </Link>
            </>
          )}

          {(token || buyOrderParam) && (
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  setError(null);
                  if (token) {
                    const data = await getPaymentStatus(token);
                    setLocalInfo({
                      status: (data?.local?.status ?? undefined) as string | undefined,
                      amount: (data?.local?.amount ?? undefined) as number | undefined,
                      buyOrder: (data?.local?.buyOrder ?? undefined) as string | undefined,
                      reservationId: (data?.local?.reservationId ?? undefined) as number | undefined,
                      updatedAt: (data?.local?.updatedAt ?? undefined) as string | undefined,
                    });
                    setTbkInfo(data?.tbkStatus ?? null);
                  } else if (buyOrderParam) {
                    const data = await getPaymentByOrder(buyOrderParam);
                    const l = data?.local;
                    setLocalInfo({
                      status: l?.status as string | undefined,
                      amount: l?.amount as number | undefined,
                      buyOrder: (l?.buyOrder ?? buyOrderParam) as string | undefined,
                      reservationId: l?.reservationId as number | undefined,
                      updatedAt: l?.updatedAt as string | undefined,
                    });
                    setTbkInfo(null);
                  }
                } catch (e) {
                  const error = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
                  const errText =
                    error?.response?.data?.error ||
                    error?.response?.data?.message ||
                    error?.message ||
                    "No se pudo actualizar el estado.";
                  setError(errText);
                } finally {
                  setLoading(false);
                }
              }}
              className="inline-flex items-center justify-center rounded-md px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Refrescar estado pago
            </button>
          )}

          {/* Botón de descarga visible cuando hay ticket aprobado/entregado */}
          {ticketStatus &&
            (ticketStatus.fulfillmentStatus === "TICKET_APPROVED" ||
              ticketStatus.fulfillmentStatus === "DELIVERED") && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                {downloading ? "Descargando…" : "Descargar entrada"}
              </button>
            )}

          {/* Refrescar estado del ticket */}
          {(localStatus === "success" || localStatus === "authorized") &&
            reservationIdToShow !== "—" && (
              <button
                onClick={async () => {
                  try {
                    const id = Number(reservationIdParam || localInfo?.reservationId);
                    if (!Number.isFinite(id)) return;
                    setLoading(true);
                    setError(null);
                    const { data } = await api.get(`/tickets/${id}/status`);
                    setTicketStatus(data as TicketFlowStatus);
                  } catch (e) {
                    const error = e as { response?: { data?: { error?: string } }; message?: string };
                    setError(
                      error?.response?.data?.error ||
                        error?.message ||
                        "No se pudo actualizar el estado del ticket."
                    );
                  } finally {
                    setLoading(false);
                  }
                }}
                className="inline-flex items-center justify-center rounded-md px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Refrescar estado ticket
              </button>
            )}
        </div>

        {/* Cargas / errores */}
        {loading && <div className="mt-3 text-sm text-gray-600">Cargando estado…</div>}
        {error && (
          <div className="mt-3 rounded bg-red-50 text-red-800 text-sm px-3 py-2">{error}</div>
        )}

        {/* Detalles técnicos (opcional) */}
        {(tbkInfo || localInfo) && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-600">
              Información técnica (opcional)
            </summary>
            <div className="mt-2 space-y-2">
              {localInfo && (
                <pre className="text-xs glass-light border border-dark-600 rounded p-2 overflow-auto text-dark-100">
{JSON.stringify(localInfo, null, 2)}
                </pre>
              )}
              {tbkInfo && (
                <pre className="text-xs glass-light border border-dark-600 rounded p-2 overflow-auto text-dark-100">
{JSON.stringify(tbkInfo, null, 2)}
                </pre>
              )}
            </div>
          </details>
        )}
      </div>
      </div>
    </div>
  );
}











