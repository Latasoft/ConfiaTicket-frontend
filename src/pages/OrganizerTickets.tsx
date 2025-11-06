// src/pages/OrganizerTickets.tsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  organizerUploadTicket,
  type ResaleBookingStatus,
  type ReservationStatus,
  type FulfillmentStatus,
  listOrganizerReservations,
  type OrganizerReservationItem,
  type OrganizerReservationsResponse,
} from "@/services/ticketsService";
import { tReservationStatus, tFulfillmentStatus, tMimeShort } from "@/utils/i18n";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED = new Set(["application/pdf", "image/png", "image/jpeg"]);

function humanBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

/** Formatea segundos restantes como HH:MM:SS */
function formatHMS(seconds: number) {
  const s = Math.max(0, seconds | 0);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(r)}`;
}

export default function OrganizerTickets() {
  // -------- Form de subida manual por ID --------
  const [reservationId, setReservationId] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<ResaleBookingStatus | null>(null);

  // -------- Tabla de reservas del organizador --------
  const [rows, setRows] = useState<OrganizerReservationItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [q, setQ] = useState("");

  // Toggle "solo requieren acción" (pagadas sin archivo o rechazadas)
  const [needsTicket, setNeedsTicket] = useState(true);

  // Filtro de estado (solo se usa cuando needsTicket = false)
  const [payStatus, setPayStatus] =
    useState<"PAID" | "PENDING_PAYMENT" | "CANCELED" | "">("PAID");

  const [loadingList, setLoadingList] = useState(false);

  // input de archivo “invisible” reutilizable para subir desde la tabla
  const hiddenFileRef = useRef<HTMLInputElement | null>(null);
  const [targetReservationForUpload, setTargetReservationForUpload] =
    useState<number | null>(null);

  // ⏱️ ticker para refrescar el contador cada segundo
  const [, forceTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => forceTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // ---------- Validaciones ----------
  const validReservationId = useMemo(() => {
    const n = Number(reservationId);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [reservationId]);

  const fileError = useMemo(() => {
    if (!file) return null;
    if (!ALLOWED.has(file.type)) return "Solo se permiten PDF, PNG o JPG.";
    if (file.size > MAX_SIZE)
      return `El archivo supera el máximo (${humanBytes(MAX_SIZE)}).`;
    return null;
  }, [file]);

  const canUpload = !!validReservationId && !!file && !fileError && !loading;

  // ---------- Handlers formulario ----------
  const onFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setOkMsg(null);
    setError(null);
  }, []);

  async function handleUpload() {
    if (!canUpload || !file || !validReservationId) return;
    setLoading(true);
    setError(null);
    setOkMsg(null);
    try {
      await organizerUploadTicket(validReservationId, file);
      setOkMsg(
        "Archivo subido correctamente. Queda en revisión — esperando aprobación de superadmin."
      );
      // Recargar la tabla para obtener el estado actualizado
      await fetchReservations();
      // limpiar input
      setFile(null);
      const el = document.getElementById("ticket-file") as HTMLInputElement | null;
      if (el) el.value = "";
      // refrescar tabla
      fetchReservations();
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo subir el archivo.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckStatus() {
    const id = validReservationId;
    if (!id) return;
    setDownloading(true);
    setError(null);
    setOkMsg(null);
    try {
      // Buscar la reserva en la tabla actual
      const foundInTable = rows.find(r => r.reservationId === id);
      if (foundInTable) {
        // Convertir OrganizerReservationItem a ResaleBookingStatus
        setStatus({
          id: foundInTable.reservationId,
          status: foundInTable.status as ReservationStatus,
          fulfillmentStatus: (foundInTable.fulfillmentStatus || null) as FulfillmentStatus,
          ticketUploadedAt: foundInTable.ticketUploadedAt,
          approvedAt: null, // No disponible en OrganizerReservationItem
          deliveredAt: foundInTable.deliveredAt,
          rejectionReason: null, // No disponible en OrganizerReservationItem
          ticketUploadDeadlineAt: foundInTable.ticketUploadDeadlineAt,
          refundStatus: foundInTable.refundStatus,
          refundedAt: null, // No disponible en OrganizerReservationItem
          paidAt: null, // No disponible en OrganizerReservationItem
          expiresAt: null, // No disponible en OrganizerReservationItem
        });
        setOkMsg(`Reserva #${id} encontrada en la tabla`);
      } else {
        setError(`No se encontró la reserva #${id} en tu lista. Verifica el número o carga más resultados.`);
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo obtener el estado de la reserva.";
      setError(msg);
    } finally {
      setDownloading(false);
    }
  }

  // ---------- Tabla: fetch ----------
  const fetchReservations = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const params: any = {
        page,
        pageSize,
        q: q.trim() || undefined,
      };

      if (needsTicket) {
        params.needsTicket = true;
      } else {
        if (payStatus) params.status = payStatus;
        // ⛔️ ya no se envía maxAgeHours (se quitó del UI)
      }

      const resp: OrganizerReservationsResponse =
        await listOrganizerReservations(params);
      setRows(resp.items);
      setTotal(resp.total);
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo cargar la lista de reservas.";
      setError(msg);
    } finally {
      setLoadingList(false);
    }
  }, [page, pageSize, q, needsTicket, payStatus]);

  useEffect(() => {
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, q, needsTicket, payStatus]);

  // ---------- Subir desde tabla ----------
  function openUploadForRow(reservationId: number) {
    setTargetReservationForUpload(reservationId);
    hiddenFileRef.current?.click();
  }

  async function onHiddenFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.currentTarget.value = ""; // reset para permitir re-seleccionar el mismo archivo luego
    if (!f || !targetReservationForUpload) return;

    if (!ALLOWED.has(f.type)) {
      setError("Solo se permiten PDF, PNG o JPG.");
      return;
    }
    if (f.size > MAX_SIZE) {
      setError(`El archivo supera el máximo (${humanBytes(MAX_SIZE)}).`);
      return;
    }

    setError(null);
    setOkMsg(null);
    try {
      await organizerUploadTicket(targetReservationForUpload, f);
      setOkMsg(
        `Archivo subido para la reserva #${targetReservationForUpload}. Queda en revisión — esperando aprobación de superadmin.`
      );
      // Actualiza tabla
      await fetchReservations();
      // Limpiar estado si coincide con el formulario
      if (validReservationId === targetReservationForUpload) {
        setStatus(null);
      }
    } catch (e: any) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "No se pudo subir el archivo.";
      setError(msg);
    } finally {
      setTargetReservationForUpload(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  /** Badge del deadline con 10s de tolerancia para evitar falsos “Vencido” por desfase de reloj. */
  function getDeadlineBadge(deadlineISO?: string | null) {
    if (!deadlineISO) return { text: "—", className: "text-xs text-gray-400" };

    const deadlineMs = new Date(deadlineISO).getTime();
    // tolerancia de 10s
    const diffSec = Math.floor((deadlineMs - Date.now()) / 1000) + 10;

    if (diffSec <= 0) {
      return {
        text: "Vencido",
        className:
          "inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 border border-red-200",
      };
    }

    const text = formatHMS(diffSec);

    // < 1h -> ámbar; si no, verde
    if (diffSec < 3600) {
      return {
        text,
        className:
          "inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200",
      };
    }
    return {
      text,
      className:
        "inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200",
    };
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-semibold mb-2">Entradas — Organizador</h1>
      <p className="text-sm text-gray-600 mb-6">
        Sube la entrada digital de una <strong>reserva pagada</strong>. Acepta{" "}
        <code>PDF</code>, <code>PNG</code> o <code>JPG</code> (máx. 10MB).
      </p>

      {/* Card de subida manual por ID */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-1">
            <label className="block text-sm font-medium text-gray-700">
              ID de reserva
            </label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={reservationId}
              onChange={(e) => {
                setReservationId(e.target.value);
                setStatus(null);
                setOkMsg(null);
                setError(null);
              }}
              placeholder="Ej: 12345"
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              La reserva debe estar en estado <b>Pagado</b>.
            </p>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">
              Archivo de la entrada (PDF/PNG/JPG)
            </label>
            <input
              id="ticket-file"
              type="file"
              accept=".pdf,image/png,image/jpeg"
              onChange={onFileChange}
              className="mt-1 block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-gray-50 file:px-3 file:py-2 file:text-sm hover:file:bg-gray-100"
            />
            {file && (
              <div className="mt-1 text-xs text-gray-600">
                Seleccionado: <b>{file.name}</b> — {tMimeShort(file.type)},{" "}
                {humanBytes(file.size)}
              </div>
            )}
            {fileError && (
              <div className="mt-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
                {fileError}
              </div>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleUpload}
            disabled={!canUpload}
            className="inline-flex items-center justify-center rounded-md bg-indigo-600 px-4 py-2 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Subiendo…" : "Subir entrada"}
          </button>

          <button
            onClick={handleCheckStatus}
            disabled={!validReservationId || downloading}
            className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {downloading ? "Consultando…" : "Ver estado de la reserva"}
          </button>
        </div>

        {/* Feedback */}
        {okMsg && (
          <div className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {okMsg}
          </div>
        )}
        {error && (
          <div className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        )}
      </div>

      {/* Tabla de reservas del organizador */}
      <div className="mt-8 rounded-xl border bg-white p-4 shadow-sm">
        <div className="mb-3 grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <input
            type="text"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
            placeholder="Buscar por evento o comprador…"
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />

          {/* Toggle Solo requieren acción */}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={needsTicket}
              onChange={(e) => {
                setNeedsTicket(e.target.checked);
                setPage(1);
              }}
            />
            Solo requieren acción
            <span className="text-gray-500">
              (pagadas sin archivo o rechazadas)
            </span>
          </label>

          {/* Select de estado (deshabilitado si needsTicket=true) */}
          <select
            value={payStatus}
            onChange={(e) => {
              setPage(1);
              setPayStatus(e.target.value as any);
            }}
            disabled={needsTicket}
            className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none disabled:opacity-50"
            title={
              needsTicket
                ? "Deshabilitado: mostrando solo las que requieren acción"
                : ""
            }
          >
            <option value="PAID">Pagadas (Pagado)</option>
            <option value="PENDING_PAYMENT">Pendientes (Pendiente de pago)</option>
            <option value="CANCELED">Canceladas</option>
            <option value="">Todas</option>
          </select>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPage(1);
              setPageSize(parseInt(e.target.value, 10));
            }}
            className="w-full md:col-start-4 rounded-md border px-3 py-2 text-sm focus:outline-none md:justify-self-end"
          >
            {[10, 20, 30, 50].map((n) => (
              <option key={n} value={n}>
                {n} / pág.
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-600">
              <tr>
                <th className="px-3 py-2 text-left">Reserva</th>
                <th className="px-3 py-2 text-left">Evento</th>
                <th className="px-3 py-2 text-left">Comprador</th>
                <th className="px-3 py-2 text-left">Cant.</th>
                <th className="px-3 py-2 text-left">Pago</th>
                <th className="px-3 py-2 text-left">Flujo</th>
                <th className="px-3 py-2 text-left">Archivo</th>
                <th className="px-3 py-2 text-left">Plazo</th>
                <th className="px-3 py-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loadingList ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                    Cargando…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-gray-500">
                    Sin reservas que mostrar.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const badge = getDeadlineBadge(r.ticketUploadDeadlineAt);
                  const deadlineTitle = r.ticketUploadDeadlineAt
                    ? new Date(r.ticketUploadDeadlineAt).toLocaleString()
                    : undefined;

                  // Mostrar/ocultar botón según flujo (además de canUpload que viene del backend)
                  const flow = (r.fulfillmentStatus || "").toUpperCase();
                  const blockedByFlow =
                    flow === "TICKET_UPLOADED" ||
                    flow === "TICKET_APPROVED" ||
                    flow === "DELIVERED";

                  // ❗ Bloqueo de primera subida con plazo vencido.
                  // Usamos el flag del backend si viene; si no, lo calculamos.
                  const expiredByNow =
                    (r as any).deadlineExpired ??
                    (r.ticketUploadDeadlineAt
                      ? new Date(r.ticketUploadDeadlineAt).getTime() < Date.now()
                      : false);
                  const initialUploadBlocked = expiredByNow && !r.hasTicket;

                  const showUploadBtn =
                    r.canUpload && !blockedByFlow && !initialUploadBlocked;

                  // ✅ Mostrar el plazo solo si realmente requiere acción:
                  // 1) Usar el flag del backend si viene; 2) Fallback local.
                  const showDeadline =
                    (r as any).showDeadline ??
                    ((flow === "WAITING_TICKET" || flow === "TICKET_REJECTED") &&
                      !!r.ticketUploadDeadlineAt);

                  return (
                    <tr key={r.reservationId} className="border-t">
                      <td className="px-3 py-2">
                        <div className="font-medium">#{r.reservationId}</div>
                        <div className="text-xs text-gray-500">
                          {new Date(r.createdAt).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.event?.title ?? "—"}</div>
                        <div className="text-xs text-gray-500">
                          {r.event?.date
                            ? new Date(r.event.date).toLocaleString()
                            : "—"}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="font-medium">{r.buyer?.name ?? "—"}</div>
                        <div className="text-xs text-gray-500">
                          {r.buyer?.email ?? ""}
                        </div>
                      </td>
                      <td className="px-3 py-2">{r.quantity}</td>
                      <td className="px-3 py-2">{tReservationStatus(r.status as string)}</td>
                      <td className="px-3 py-2">
                        <div>
                          {tFulfillmentStatus(r.fulfillmentStatus ?? undefined)}
                        </div>
                        {flow === "TICKET_UPLOADED" && (
                          <div className="mt-0.5 text-xs text-amber-700">
                            (en revisión — esperando aprobación de superadmin)
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {r.hasTicket ? (
                          <div className="text-xs text-gray-600">
                            {tMimeShort(r.mime || "")}{" "}
                            {r.size ? `(${humanBytes(r.size)})` : ""}
                            {r.ticketUploadedAt && (
                              <div className="text-gray-500">
                                subido:{" "}
                                {new Date(r.ticketUploadedAt).toLocaleString()}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {showDeadline ? (
                          <span className={badge.className} title={deadlineTitle}>
                            {badge.text}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap gap-2">
                          {showUploadBtn ? (
                            <button
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-white text-xs hover:bg-indigo-700 disabled:opacity-50"
                              onClick={() => openUploadForRow(r.reservationId)}
                            >
                              Subir archivo
                            </button>
                          ) : initialUploadBlocked ? (
                            <span
                              className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-500"
                              title="No se puede realizar la primera subida: plazo vencido"
                            >
                              Plazo vencido
                            </span>
                          ) : (
                            <span className="rounded-md bg-gray-100 px-3 py-1.5 text-xs text-gray-500">
                              {flow === "TICKET_UPLOADED" ? "En revisión" : "—"}
                            </span>
                          )}
                          <button
                            className="rounded-md border px-3 py-1.5 text-xs hover:bg-gray-50"
                            onClick={() => setReservationId(String(r.reservationId))}
                          >
                            Usar ID
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

        {/* Paginación */}
        <div className="mt-3 flex items-center justify-between text-sm">
          <div className="text-gray-600">
            Total: <b>{total}</b> • Página <b>{page}</b> de <b>{totalPages}</b>
          </div>
          <div className="flex gap-2">
            <button
              className="rounded-md border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </button>
            <button
              className="rounded-md border px-3 py-1.5 hover:bg-gray-50 disabled:opacity-50"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Siguiente
            </button>
          </div>
        </div>

        {/* input oculto para subir desde la tabla */}
        <input
          ref={hiddenFileRef}
          type="file"
          accept=".pdf,image/png,image/jpeg"
          className="hidden"
          onChange={onHiddenFileChange}
        />
      </div>

      {/* Panel de estado (si está disponible) */}
      {status && (
        <div className="mt-8 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Estado de la reserva</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-gray-500">Reserva</dt>
              <dd className="font-medium">{status.id}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Estado de pago</dt>
              <dd className="font-medium">{tReservationStatus(status.status)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Flujo de ticket</dt>
              <dd className="font-medium">{tFulfillmentStatus(status.fulfillmentStatus)}</dd>
            </div>
            {status.ticketUploadedAt && (
              <div>
                <dt className="text-gray-500">Subido</dt>
                <dd className="font-medium">
                  {new Date(status.ticketUploadedAt).toLocaleString()}
                </dd>
              </div>
            )}
            {status.approvedAt && (
              <div>
                <dt className="text-gray-500">Aprobado</dt>
                <dd className="font-medium">
                  {new Date(status.approvedAt).toLocaleString()}
                </dd>
              </div>
            )}
            {status.deliveredAt && (
              <div>
                <dt className="text-gray-500">Entregado</dt>
                <dd className="font-medium">
                  {new Date(status.deliveredAt).toLocaleString()}
                </dd>
              </div>
            )}
            {status.rejectionReason && (
              <div className="sm:col-span-2">
                <dt className="text-gray-500">Motivo de rechazo</dt>
                <dd className="font-medium text-red-700">
                  {status.rejectionReason}
                </dd>
              </div>
            )}
          </dl>

          <p className="mt-3 text-xs text-gray-500">
            Si el estado es <b>Archivo subido (en revisión)</b>, un administrador debe
            revisarlo. Si ves <b>Rechazada</b>, vuelve a subir un archivo
            válido.
          </p>
        </div>
      )}
    </div>
  );
}











