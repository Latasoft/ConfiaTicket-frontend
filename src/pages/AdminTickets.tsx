// src/pages/AdminTickets.tsx
import { useEffect, useMemo, useState } from "react";
import {
  adminListPendingTickets,
  adminApproveTicket,
  adminRejectTicket,
  adminGetTicketFile,
  adminCapturePayment,        // fallback
  triggerBrowserDownload,
  adminApproveAndCapture,     // ✅ preferido (todo en uno)
} from "@/services/ticketsService";

type PendingItem = any;

/* -------------------- Utils -------------------- */

function formatDateTime(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return String(v); }
}

function cls(...xs: Array<string | false | undefined | null>) {
  return xs.filter(Boolean).join(" ");
}

/* -------------------- Página -------------------- */

export default function AdminTickets() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<PendingItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // loading por fila (preview/descarga/aprobar)
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const pages = useMemo(() => {
    if (!total) return 1;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [total, pageSize]);

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListPendingTickets({ page, pageSize, q: q.trim() || undefined });
      let list: any[] = [];
      let tot: number | null = null;
      if (Array.isArray(data)) {
        list = data;
      } else if (data && typeof data === "object") {
        list = (data.items ?? data.data ?? []) as any[];
        tot = (data.total ?? data.count ?? null) as number | null;
      }
      setItems(list);
      setTotal(tot);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudieron cargar los tickets pendientes.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  function applySearch() {
    setPage(1);
    fetchData();
  }

  // ✅ Preferido: aprobar + capturar + crear payout (con fallback)
  async function onApprove(reservationId: number) {
    const ok = window.confirm(`¿Aprobar y capturar el pago de la reserva #${reservationId}?`);
    if (!ok) return;
    try {
      setApprovingId(reservationId);
      setError(null);

      // 1) Intentar el endpoint todo-en-uno
      try {
        const res = await adminApproveAndCapture(reservationId);
        if (!res?.ok) {
          throw new Error("La operación todo-en-uno no confirmó ok.");
        }
      } catch (primaryErr: any) {
        // 2) Fallback: capturar y luego aprobar
        try {
          await adminCapturePayment(reservationId);
          await adminApproveTicket(reservationId);
        } catch (fallbackErr: any) {
          const msg =
            fallbackErr?.response?.data?.error ||
            fallbackErr?.message ||
            primaryErr?.response?.data?.error ||
            primaryErr?.message ||
            "No se pudo completar la aprobación y captura.";
          setError(msg);
          return;
        }
      }

      await fetchData();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "No se pudo aprobar.";
      setError(msg);
    } finally {
      setApprovingId(null);
    }
  }

  async function onReject(reservationId: number) {
    const reason = window.prompt(
      `Motivo del rechazo para la reserva #${reservationId} (opcional):`
    );
    if (reason === null) return; // cancelado
    try {
      setLoading(true);
      await adminRejectTicket(reservationId, reason?.trim() || undefined);
      await fetchData();
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || "No se pudo rechazar.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function onPreview(reservationId: number) {
    try {
      setPreviewingId(reservationId);
      setError(null);
      const { blob } = await adminGetTicketFile(reservationId, "inline");
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo previsualizar el archivo.";
      setError(msg);
    } finally {
      setPreviewingId(null);
    }
  }

  async function onDownload(reservationId: number) {
    try {
      setDownloadingId(reservationId);
      setError(null);
      const { blob, filename } = await adminGetTicketFile(reservationId, "attachment");
      triggerBrowserDownload(blob, filename || `ticket-${reservationId}`);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo descargar el archivo.";
      setError(msg);
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Revisión de entradas</h1>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Buscar por evento, comprador, reserva…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => (e.key === "Enter" ? applySearch() : undefined)}
            className="w-72 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={applySearch}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700"
          >
            Buscar
          </button>
        </div>
      </div>

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="min-w-full overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-700">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Reserva</th>
                <th className="px-3 py-2 text-left font-medium">Evento</th>
                <th className="px-3 py-2 text-left font-medium">Comprador</th>
                <th className="px-3 py-2 text-left font-medium">Subido</th>
                <th className="px-3 py-2 text-left font-medium">Archivo</th>
                <th className="px-3 py-2 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    Cargando…
                  </td>
                </tr>
              )}

              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                    No hay entradas pendientes de revisión.
                  </td>
                </tr>
              )}

              {!loading &&
                items.map((it, idx) => {
                  const reservationId =
                    it?.reservationId ?? it?.id ?? it?.reservation?.id ?? "—";
                  const eventTitle =
                    it?.eventTitle ??
                    it?.event?.title ??
                    it?.reservation?.event?.title ??
                    "—";
                  const buyerName =
                    it?.buyerName ??
                    it?.buyer?.name ??
                    it?.reservation?.buyer?.name ??
                    "—";
                  const buyerEmail =
                    it?.buyerEmail ??
                    it?.buyer?.email ??
                    it?.reservation?.buyer?.email ??
                    "";
                  const uploadedAt =
                    it?.ticketUploadedAt ??
                    it?.uploadedAt ??
                    it?.createdAt ??
                    it?.asset?.createdAt ??
                    null;

                  const rid = Number(reservationId);

                  const isPrev = previewingId === rid;
                  const isDown = downloadingId === rid;
                  const isApprove = approvingId === rid;

                  return (
                    <tr
                      key={reservationId + "_" + idx}
                      className={cls(idx % 2 === 0 ? "bg-white" : "bg-gray-50")}
                    >
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">#{String(reservationId)}</div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">{eventTitle}</div>
                      </td>
                      <td className="px-3 py-2 align-top">
                        <div className="font-medium">{buyerName}</div>
                        <div className="text-gray-500">{buyerEmail}</div>
                      </td>
                      <td className="px-3 py-2 align-top">{formatDateTime(uploadedAt)}</td>
                      <td className="px-3 py-2 align-top">
                        <div className="flex gap-2">
                          <button
                            onClick={() => onPreview(rid)}
                            disabled={isPrev}
                            className="rounded-md border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {isPrev ? "Abriendo…" : "Ver"}
                          </button>
                          <button
                            onClick={() => onDownload(rid)}
                            disabled={isDown}
                            className="rounded-md border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {isDown ? "Descargando…" : "Descargar"}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2 align-top text-right">
                        <div className="inline-flex gap-2">
                          <button
                            onClick={() => onApprove(rid)}
                            disabled={isApprove}
                            className="rounded-md bg-emerald-600 px-3 py-1.5 text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isApprove ? "Aprobando y capturando…" : "Aprobar y capturar"}
                          </button>
                          <button
                            onClick={() => onReject(rid)}
                            className="rounded-md bg-red-600 px-3 py-1.5 text-white hover:bg-red-700"
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer: paginación */}
        <div className="flex items-center justify-between border-t bg-white px-3 py-2 text-sm">
          <div className="text-gray-600">
            {total != null ? (
              <>
                {items.length ? (
                  <>
                    Mostrando {items.length} {items.length === 1 ? "resultado" : "resultados"} — Total: {total}
                  </>
                ) : (
                  <>Total: {total}</>
                )}
              </>
            ) : (
              <>{items.length} resultados</>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || loading}
              className="rounded-md border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Anterior
            </button>
            <span className="text-gray-700">
              Página {page} {total ? `de ${pages}` : ""}
            </span>
            <button
              onClick={() => setPage((p) => (total ? Math.min(pages, p + 1) : p + 1))}
              disabled={(total ? page >= pages : false) || loading}
              className="rounded-md border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>

      {/* Errores */}
      {error && (
        <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </div>
      )}
    </div>
  );
}


