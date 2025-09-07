// src/pages/MyTickets.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getMyTickets,
  downloadTicket,
  buyerGetTicketFile,
  triggerBrowserDownload,
  detectFileKind,
  formatBytes,
  type TicketListResponse,
} from "@/services/ticketsService";

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

function StatusBadge({ s }: { s?: string }) {
  const text =
    s === "WAITING_TICKET"
      ? "Esperando subida"
      : s === "UNDER_REVIEW"
      ? "En revisión"
      : s === "TICKET_APPROVED"
      ? "Aprobado"
      : s === "DELIVERED"
      ? "Entregado"
      : s === "TICKET_REJECTED"
      ? "Rechazado"
      : s || "—";

  const cls =
    s === "TICKET_APPROVED"
      ? "bg-green-50 text-green-700 border-green-200"
      : s === "DELIVERED"
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s === "TICKET_REJECTED"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : "bg-amber-50 text-amber-800 border-amber-200";

  return <span className={`inline-flex px-2 py-0.5 text-xs rounded border ${cls}`}>{text}</span>;
}

function FileKindIcon({ kind }: { kind: "pdf" | "png" | "jpg" | "file" }) {
  const base = "w-5 h-5 flex-shrink-0";
  if (kind === "pdf") {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" />
        <path d="M14 2v4h4" stroke="currentColor" />
        <text x="7.5" y="16.5" fontSize="7" fontFamily="monospace" fill="currentColor">PDF</text>
      </svg>
    );
  }
  if (kind === "png") {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
        <text x="5.5" y="16.5" fontSize="7" fontFamily="monospace" fill="currentColor">PNG</text>
      </svg>
    );
  }
  if (kind === "jpg") {
    return (
      <svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
        <text x="6" y="16.5" fontSize="7" fontFamily="monospace" fill="currentColor">JPG</text>
      </svg>
    );
  }
  return (
    <svg className={base} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" stroke="currentColor" />
      <path d="M14 2v4h4" stroke="currentColor" />
    </svg>
  );
}

