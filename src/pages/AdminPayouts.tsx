// src/pages/AdminPayouts.tsx
import { useEffect, useMemo, useState } from "react"; // ← valor (NO 'import type')
import paymentsService from "@/services/paymentsService";
import type {
  PayoutItem,
  PayoutListResponse,
  PayoutStatus,
} from "@/services/paymentsService";

/* =========================
 *  Constantes y utilidades
 * ========================= */

const STATUS_OPTIONS: Array<"" | PayoutStatus> = [
  "",
  "PENDING",
  "SCHEDULED",
  "IN_TRANSIT",
  "PAID",
  "FAILED",
  "CANCELED",
];

function statusLabelEs(s?: string | null) {
  switch (String(s || "").toUpperCase()) {
    case "PENDING":
      return "Pendiente";
    case "SCHEDULED":
      return "Programado";
    case "IN_TRANSIT":
      return "En tránsito";
    case "PAID":
      return "Pagado";
    case "FAILED":
      return "Fallido";
    case "CANCELED":
      return "Cancelado";
    default:
      return s || "—";
  }
}

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

/** Traductor suave de textos técnicos que mostramos en la tabla */
function spanishizeTechText(s?: string | null) {
  if (!s) return "—";
  let t = s;
  t = t.replace(/\bpayment\s*#\b/gi, "Pago #");
  t = t.replace(/\bbuyOrder\s*:/gi, "Orden de compra:");
  t = t.replace(/\bpsp\s*:\s*/gi, "PSP: ");
  t = t.replace(/\bSIM\s+PAID\b/gi, "SIM PAGADO");
  t = t.replace(/\bSIM\s+FAILED\b/gi, "SIM FALLIDO");
  return t;
}

function StatusPill({ s }: { s: string }) {
  const U = String(s || "").toUpperCase();
  const color =
    U === "PAID"
      ? "bg-green-500/20 text-green-300 border-green-400/50"
      : U === "PENDING"
      ? "bg-amber-500/20 text-amber-300 border-amber-400/50"
      : U === "IN_TRANSIT" || U === "SCHEDULED"
      ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50"
      : U === "FAILED" || U === "CANCELED"
      ? "bg-red-500/20 text-red-300 border-red-400/50"
      : "bg-dark-700 text-dark-200 border-dark-600";
  return (
    <span className={`px-3 py-1 text-xs rounded-full border font-medium ${color}`}>
      {statusLabelEs(U)}
    </span>
  );
}

/** Fecha primaria a mostrar + etiqueta (ya en español) */
function primaryDate(p: PayoutItem) {
  if (p.paidAt) return { value: p.paidAt, label: "Pagado" };
  if (p.scheduledFor) return { value: p.scheduledFor, label: "Programado" };
  if (p.capturedAt) return { value: p.capturedAt, label: "Capturado" };
  if (p.createdAt) return { value: p.createdAt, label: "Creado" };
  return { value: null as string | null, label: "" };
}

/* ======================
 *  Componente principal
 * ====================== */

export default function AdminPayouts() {
  // filtros
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"" | PayoutStatus>(""); // valores API, label en español
  const [organizerId, setOrganizerId] = useState<string>("");
  const [eventId, setEventId] = useState<string>("");

  // paginación
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // data
  const [rows, setRows] = useState<PayoutItem[]>([]);
  const [total, setTotal] = useState(0);

  // ui
  const [loading, setLoading] = useState(false);
  const [rowLoading, setRowLoading] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedBankInfo, setExpandedBankInfo] = useState<number | null>(null);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil((total || 0) / pageSize)),
    [total, pageSize]
  );

  async function fetchList() {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        pageSize,
        status,
        q: q.trim() || undefined,
        organizerId: organizerId.trim() ? Number(organizerId) : undefined,
        eventId: eventId.trim() ? Number(eventId) : undefined,
      };
      const data = (await paymentsService.adminListPayouts(
        params
      )) as PayoutListResponse;

      setRows(data.items || []);
      setTotal(data.total || 0);

      // 🔄 si la API devuelve page/pageSize, sincronizamos el estado
      if (typeof data.page === "number" && data.page !== page) setPage(data.page);
      if (typeof data.pageSize === "number" && data.pageSize !== pageSize)
        setPageSize(data.pageSize);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudieron cargar los pagos.";
      setRows([]);
      setTotal(0);
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, status]);

  function onSubmitFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    fetchList();
  }

  async function markAsPaid(id: number) {
    const ok = window.confirm(
      `¿Marcar pago #${id} como pagado? Esto es una simulación.`
    );
    if (!ok) return;
    try {
      setRowLoading(id);
      setError(null);
      const resp = await paymentsService.adminMarkPayoutPaid(id);
      if (!resp.ok) throw new Error("No se pudo marcar como pagado");
      setRows((prev) =>
        prev.map((p) =>
          p.id === id
            ? {
                ...p,
                status: "PAID",
                paidAt: resp.paidAt ?? new Date().toISOString(),
                failureCode: null,
                failureMessage: null,
              }
            : p
        )
      );
    } catch (e: any) {
      const msg =
        e?.response?.status === 403
          ? "No autorizado: se requiere superadmin."
          : e?.response?.data?.error ||
            e?.response?.data?.message ||
            e?.message ||
            "No se pudo marcar como pagado.";
      setError(msg);
    } finally {
      setRowLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-dark-900 px-4 md:px-8 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              Pagos a organizadores
            </h1>
            <p className="text-dark-200 text-lg">
              Revisa y gestiona los pagos generados a los organizadores.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <button
              onClick={fetchList}
              disabled={loading}
              className="rounded-xl border-2 border-cyan-500/50 px-4 py-2.5 text-sm font-medium text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-50 transition-all"
            >
              {loading ? "Actualizando…" : "Refrescar"}
            </button>
          </div>
        </div>

        {/* Filtros */}
        <form
          onSubmit={onSubmitFilters}
          className="mb-6 bg-dark-850 border-2 border-dark-700 rounded-2xl p-6 grid grid-cols-1 md:grid-cols-5 gap-4"
        >
          <div className="flex flex-col">
            <label className="text-xs text-dark-300 mb-2 font-medium">Buscar</label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="orden, evento, ID, email…"
              className="px-4 py-2.5 bg-dark-800 border-2 border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-dark-300 mb-2 font-medium">Estado</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="px-4 py-2.5 bg-dark-800 border-2 border-dark-600 rounded-lg text-white focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt || "ALL"} value={opt} className="bg-dark-800">
                  {opt ? statusLabelEs(opt) : "Todos"}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-dark-300 mb-2 font-medium">ID organizador</label>
            <input
              value={organizerId}
              onChange={(e) => {
                const v = e.target.value;
                if (/^\d*$/.test(v)) setOrganizerId(v);
              }}
              placeholder="ID organizador"
              className="px-4 py-2.5 bg-dark-800 border-2 border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              inputMode="numeric"
            />
          </div>

          <div className="flex flex-col">
            <label className="text-xs text-dark-300 mb-2 font-medium">ID evento</label>
            <input
              value={eventId}
              onChange={(e) => {
                const v = e.target.value;
                if (/^\d*$/.test(v)) setEventId(v);
              }}
              placeholder="ID evento"
              className="px-4 py-2.5 bg-dark-800 border-2 border-dark-600 rounded-lg text-white placeholder-dark-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
              inputMode="numeric"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-white font-bold w-full shadow-lg shadow-cyan-500/30 transition-all transform hover:scale-105 disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Buscando…" : "Aplicar"}
            </button>
          </div>
        </form>

        {/* Tabla */}
        <div className="rounded-2xl border-2 border-dark-700 bg-dark-850 shadow-2xl overflow-hidden">
          <div className="min-w-full overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-dark-800 text-dark-100 border-b-2 border-dark-700">
                <tr>
                  <th className="px-4 py-3 text-left font-bold">#</th>
                  <th className="px-4 py-3 text-left font-bold">Fecha</th>
                  <th className="px-4 py-3 text-left font-bold">Evento</th>
                  <th className="px-4 py-3 text-left font-bold">Organizador</th>
                  <th className="px-4 py-3 text-left font-bold">Orden</th>
                  <th className="px-4 py-3 text-left font-bold">Monto</th>
                  <th className="px-4 py-3 text-left font-bold">Estado</th>
                  <th className="px-4 py-3 text-left font-bold">Datos Bancarios</th>
                  <th className="px-4 py-3 text-left font-bold">Pagado el</th>
                  <th className="px-4 py-3 text-right font-bold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-12 text-center text-dark-300">
                      <div className="flex justify-center items-center gap-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                        <span className="text-lg">Cargando…</span>
                      </div>
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-16 text-center text-dark-300">
                      <div className="text-lg">No hay resultados para los filtros seleccionados.</div>
                    </td>
                  </tr>
                ) : (
                  rows.map((p) => {
                    const d = primaryDate(p);
                    return (
                      <tr key={p.id} className="border-t border-dark-700 hover:bg-dark-800/50 transition-colors">
                        <td className="px-4 py-3 align-top">
                          <span className="text-cyan-400 font-mono font-bold">#{p.id}</span>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-white">{fmtDate(d.value)}</div>
                          {d.label && (
                            <div className="text-xs text-dark-400">{d.label}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-medium text-white">
                            {p.event?.title ?? "—"}
                          </div>
                          <div className="text-xs text-dark-400">
                            {p.event?.date ? fmtDate(p.event.date) : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-sm text-white">
                            {p.organizer?.name ?? "—"}
                          </div>
                          <div className="text-xs text-dark-400">
                            {p.organizer?.email ?? ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="text-xs text-dark-300 font-mono">
                            {p.paymentId ? spanishizeTechText(`payment #${p.paymentId}`) : "—"}
                          </div>
                          <div className="text-xs text-dark-400 font-mono">
                            {p.buyOrder ? spanishizeTechText(`buyOrder: ${p.buyOrder}`) : ""}
                          </div>
                          <div className="text-xs text-dark-500 font-mono">
                            {p.pspPayoutId ? (
                              <button
                                type="button"
                                onClick={() =>
                                  navigator.clipboard?.writeText(p.pspPayoutId!)
                                }
                                title="Copiar ID del PSP"
                                className="underline hover:text-cyan-400 transition-colors"
                              >
                                {spanishizeTechText(`psp: ${p.pspPayoutId}`)}
                              </button>
                            ) : (
                              ""
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          <div className="font-bold text-green-400 text-lg">
                            {fmtMoneyCLP(p.amount, p.currency || "CLP")}
                          </div>
                          {typeof p.netAmount === "number" && (
                            <div className="text-xs text-dark-400">
                              Neto: {fmtMoneyCLP(p.netAmount, p.currency || "CLP")}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top">
                          <StatusPill s={String(p.status)} />
                          <div className="text-[11px] text-dark-400 mt-1">
                            {p.status === "SCHEDULED" && p.scheduledFor
                              ? `Programado: ${fmtDate(p.scheduledFor)}`
                              : p.status === "IN_TRANSIT"
                              ? "En tránsito"
                              : p.status === "FAILED" && p.failureMessage
                              ? `Error: ${p.failureMessage}`
                              : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 align-top">
                          {p.bankAccount && p.bankAccount.payoutsEnabled ? (
                            <div className="space-y-1">
                              <button
                                onClick={() => setExpandedBankInfo(expandedBankInfo === p.id ? null : p.id)}
                                className="text-xs text-cyan-400 hover:text-cyan-300 underline transition-colors"
                              >
                                {expandedBankInfo === p.id ? "Ocultar" : "Ver datos"}
                              </button>
                              {expandedBankInfo === p.id && (
                                <div className="mt-2 p-3 rounded-lg glass border border-dark-600 text-xs space-y-1">
                                  <div className="flex justify-between">
                                    <span className="text-dark-400">Banco:</span>
                                    <span className="text-white font-medium">{p.bankAccount.bankName || "—"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-dark-400">Tipo:</span>
                                    <span className="text-white font-medium">{p.bankAccount.accountType || "—"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-dark-400">Número:</span>
                                    <span className="text-white font-medium font-mono">{p.bankAccount.accountNumber || "—"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-dark-400">Titular:</span>
                                    <span className="text-white font-medium">{p.bankAccount.holderName || "—"}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-dark-400">RUT:</span>
                                    <span className="text-white font-medium font-mono">{p.bankAccount.holderRut || "—"}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="text-xs text-amber-400">
                              <div className="flex items-center gap-1">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span>Sin datos</span>
                              </div>
                              <div className="text-[10px] text-dark-400 mt-1">Pagos deshabilitados</div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 align-top text-white">{fmtDate(p.paidAt)}</td>
                        <td className="px-4 py-3 align-top text-right">
                          <div className="inline-flex gap-2">
                            <button
                              onClick={() => markAsPaid(p.id)}
                              disabled={
                                rowLoading === p.id ||
                                p.status === "PAID" ||
                                p.status === "FAILED" ||
                                p.status === "CANCELED"
                              }
                              className="rounded-lg bg-green-500 px-4 py-2 text-white font-medium hover:bg-green-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-green-500/30 transition-all transform hover:scale-105 disabled:transform-none"
                            >
                              {rowLoading === p.id ? "Marcando…" : "Marcar pagado"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer: paginación */}
          <div className="flex items-center justify-between border-t-2 border-dark-700 bg-dark-800 px-4 py-4 text-sm">
            <div className="text-dark-200">
              {total > 0 ? (
                <>
                  Mostrando{" "}
                  <span className="font-bold text-white">
                    {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)}
                  </span>{" "}
                  de <span className="font-bold text-white">{total}</span>
                </>
              ) : (
                <>Sin resultados</>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs text-dark-300">Por página</label>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10) || 20);
                    setPage(1);
                  }}
                  className="px-3 py-1.5 bg-dark-700 border-2 border-dark-600 rounded-lg text-white text-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/50 transition-all"
                >
                  {[10, 20, 50, 100].map((n) => (
                    <option key={n} value={n} className="bg-dark-800">
                      {n}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="rounded-lg border-2 border-dark-600 px-4 py-2 hover:bg-dark-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium transition-all"
              >
                ← Anterior
              </button>
              <span className="text-white font-medium">
                Página <span className="text-cyan-400">{page}</span> {total ? `de ${totalPages}` : ""}
              </span>
              <button
                onClick={() => setPage((p) => (total ? Math.min(totalPages, p + 1) : p + 1))}
                disabled={(total ? page >= totalPages : false) || loading}
                className="rounded-lg border-2 border-dark-600 px-4 py-2 hover:bg-dark-700 disabled:opacity-30 disabled:cursor-not-allowed text-white font-medium transition-all"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>

        {/* Errores */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-500/20 border-2 border-red-400/50 px-4 py-3 text-red-200 font-medium">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}






