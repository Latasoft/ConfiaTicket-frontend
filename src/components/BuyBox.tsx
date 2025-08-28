// src/components/BuyBox.tsx
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getEventDetails } from "@/services/eventsService";
import {
  startPayment,
  getMyPending,
  restartPayment,
  type PendingInfo,
} from "@/services/paymentsService";
import { useAuth } from "@/context/AuthContext";

type Props = { eventId: number };
type Msg = { type: "ok" | "err" | "info"; text: string };

export default function BuyBox({ eventId }: Props) {
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [remaining, setRemaining] = useState<number>(0);
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [unitPrice, setUnitPrice] = useState<number | null>(null); // CLP

  // 👇 para bloquear compra si el usuario es el organizador del evento
  const [organizerId, setOrganizerId] = useState<number | null>(null);

  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState<Msg | null>(null);

  // ---- Reserva pendiente (hold)
  const [pending, setPending] = useState<PendingInfo | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(0);

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth() as { user?: { id: number } };
  const isAuthed = !!user;
  const nextParam = encodeURIComponent(location.pathname + location.search);

  const maxPerPurchase = useMemo(
    () => Math.max(1, Math.min(4, remaining)),
    [remaining]
  );

  const isOwnEvent = useMemo(() => {
    if (!isAuthed || organizerId == null) return false;
    return Number(organizerId) === Number((user as any).id);
  }, [isAuthed, organizerId, user]);

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

  const selectedTotal = useMemo(() => {
    if (unitPrice == null) return 0;
    return unitPrice * (Number.isFinite(qty) ? qty : 1);
  }, [unitPrice, qty]);

  async function refreshAvailability() {
    try {
      const ev = await getEventDetails(eventId);

      setRemaining(ev.remaining ?? ev.capacity ?? 0);
      setUnitPrice(typeof ev.price === "number" ? ev.price : null);

      // ✅ Tolerante: puede venir organizerId directo o dentro de organizer.id
      const anyEv = ev as any;
      setOrganizerId(
        typeof anyEv.organizerId === "number"
          ? anyEv.organizerId
          : anyEv.organizer?.id ?? null
      );

      const iso = (anyEv.date as string | undefined) ?? (anyEv.startAt as string | undefined);
      setHasStarted(iso ? new Date(iso).getTime() <= Date.now() : false);
    } catch (e: any) {
      setMsg({
        type: "err",
        text:
          e?.response?.data?.error ||
          e?.message ||
          "No se pudo cargar la disponibilidad",
      });
    }
  }

  // Carga inicial
  useEffect(() => {
    (async () => {
      await refreshAvailability();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // Si hay sesión, consulta si existe una reserva pendiente para este evento
  useEffect(() => {
    if (!isAuthed) {
      setPending(null);
      setSecondsLeft(0);
      return;
    }
    (async () => {
      try {
        const info = await getMyPending(eventId);
        if (info && info.exists && info.reservation) {
          setPending(info);
          setSecondsLeft(info.secondsLeft ?? 0);
        } else {
          setPending(null);
          setSecondsLeft(0);
        }
      } catch {
        // no bloquear por error aquí
      }
    })();
  }, [isAuthed, eventId]);

  // Contador regresivo para la reserva pendiente
  useEffect(() => {
    if (!pending) return;
    if (!secondsLeft || secondsLeft <= 0) return;

    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          // expirada en UI → limpiar y refrescar stock
          setPending(null);
          refreshAvailability();
          setMsg({
            type: "err",
            text: "La reserva venció. Puedes intentar nuevamente.",
          });
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pending?.reservation?.id, secondsLeft]);

  // Ajustar qty si el remaining baja debajo del valor actual
  useEffect(() => {
    if (qty > maxPerPurchase) setQty(maxPerPurchase);
  }, [maxPerPurchase, qty]);

  // Comprar ahora: crea transacción en backend y redirige a Webpay
  async function onPayNow() {
    if (busy || loading) return;
    setMsg(null);

    if (!isAuthed) {
      return navigate(`/login?reason=login_required&next=${nextParam}`);
    }
    if (hasStarted) {
      return setMsg({
        type: "err",
        text: "El evento ya comenzó. No se pueden comprar entradas.",
      });
    }
    if (isOwnEvent) {
      return setMsg({
        type: "err",
        text: "No puedes comprar entradas de tu propio evento.",
      });
    }
    if (remaining <= 0) {
      return setMsg({ type: "err", text: "No quedan entradas disponibles." });
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > maxPerPurchase) {
      return setMsg({ type: "err", text: `Cantidad inválida (1 a ${maxPerPurchase}).` });
    }
    if (pending) {
      return setMsg({
        type: "info",
        text: "Ya tienes una reserva activa. Reanúdala o espera a que expire.",
      });
    }

    try {
      setBusy(true);
      await startPayment(eventId, qty); // redirige a Webpay
      setMsg({
        type: "info",
        text:
          "Redirigiendo a Webpay… si no ocurre, revisa bloqueadores de ventanas.",
      });
    } catch (e: any) {
      const errText =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo iniciar el pago.";
      setMsg({ type: "err", text: errText });
      await refreshAvailability();
    } finally {
      setBusy(false);
    }
  }

  // Reanudar el pago (misma reserva)
  async function onResume() {
    if (!pending?.reservation?.id) return;
    try {
      setBusy(true);
      await restartPayment(pending.reservation.id); // redirige a Webpay
    } catch (e: any) {
      const errText =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo reanudar el pago.";
      setMsg({ type: "err", text: errText });
      await refreshAvailability();
    } finally {
      setBusy(false);
    }
  }

  function fmtCountdown(s: number) {
    const m = Math.floor(s / 60);
    const r = s % 60;
    return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  }

  if (loading) {
    return (
      <div className="rounded border p-4">
        <div className="animate-pulse h-5 w-1/2 bg-gray-200 rounded mb-2" />
        <div className="animate-pulse h-10 w-full bg-gray-200 rounded mb-3" />
        <div className="animate-pulse h-10 w-full bg-gray-200 rounded" />
      </div>
    );
  }

  const soldOut = remaining <= 0;
  const disabled = hasStarted || busy || isOwnEvent;

  // Datos de la reserva pendiente (si existe)
  const pendingQty = pending?.reservation?.quantity ?? null;
  const pendingAmount = pending?.reservation?.amount ?? null;

  return (
    <div className="rounded-xl border p-4">
      <div className="text-sm text-gray-600">Entradas disponibles</div>
      <div className="text-2xl font-semibold mb-3">{remaining}</div>

      {/* Precio unitario */}
      {unitPrice != null && (
        <div className="mb-2 text-sm text-gray-700">
          <span className="font-medium">Precio unitario: </span>
          {formatMoneyCLP(unitPrice)}
        </div>
      )}

      {hasStarted && (
        <div className="mb-3 rounded px-3 py-2 text-sm bg-red-100 text-red-800">
          El evento ya comenzó. No se pueden comprar entradas.
        </div>
      )}

      {isOwnEvent && !hasStarted && (
        <div className="mb-3 rounded px-3 py-2 text-sm bg-rose-100 text-rose-800">
          Eres el organizador de este evento, por lo que no puedes comprar entradas del mismo.
        </div>
      )}

      {/* Mensajes */}
      {msg && !hasStarted && !isOwnEvent && (
        <div
          className={`mb-3 rounded px-3 py-2 text-sm ${
            msg.type === "ok"
              ? "bg-green-100 text-green-800"
              : msg.type === "info"
              ? "bg-blue-50 text-blue-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* Aviso de sesión */}
      {!isAuthed && !hasStarted && !soldOut && (
        <div className="mb-3 rounded px-3 py-2 text-sm bg-blue-50 text-blue-800">
          Debes tener una cuenta o ingresar a tu cuenta para realizar la compra.
        </div>
      )}

      {/* Si hay una reserva pendiente, mostrar contador y botón reanudar */}
      {isAuthed && pending && secondsLeft > 0 && (
        <div className="mb-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900">
          <div className="font-medium mb-1">Reserva activa</div>
          <div className="flex items-center justify-between gap-3">
            <div>
              Tiempo restante: <strong>{fmtCountdown(secondsLeft)}</strong>
              {pendingQty != null && (
                <span className="ml-2 text-indigo-900/80">
                  ({pendingQty} x {formatMoneyCLP(unitPrice ?? 0)})
                </span>
              )}
              {pendingAmount != null && (
                <span className="ml-2">
                  Total: <strong>{formatMoneyCLP(pendingAmount)}</strong>
                </span>
              )}
            </div>
            <button
              onClick={onResume}
              disabled={busy}
              className="rounded-md px-3 py-2 bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              Reanudar pago
            </button>
          </div>
        </div>
      )}

      {/* Cantidad */}
      <div className="mb-3">
        <label className="block text-sm mb-1">Cantidad (máx. 4 por compra)</label>
        <input
          type="number"
          min={1}
          max={maxPerPurchase}
          step={1}
          value={qty}
          onChange={(e) => {
            const n = Math.max(1, Math.min(Number(e.target.value || 1), maxPerPurchase));
            setQty(n);
          }}
          disabled={disabled || soldOut || !isAuthed || !!pending}
          className="w-full border rounded-md px-3 py-2 disabled:opacity-60"
        />
        <div className="text-xs text-gray-500 mt-1">
          Puedes comprar entre 1 y {maxPerPurchase}.
        </div>
      </div>

      {/* Total */}
      <div className="mb-3 text-sm text-gray-900">
        <span className="font-medium">Total:</span>{" "}
        <span>{formatMoneyCLP(selectedTotal)}</span>
        {unitPrice != null && (
          <span className="text-gray-500"> ({qty} x {formatMoneyCLP(unitPrice)})</span>
        )}
      </div>

      {/* CTA */}
      {hasStarted ? (
        <button
          disabled
          className="w-full px-4 py-2 rounded-md bg-gray-300 text-gray-700 cursor-not-allowed"
        >
          Evento iniciado
        </button>
      ) : soldOut ? (
        <button
          disabled
          className="w-full px-4 py-2 rounded-md bg-gray-300 text-gray-700 cursor-not-allowed"
        >
          Agotado
        </button>
      ) : !isAuthed ? (
        <button
          onClick={() => navigate(`/login?reason=login_required&next=${nextParam}`)}
          className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Ingresar para comprar
        </button>
      ) : pending ? (
        <button
          disabled
          className="w-full px-4 py-2 rounded-md bg-gray-300 text-gray-700 cursor-not-allowed"
        >
          Reserva activa — reanuda el pago
        </button>
      ) : isOwnEvent ? (
        <button
          disabled
          className="w-full px-4 py-2 rounded-md bg-gray-300 text-gray-700 cursor-not-allowed"
        >
          No puedes comprar tu propio evento
        </button>
      ) : (
        <button
          onClick={onPayNow}
          disabled={disabled}
          className="w-full px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
        >
          {busy ? "Redirigiendo…" : `Pagar ahora — ${formatMoneyCLP((unitPrice ?? 0) * qty)}`}
        </button>
      )}
    </div>
  );
}