export default function MyTickets() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [loading, setLoading] = useState(true);
  const [previewingId, setPreviewingId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<TicketListResponse | null>(null);

  const totalPages = useMemo(
    () => (data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1),
    [data]
  );

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const res = await getMyTickets({ q, page, pageSize });
      setData(res);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudieron cargar tus entradas.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  const handleRefresh = () => load();

  const handleSearch = () => {
    setPage(1);
    load();
  };

  const handleDownload = async (reservationId: number) => {
    try {
      setDownloadingId(reservationId);
      setError(null);
      const { blob, filename } = await downloadTicket(reservationId);
      triggerBrowserDownload(blob, filename);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo descargar la entrada.";
      alert(msg);
    } finally {
      setDownloadingId(null);
      // Refrescamos para que pase a "Entregado" si aplica
      load();
    }
  };

  const handlePreview = async (reservationId: number) => {
    try {
      setPreviewingId(reservationId);
      setError(null);
      const { blob, contentType } = await buyerGetTicketFile(reservationId, "inline");
      const file = new Blob([blob], { type: contentType || "application/octet-stream" });
      const url = URL.createObjectURL(file);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo abrir la previsualización.";
      alert(msg);
    } finally {
      setPreviewingId(null);
      // También puede marcar como "Entregado"
      load();
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-xl font-semibold mb-3">Mis entradas</h1>

      <div className="flex items-center gap-2 mb-3">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por evento…"
          className="w-full sm:w-80 border rounded px-3 py-2"
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700"
        >
          Buscar
        </button>
        <button onClick={handleRefresh} className="px-4 py-2 rounded border hover:bg-gray-50">
          Refrescar
        </button>
      </div>

      {loading && <div className="text-sm text-gray-600">Cargando…</div>}
      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="overflow-auto border rounded">
          <table className="min-w-[980px] w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="text-left px-3 py-2">Reserva</th>
                <th className="text-left px-3 py-2">Evento</th>
                <th className="text-left px-3 py-2">Fecha</th>
                <th className="text-left px-3 py-2">Cant.</th>
                <th className="text-left px-3 py-2">Monto</th>
                <th className="text-left px-3 py-2">Archivo</th>
                <th className="text-left px-3 py-2">Estado</th>
                <th className="text-left px-3 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((it: any) => {
                const canDownload = !!it.canDownload;
                const canPreview = !!(it.canPreview ?? it.canDownload);
                const isPrev = previewingId === it.reservationId;
                const isDown = downloadingId === it.reservationId;

                const kind = detectFileKind(it.mime, it.fileName);
                const sizeText = formatBytes(it.size);

                return (
                  <tr key={it.reservationId} className="border-t">
                    <td className="px-3 py-2">#{it.reservationId}</td>
                    <td className="px-3 py-2">{it.event?.title ?? "—"}</td>
                    <td className="px-3 py-2">
                      {it.event?.date ? new Date(it.event.date).toLocaleString("es-CL") : "—"}
                    </td>
                    <td className="px-3 py-2">{it.quantity}</td>
                    <td className="px-3 py-2">{formatMoneyCLP(it.amount)}</td>

                    {/* Archivo: icono + tipo + tamaño */}
                    <td className="px-3 py-2">
                      {canPreview || canDownload ? (
                        <div className="flex items-center gap-2 text-gray-700">
                          <span className="text-gray-500">
                            <FileKindIcon kind={kind as any} />
                          </span>
                          <span className="uppercase text-xs border rounded px-1.5 py-0.5">
                            {kind === "pdf" ? "PDF" : kind === "png" ? "PNG" : kind === "jpg" ? "JPG" : "FILE"}
                          </span>
                          <span className="text-xs text-gray-500">· {sizeText}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <StatusBadge s={it.flowStatus} />
                      {it.ticketUploadDeadlineAt && (
                        <div className="text-[11px] text-gray-500 mt-1">
                          Plazo ticket: {new Date(it.ticketUploadDeadlineAt).toLocaleString("es-CL")}
                        </div>
                      )}
                      {it.refundStatus && it.refundStatus !== "NONE" && (
                        <div className="text-[11px] text-rose-600 mt-1">
                          Reembolso: {it.refundStatus}
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/reservas/${it.reservationId}`}
                          className="inline-flex items-center px-3 py-1.5 rounded border hover:bg-gray-50"
                          title="Ver detalle de esta compra"
                        >
                          Ver detalle
                        </Link>

                        {canPreview || canDownload ? (
                          <>
                            <button
                              onClick={() => handlePreview(it.reservationId)}
                              disabled={!canPreview || isPrev}
                              className={`inline-flex items-center px-3 py-1.5 rounded border ${
                                !canPreview || isPrev ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
                              }`}
                              title={canPreview ? "Abrir en otra pestaña" : "No disponible"}
                            >
                              {isPrev ? "Abriendo…" : "Ver ticket"}
                            </button>

                            <button
                              onClick={() => handleDownload(it.reservationId)}
                              disabled={!canDownload || isDown}
                              className={`inline-flex items-center px-3 py-1.5 rounded ${
                                !canDownload || isDown
                                  ? "bg-indigo-300 text-white cursor-not-allowed"
                                  : "bg-indigo-600 text-white hover:bg-indigo-700"
                              }`}
                            >
                              {isDown ? "Descargando…" : "Descargar"}
                            </button>
                          </>
                        ) : (
                          <span className="text-gray-400">No disponible</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {(!data || data.items.length === 0) && (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-gray-500">
                    No tienes entradas aún.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginación */}
      {data && data.total > data.pageSize && (
        <div className="mt-3 flex items-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className={`px-3 py-1.5 rounded border ${
              page <= 1 ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
            }`}
          >
            Anterior
          </button>
          <span className="text-sm text-gray-600">
            Página {page} de {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className={`px-3 py-1.5 rounded border ${
              page >= totalPages ? "opacity-50 cursor-not-allowed" : "hover:bg-gray-50"
            }`}
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}


