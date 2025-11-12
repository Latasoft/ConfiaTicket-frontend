// src/pages/OrganizerPayouts.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

// valores en tiempo de ejecución
import paymentsService from "@/services/paymentsService";

// TIPOS (solo tipo)
import type {
  PayoutItem,
  PayoutListResponse,
  PayoutStatus,
  ConnectedAccount,
} from "@/services/paymentsService";

const STATUS_OPTIONS: Array<"" | PayoutStatus> = [
  "",
  "PENDING",
  "SCHEDULED",
  "IN_TRANSIT",
  "PAID",
  "FAILED",
  "CANCELED",
];

function fmtMoneyCLP(v: number, currency = "CLP") {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${v} ${currency}`;
  }
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  try {
    return new Date(d).toLocaleString("es-CL", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return d;
  }
}

function StatusPill({ s }: { s: string }) {
  const color =
    s === "PAID"
      ? "glass border-neon-green/50 text-neon-green"
      : s === "PENDING"
      ? "glass border-neon-yellow/50 text-neon-yellow"
      : s === "IN_TRANSIT" || s === "SCHEDULED"
      ? "glass border-neon-cyan/50 text-neon-cyan"
      : s === "FAILED" || s === "CANCELED"
      ? "glass border-red-500/50 text-red-400"
      : "glass border-dark-500 text-dark-100";
  return (
    <span className={`px-2 py-0.5 text-xs rounded-full ${color}`}>
      {s}
    </span>
  );
}

/** Fecha primaria a mostrar + etiqueta */
function primaryDate(p: PayoutItem) {
  if (p.paidAt) return { value: p.paidAt, label: "Pagado" };
  if (p.scheduledFor) return { value: p.scheduledFor, label: "Programado" };
  if (p.capturedAt) return { value: p.capturedAt, label: "Capturado" };
  if (p.createdAt) return { value: p.createdAt, label: "Creado" };
  return { value: null as string | null, label: "" };
}

export default function OrganizerPayouts() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | PayoutStatus>("");

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // data
  const [rows, setRows] = useState<PayoutItem[]>([]);
  const [total, setTotal] = useState(0);

  // connected account (para banner / empty state)
  const [account, setAccount] = useState<ConnectedAccount | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / pageSize)),
    [total, pageSize]
  );

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [acct, list] = await Promise.all([
        paymentsService.getMyConnectedAccount().catch(() => null),
        paymentsService.listMyPayouts({
          page,
          pageSize,
          status,
          q: q.trim() || undefined,
        }),
      ]);

      if (acct) setAccount(acct);

      const resp: PayoutListResponse = list ?? {
        items: [],
        total: 0,
        page: 1,
        pageSize,
      };

      setRows(resp.items || []);
      setTotal(resp.total || 0);

      // Si la API devuelve page/pageSize, respétalos para quedar sincronizados
      if (typeof resp.page === "number" && resp.page !== page) setPage(resp.page);
      if (typeof resp.pageSize === "number" && resp.pageSize !== pageSize)
        setPageSize(resp.pageSize);
    } catch (e: any) {
      setError(
        e?.response?.data?.error || e?.message || "Error al cargar pagos"
      );
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status]);

  function onSubmitFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchAll();
  }

  // Mostrar banner si los pagos aún no están listos (payoutsReady === false)
  const showPayoutBanner = !!account && !account.payoutsReady;

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
              Mis pagos al organizador
            </h1>
            <p className="text-sm text-dark-200 mt-2">
              Aquí verás los pagos (payouts) que te transferimos por tus ventas
              aprobadas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/organizador/cuenta-cobro"
              className="text-sm btn-ghost px-3 py-2"
            >
              Configurar cuenta de cobro
            </Link>
          </div>
        </div>

        {/* Banner inteligente */}
        {showPayoutBanner && (
          <div className="mb-4 glass border border-neon-yellow/50 rounded-xl px-3 py-3 text-sm flex items-start justify-between gap-3 text-white">
            <div className="space-y-1">
              {account?.payoutsEnabled === false ? (
                <>
                  <strong>Importante:</strong>{" "}
                  <span>
                    tus pagos están deshabilitados. Completa tu{" "}
                    <Link to="/organizador/cuenta-cobro" className="text-neon-cyan hover:text-neon-cyan/80 underline">
                      cuenta de cobro
                    </Link>{" "}
                    para que podamos programar depósitos cuando el admin apruebe
                    tus ventas.
                  </span>
                </>
              ) : (
                <>
                  <strong>Atención:</strong>{" "}
                  <span>
                    tu cuenta de cobro tiene datos incompletos. Revísala para
                    habilitar pagos y recibir transferencias.
                  </span>
                </>
            )}
          </div>
          <Link
            to="/organizador/cuenta-cobro"
            className="shrink-0 btn-ghost px-3 py-2"
          >
            Configurar ahora
          </Link>
        </div>
      )}

      {/* Filtros */}
      <form
        onSubmit={onSubmitFilters}
        className="mb-4 flex flex-wrap items-end gap-3"
      >
        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Buscar</label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Evento, buyOrder, ID…"
            className="px-3 py-2 border rounded-md w-64"
          />
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Estado</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="px-3 py-2 border rounded-md"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt || "ALL"} value={opt}>
                {opt ? opt : "Todos"}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col">
          <label className="text-xs text-gray-600 mb-1">Por página</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(parseInt(e.target.value, 10) || 10);
              setPage(1);
            }}
            className="px-3 py-2 border rounded-md"
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          className="px-3 py-2 border rounded-md hover:bg-black/5"
          disabled={loading}
        >
          {loading ? "Buscando…" : "Aplicar"}
        </button>
      </form>

      {/* Tabla / estados */}
      <div className="card-modern overflow-hidden">
        <table className="w-full text-sm">
          <thead className="glass-light border-b border-dark-600">
            <tr className="text-left">
              <th className="px-3 py-2 text-white font-semibold">Fecha</th>
              <th className="px-3 py-2 text-white font-semibold">Evento</th>
              <th className="px-3 py-2 text-white font-semibold">Orden</th>
              <th className="px-3 py-2 text-white font-semibold">Monto</th>
              <th className="px-3 py-2 text-white font-semibold">Estado</th>
              <th className="px-3 py-2 text-white font-semibold">Pagado el</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-dark-200">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-dark-200">
                  {showPayoutBanner ? (
                    <>Aún no hay pagos. Cuando vendas y aprobemos tus tickets, verás los depósitos aquí.</>
                  ) : (
                    <>No hay registros para los filtros seleccionados.</>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((p) => {
                const d = primaryDate(p);
                return (
                  <tr key={p.id} className="border-t border-dark-700">
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-white">{fmtDate(d.value)}</div>
                      {d.label && (
                        <div className="text-xs text-dark-200">{d.label}</div>
                      )}
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-white">{p.event?.title ?? "—"}</div>
                      <div className="text-xs text-dark-200">
                        {p.event?.date ? fmtDate(p.event.date) : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="text-xs text-dark-100">
                        {p.paymentId ? `payment #${p.paymentId}` : "—"}
                      </div>
                      <div className="text-xs text-dark-200">
                        {p.buyOrder ? `buyOrder: ${p.buyOrder}` : ""}
                      </div>
                      <div className="text-xs text-dark-200">
                        {p.pspPayoutId ? `pspId: ${p.pspPayoutId}` : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <div className="font-medium text-white">
                        {fmtMoneyCLP(p.amount, p.currency || "CLP")}
                      </div>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <StatusPill s={String(p.status)} />
                    </td>
                    <td className="px-3 py-2 align-top text-dark-100">{fmtDate(p.paidAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-dark-200">
          {total > 0 ? (
            <>
              Mostrando{" "}
              <span className="font-medium text-white">
                {Math.min((page - 1) * pageSize + 1, total)}–
                {Math.min(page * pageSize, total)}
              </span>{" "}
              de {total}
            </>
          ) : (
            <>Sin resultados</>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost px-3 py-1.5 disabled:opacity-50"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
          >
            Anterior
          </button>
          <span className="text-sm text-white">
            {page} / {totalPages}
          </span>
          <button
            className="btn-ghost px-3 py-1.5 disabled:opacity-50"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
          >
            Siguiente
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 p-3 glass border border-red-500/50 rounded-xl text-white">
          {error}
        </div>
      )}
      </div>
    </div>
  );
}





