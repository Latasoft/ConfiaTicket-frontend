// src/pages/OrganizerDashboard.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  listMyEvents,
  deleteMyEvent,
  toggleEventActive,
  type OrganizerEvent,
} from "@/services/organizerEventsService";
import {
  getMyConnectedAccount,
  type ConnectedAccount,
} from "@/services/paymentsService";

type PageToast = { kind: "info" | "success" | "error"; text: string } | null;

export default function OrganizerDashboard() {
  const [rows, setRows] = useState<OrganizerEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<OrganizerEvent["status"] | "">("");
  const pageSize = 10;

  const navigate = useNavigate();
  const location = useLocation();
  const [toast, setToast] = useState<PageToast>(null);

  // Connected account (para banner)
  const [account, setAccount] = useState<ConnectedAccount | null>(null);
  const [accLoading, setAccLoading] = useState<boolean>(true);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / pageSize)),
    [total, pageSize]
  );

  async function fetchData(p = page) {
    setLoading(true);
    try {
      const data = await listMyEvents({
        page: p,
        pageSize,
        q: q || undefined,
        status: (status as OrganizerEvent["status"]) || undefined,
      });
      setRows(data.items);
      setTotal(data.total);
      setPage(data.page);
    } finally {
      setLoading(false);
    }
  }

  // Carga inicial y cuando cambie búsqueda/filtro
  useEffect(() => {
    fetchData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, status]);

  // 🛎️ Mostrar toast que venga por navigation state y limpiarlo
  useEffect(() => {
    const st = (location.state as any)?.toast as PageToast | undefined;
    if (st) {
      setToast(st);
      // limpiar el state para que no se repita al refrescar / navegar
      navigate(location.pathname, { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // solo al montar

  // ===== Connected Account: traer para decidir si mostramos banner =====
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setAccLoading(true);
        const acc = await getMyConnectedAccount();
        if (mounted) setAccount(acc || null);
      } catch {
        if (mounted) setAccount(null);
      } finally {
        if (mounted) setAccLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function formatDate(value?: string | null) {
    if (!value) return "—";
    try {
      const d = new Date(value);
      return d.toLocaleString();
    } catch {
      return value ?? "—";
    }
  }

  // Validaciones mínimas para considerar "completa" la cuenta
  function cleanRut(v?: string | null) {
    return (v || "").replace(/[.\-]/g, "").trim().toUpperCase();
  }
  function isValidRut(v?: string | null) {
    const s = cleanRut(v);
    if (!/^\d{1,8}[0-9K]$/.test(s)) return false;
    const cuerpo = s.slice(0, -1);
    const dv = s.slice(-1);
    let m = 0,
      r = 1;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
      r = (r + Number(cuerpo[i]) * (9 - (m++ % 6))) % 11;
    }
    const dvCalc = r ? String(r - 1) : "K";
    return dv === dvCalc;
  }
  function isAccountComplete(acc?: ConnectedAccount | null) {
    if (!acc) return false;
    const hasBank = !!acc.payoutBankName;
    const hasType = !!acc.payoutAccountType;
    const hasNumber = !!acc.payoutAccountNumber && /^\d{7,14}$/.test(acc.payoutAccountNumber);
    const hasHolder = !!acc.payoutHolderName && acc.payoutHolderName.trim().length >= 2;
    const hasRut = isValidRut(acc.payoutHolderRut);
    return hasBank && hasType && hasNumber && hasHolder && hasRut;
  }

  const showPayoutBanner =
    !accLoading && (!account?.payoutsEnabled || !isAccountComplete(account));

  function Banner() {
    if (!showPayoutBanner) return null;
    const notEnabled = account?.payoutsEnabled !== true;
    const base =
      "mb-4 rounded-xl border px-3 py-3 text-sm flex items-start justify-between gap-3";
    const cls = notEnabled
      ? "glass border-neon-cyan/50 text-white"
      : "glass border-neon-yellow/50 text-white";
    return (
      <div className={`${base} ${cls}`}>
        <div className="space-y-1">
          {notEnabled ? (
            <>
              <strong>Importante:</strong>{" "}
              <span>
                tus pagos están deshabilitados. Configura tu{" "}
                <Link to="/organizador/cuenta-cobro" className="text-neon-cyan hover:text-neon-cyan/80 underline">
                  cuenta de cobro
                </Link>{" "}
                para que podamos programar depósitos cuando el admin apruebe tus
                ventas.
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
    );
  }

  function Badge({ s }: { s: OrganizerEvent["status"] }) {
    const base = "text-xs px-2 py-1 rounded glass";
    const map: Record<OrganizerEvent["status"], string> = {
      draft: "border border-dark-500 text-dark-100",
      pending: "border border-neon-yellow/50 text-neon-yellow",
      approved: "border border-neon-green/50 text-neon-green",
      rejected: "border border-red-500/50 text-red-400",
    };
    return <span className={`${base} ${map[s]}`}>{s}</span>;
  }

  return (
    <div className="min-h-screen bg-dark-900 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-display font-bold bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
            Panel de Organizador
          </h1>
          <Link
            to="/organizador/eventos/nuevo"
            className="btn-primary px-4 py-2"
          >
            Crear evento
          </Link>
        </div>

        {/* Banner de cuenta de cobro (si corresponde) */}
        <Banner />

      {/* Toast / Banner de navegación */}
      {toast && (
        <div
          className={
            "mb-4 rounded-xl px-3 py-2 text-sm glass border " +
            (toast.kind === "error"
              ? "border-red-500/50 text-white"
              : toast.kind === "success"
              ? "border-neon-green/50 text-white"
              : "border-neon-yellow/50 text-white")
          }
        >
          <div className="flex items-start justify-between gap-3">
            <span>{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              className="text-xs btn-ghost px-2 py-1"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col md:flex-row gap-2 md:items-center mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="input-modern w-full md:w-1/2"
          placeholder="Buscar por título…"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
          className="input-modern w-full md:w-48"
        >
          <option value="">Todos los estados</option>
          <option value="draft">Borrador</option>
          <option value="pending">Pendiente</option>
          <option value="approved">Aprobado</option>
          <option value="rejected">Rechazado</option>
        </select>
        <button
          onClick={() => {
            setQ("");
            setStatus("");
          }}
          className="btn-ghost px-3 py-2 w-full md:w-auto"
        >
          Limpiar
        </button>
      </div>

      {/* Tabla */}
      <div className="card-modern overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="glass-light border-b border-dark-600">
            <tr>
              <th className="text-left p-3 text-white font-semibold">Título</th>
              <th className="text-left p-3 text-white font-semibold">Tipo</th>
              <th className="text-left p-3 text-white font-semibold">Inicio</th>
              <th className="text-left p-3 text-white font-semibold">Lugar</th>
              <th className="text-left p-3 text-white font-semibold">Entradas</th>
              <th className="text-left p-3 text-white font-semibold">Estado</th>
              <th className="text-center p-3 text-white font-semibold">Activo</th>
              <th className="text-right p-3 text-white font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-dark-200">
                  Cargando…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="p-6 text-center text-dark-200">
                  No hay eventos.
                </td>
              </tr>
            ) : (
              rows.map((ev) => (
                <tr key={ev.id} className="border-t border-dark-700">
                  <td className="p-3 text-white">{ev.title}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium glass border ${
                      ev.eventType === 'RESALE' 
                        ? 'border-neon-cyan/50 text-neon-cyan' 
                        : 'border-neon-green/50 text-neon-green'
                    }`}>
                      {ev.eventType === 'RESALE' ? '🎫 Reventa' : '🎉 Propio'}
                    </span>
                  </td>
                  <td className="p-3 text-dark-100">{formatDate(ev.startAt)}</td>
                  <td className="p-3 text-dark-100">{ev.venue}</td>
                  <td className="p-3 text-dark-100">{ev.capacity ?? "—"}</td>
                  <td className="p-3">
                    <Badge s={ev.status} />
                  </td>
                  <td className="p-3 text-center">
                    <button
                      onClick={async () => {
                        const newState = !ev.isActive;
                        const confirmMsg = newState
                          ? `¿Activar el evento "${ev.title}"?`
                          : `¿Desactivar el evento "${ev.title}"? Los usuarios no podrán comprar entradas.`;
                        
                        if (!confirm(confirmMsg)) return;
                        
                        try {
                          const result = await toggleEventActive(ev.id, newState);
                          setToast({
                            kind: "success",
                            text: result.message + (result.paidReservations > 0 
                              ? ` (${result.paidReservations} entradas vendidas)` 
                              : ''),
                          });
                          fetchData();
                        } catch (error: unknown) {
                          const err = error as { response?: { data?: { error?: string } } };
                          setToast({
                            kind: "error",
                            text: err.response?.data?.error || "Error al cambiar estado del evento",
                          });
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium glass border ${
                        ev.isActive !== false
                          ? 'border-neon-green/50 text-neon-green hover:border-neon-green'
                          : 'border-red-500/50 text-red-400 hover:border-red-500'
                      }`}
                      title={ev.isActive !== false ? 'Desactivar evento' : 'Activar evento'}
                    >
                      {ev.isActive !== false ? '🔴 Desactivar' : '🟢 Activar'}
                    </button>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() =>
                        navigate(`/organizador/eventos/${ev.id}/editar`)
                      }
                      className="btn-ghost px-2 py-1 mr-2"
                    >
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        if (!confirm("¿Eliminar este evento?")) return;
                        await deleteMyEvent(ev.id);
                        fetchData();
                      }}
                      className="btn-ghost px-2 py-1 hover:border-red-500/50 hover:text-red-400"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-dark-200">
          Página {page} de {totalPages} — {total} evento(s)
        </p>
        <div className="flex gap-2">
          <button
            disabled={page <= 1 || loading}
            onClick={() => fetchData(page - 1)}
            className="btn-ghost px-3 py-2 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            disabled={page >= totalPages || loading}
            onClick={() => fetchData(page + 1)}
            className="btn-ghost px-3 py-2 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}




