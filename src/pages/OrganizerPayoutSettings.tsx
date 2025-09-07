// src/pages/OrganizerPayoutSettings.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as paymentsService from "@/services/paymentsService";

/** ---------- Tipos locales (contrato mínimo esperado del service) ---------- */
type AccountType = "VISTA" | "CORRIENTE" | "AHORRO" | "RUT";

type ConnectedAccount = {
  payoutsEnabled: boolean;
  payoutBankName?: string | null;
  payoutAccountType?: AccountType | null;
  payoutAccountNumber?: string | null;
  payoutHolderName?: string | null;
  payoutHolderRut?: string | null;
  updatedAt?: string;
  payoutsReady?: boolean; // si el backend lo envía, lo usamos
};

/** -------------------------- Utilidades de RUT CL -------------------------- */
function cleanRut(v: string) {
  return (v || "").replace(/[.\-]/g, "").trim().toUpperCase();
}
function formatRut(v: string) {
  const s = cleanRut(v);
  if (!s) return "";
  const cuerpo = s.slice(0, -1);
  const dv = s.slice(-1);
  const cuerpoFmt = cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpoFmt}-${dv}`;
}
function isValidRut(v: string) {
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

/** --------------------------- Datos de selección --------------------------- */
// Incluye ambas variantes aceptadas por el backend: "BancoEstado" y "Banco Estado"
const BANKS_CL = [
  "BancoEstado",
  "Banco Estado",
  "Banco de Chile",
  "BCI",
  "Scotiabank",
  "Itaú",
  "Banco Santander",
  "Banco BICE",
  "Banco Falabella",
  "Banco Security",
  "Banco Ripley",
  "Banco Consorcio",
  "Banco Internacional",
  "Banco BTG Pactual",
  "Banco Edwards", // ← añadido para alinear con backend
];

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "VISTA", label: "Cuenta Vista" },
  { value: "CORRIENTE", label: "Cuenta Corriente" },
  { value: "AHORRO", label: "Cuenta de Ahorro" },
  { value: "RUT", label: "Cuenta RUT" },
];

/** ---------------------------- Helpers de UI ------------------------------- */
const maxCol = "w-full max-w-xl";
const readonlyField =
  `${maxCol} rounded border px-3 py-1.5 text-sm bg-gray-50 border-gray-200 text-gray-700 cursor-default`;
const editInput =
  `${maxCol} rounded-md border px-3 py-2 text-sm border-gray-300`;
const editSelect =
  `${maxCol} rounded-md border px-3 py-2 text-sm border-gray-300`;

function maskAccount(n?: string | null) {
  if (!n) return "—";
  const s = String(n).replace(/\s+/g, "");
  if (!s) return "—";
  return "**** " + s.slice(-4);
}

/** --------------------------------- Página -------------------------------- */
export default function OrganizerPayoutSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const [data, setData] = useState<ConnectedAccount>({
    payoutsEnabled: false,
    payoutBankName: "",
    payoutAccountType: null,
    payoutAccountNumber: "",
    payoutHolderName: "",
    payoutHolderRut: "",
  });

  const [form, setForm] = useState({
    payoutsEnabled: false,
    payoutBankName: "",
    payoutAccountType: "" as "" | AccountType,
    payoutAccountNumber: "",
    payoutHolderName: "",
    payoutHolderRut: "",
  });

  const [editMode, setEditMode] = useState(false);

  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(
    null
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** ----------------------------- Carga inicial ---------------------------- */
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setForbidden(false);
        setMsg(null);
        const acc = (await paymentsService.getMyConnectedAccount()) as ConnectedAccount;
        const payload: ConnectedAccount = acc ?? {
          payoutsEnabled: false,
          payoutBankName: "",
          payoutAccountType: null,
          payoutAccountNumber: "",
          payoutHolderName: "",
          payoutHolderRut: "",
        };
        setData(payload);
        setForm({
          payoutsEnabled: !!payload.payoutsEnabled,
          payoutBankName: payload.payoutBankName || "",
          payoutAccountType: (payload.payoutAccountType as AccountType) || "",
          payoutAccountNumber: payload.payoutAccountNumber || "",
          payoutHolderName: payload.payoutHolderName || "",
          payoutHolderRut: payload.payoutHolderRut ? formatRut(payload.payoutHolderRut) : "",
        });
      } catch (e: any) {
        if (e?.response?.status === 403) {
          setForbidden(true);
        } else {
          setMsg({ type: "err", text: "No se pudo cargar tu cuenta de cobro." });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /** ------------------------------ Validación ------------------------------ */
  const validators = useMemo(
    () => ({
      payoutBankName: (v: string) =>
        v ? "" : "Selecciona un banco.",
      payoutAccountType: (v: string) =>
        v ? "" : "Selecciona el tipo de cuenta.",
      payoutAccountNumber: (v: string) =>
        /^\d{7,14}$/.test(v) ? "" : "Ingresa solo dígitos (7–14).",
      payoutHolderName: (v: string) =>
        /^[A-ZÁÉÍÓÚÜÑa-záéíóúüñ ]{2,60}$/.test(v.trim())
          ? ""
          : "Ingresa un nombre válido (2–60 caracteres).",
      payoutHolderRut: (v: string) =>
        isValidRut(v) ? "" : "RUT inválido.",
    }),
    []
  );

  function validate(allFieldsRequired: boolean) {
    const next: Record<string, string> = {};

    const fields: Array<keyof typeof form> = [
      "payoutBankName",
      "payoutAccountType",
      "payoutAccountNumber",
      "payoutHolderName",
      "payoutHolderRut",
    ];

    for (const f of fields) {
      const v = (form as any)[f];
      if (allFieldsRequired || v) {
        const err =
          f === "payoutBankName"
            ? validators.payoutBankName(v)
            : f === "payoutAccountType"
            ? validators.payoutAccountType(v)
            : f === "payoutAccountNumber"
            ? validators.payoutAccountNumber(v)
            : f === "payoutHolderName"
            ? validators.payoutHolderName(v)
            : validators.payoutHolderRut(v);
        if (err) next[f] = err;
      }
    }

    // Si quiere habilitar pagos, TODO debe ser válido
    if (form.payoutsEnabled) {
      for (const f of fields) {
        if (!next[f as string]) {
          if (!(form as any)[f]) next[f as string] = "Campo obligatorio.";
        }
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  /** ----------------------------- Handlers UI ------------------------------ */
  function onChange<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((s) => ({ ...s, [key]: value }));
    setMsg(null);
    if (errors[key]) {
      setErrors((e) => ({ ...e, [key]: "" }));
    }
  }

  async function onTogglePayoutsEnabled(next: boolean) {
    if (saving) return;
    if (next && !validate(true)) {
      setMsg({
        type: "err",
        text: "Completa y corrige los datos para habilitar pagos.",
      });
      return;
    }
    if (next && !window.confirm("¿Habilitar pagos? Se programarán depósitos por tus ventas aprobadas.")) {
      return;
    }
    onChange("payoutsEnabled", next);
  }

  async function onSave() {
    if (saving) return;
    const ok = validate(form.payoutsEnabled);
    if (!ok) return;

    try {
      setSaving(true);
      setMsg(null);

      const payload = {
        payoutsEnabled: form.payoutsEnabled,
        payoutBankName: form.payoutBankName || null,
        payoutAccountType: (form.payoutAccountType || null) as AccountType | null,
        payoutAccountNumber: form.payoutAccountNumber || null,
        payoutHolderName: form.payoutHolderName?.trim() || null,
        payoutHolderRut: cleanRut(form.payoutHolderRut),
      };

      const updated = (await paymentsService.updateMyConnectedAccount(
        payload
      )) as ConnectedAccount;

      setData(updated);
      setForm({
        payoutsEnabled: !!updated.payoutsEnabled,
        payoutBankName: updated.payoutBankName || "",
        payoutAccountType: (updated.payoutAccountType as AccountType) || "",
        payoutAccountNumber: updated.payoutAccountNumber || "",
        payoutHolderName: updated.payoutHolderName || "",
        payoutHolderRut: updated.payoutHolderRut ? formatRut(updated.payoutHolderRut) : "",
      });
      setErrors({});
      setMsg({
        type: "ok",
        text: "Cuenta de cobro actualizada correctamente.",
      });
      setEditMode(false);
    } catch (e: any) {
      if (e?.response?.status === 403) {
        setForbidden(true);
        setMsg({
          type: "err",
          text: "No tienes permiso o tu cuenta de organizador aún no está aprobada.",
        });
      } else if (e?.response?.status === 422 && e?.response?.data?.errors) {
        setErrors(e.response.data.errors);
        setMsg({
          type: "err",
          text: "Revisa los campos marcados.",
        });
      } else {
        setMsg({
          type: "err",
          text: "No se pudo guardar. Intenta nuevamente.",
        });
      }
    } finally {
      setSaving(false);
    }
  }

  function onCancel() {
    if (saving) return;
    setForm({
      payoutsEnabled: !!data.payoutsEnabled,
      payoutBankName: data.payoutBankName || "",
      payoutAccountType: (data.payoutAccountType as AccountType) || "",
      payoutAccountNumber: data.payoutAccountNumber || "",
      payoutHolderName: data.payoutHolderName || "",
      payoutHolderRut: data.payoutHolderRut ? formatRut(data.payoutHolderRut) : "",
    });
    setErrors({});
    setMsg(null);
    setEditMode(false);
  }

  /** --------- Cálculo local: si el formulario está completo/consistente ------ */
  const formComplete =
    !!form.payoutBankName &&
    !!form.payoutAccountType &&
    /^\d{7,14}$/.test(form.payoutAccountNumber) &&
    !!form.payoutHolderName &&
    isValidRut(form.payoutHolderRut);

  // estado "listo" para mostrar: usa el del server si no estás editando;
  // si estás editando, calcula en vivo con el formulario.
  const uiPayoutsReady = editMode
    ? !!(form.payoutsEnabled && formComplete)
    : !!(data.payoutsReady ?? (data.payoutsEnabled && formComplete));

  /** ------------------------------- Render UI ------------------------------ */
  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Cuenta de cobro</h1>
        <div className="animate-pulse text-sm text-gray-500">Cargando…</div>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">Cuenta de cobro</h1>
        <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900">
          Tu perfil de organizador no está aprobado o no tienes permisos para ver esta página.
          <div className="mt-2">
            <Link className="underline" to="/organizador/pendiente">
              Ver estado de verificación
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const maskedData = maskAccount(data.payoutAccountNumber);
  const maskedForm = maskAccount(form.payoutAccountNumber);
  const maskedDisplay = editMode ? maskedForm : maskedData;

  return (
    <div className="p-6">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h1 className="text-2xl font-semibold">Cuenta de cobro</h1>
            <p className="text-sm text-gray-600">
              Configura los datos bancarios donde recibirás tus pagos por ventas aprobadas.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditMode(true)}
            disabled={editMode || saving}
            className="hidden md:inline-flex items-center rounded-md border px-3 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
          >
            Editar datos
          </button>
        </div>

        {/* Badge de listo para pagar / última actualización */}
        <div className="flex items-center gap-3 mb-4">
          {uiPayoutsReady && (
            <span className="inline-flex items-center gap-2 rounded bg-emerald-50 px-2.5 py-1 text-sm text-emerald-700 border border-emerald-200">
              <span aria-hidden>✅</span> Listo para pagar
            </span>
          )}
          {data.updatedAt && (
            <span className="text-xs text-gray-500">
              Última actualización: {new Date(data.updatedAt).toLocaleString()}
            </span>
          )}
        </div>

        {msg && (
          <div
            className={
              "mb-4 rounded-md p-3 text-sm " +
              (msg.type === "ok"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200")
            }
          >
            {msg.text}
          </div>
        )}

        {/* Grid principal */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Columna izquierda: datos */}
          <div className="min-w-0">
            {/* Banco */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Banco</label>
              {editMode ? (
                <select
                  className={editSelect}
                  value={form.payoutBankName}
                  onChange={(e) => onChange("payoutBankName", e.target.value)}
                  disabled={saving}
                >
                  <option value="">Selecciona un banco…</option>
                  {BANKS_CL.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              ) : (
                <input className={readonlyField} value={data.payoutBankName || "—"} readOnly />
              )}
              {errors.payoutBankName && editMode && (
                <p className="mt-1 text-xs text-rose-600">{errors.payoutBankName}</p>
              )}
            </div>

            {/* Tipo de cuenta */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Tipo de cuenta</label>
              {editMode ? (
                <select
                  className={editSelect}
                  value={form.payoutAccountType}
                  onChange={(e) =>
                    onChange("payoutAccountType", e.target.value as AccountType | "")
                  }
                  disabled={saving}
                >
                  <option value="">Selecciona…</option>
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  className={readonlyField}
                  value={data.payoutAccountType || "—"}
                  readOnly
                />
              )}
              {errors.payoutAccountType && editMode && (
                <p className="mt-1 text-xs text-rose-600">{errors.payoutAccountType}</p>
              )}
            </div>

            {/* Nº de cuenta */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Número de cuenta</label>
              {editMode ? (
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  className={editInput}
                  value={form.payoutAccountNumber}
                  onChange={(e) => onChange("payoutAccountNumber", e.target.value.replace(/\D/g, ""))}
                  placeholder="Solo dígitos"
                  disabled={saving}
                />
              ) : (
                <input className={readonlyField} value={maskedData} readOnly />
              )}
              {errors.payoutAccountNumber && editMode && (
                <p className="mt-1 text-xs text-rose-600">{errors.payoutAccountNumber}</p>
              )}
            </div>

            {/* Titular */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Titular de la cuenta</label>
              {editMode ? (
                <input
                  type="text"
                  className={editInput}
                  value={form.payoutHolderName}
                  onChange={(e) => onChange("payoutHolderName", e.target.value)}
                  placeholder="Nombre completo"
                  disabled={saving}
                />
              ) : (
                <input className={readonlyField} value={data.payoutHolderName || "—"} readOnly />
              )}
              {errors.payoutHolderName && editMode && (
                <p className="mt-1 text-xs text-rose-600">{errors.payoutHolderName}</p>
              )}
            </div>

            {/* RUT */}
            <div className="mb-2">
              <label className="block text-sm font-medium mb-1">RUT del titular</label>
              {editMode ? (
                <input
                  type="text"
                  className={editInput}
                  value={form.payoutHolderRut}
                  onChange={(e) => onChange("payoutHolderRut", formatRut(e.target.value))}
                  placeholder="12.345.678-K"
                  disabled={saving}
                />
              ) : (
                <input
                  className={readonlyField}
                  value={data.payoutHolderRut ? formatRut(data.payoutHolderRut) : "—"}
                  readOnly
                />
              )}
              {errors.payoutHolderRut && editMode && (
                <p className="mt-1 text-xs text-rose-600">{errors.payoutHolderRut}</p>
              )}
            </div>

            {/* Botones edición */}
            {editMode && (
              <div className="flex items-center gap-3 pt-3">
                <button
                  onClick={onSave}
                  disabled={saving}
                  className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-white text-sm hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={saving}
                  className="inline-flex items-center rounded-md border px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>

          {/* Columna derecha: resumen / toggle */}
          <aside className="w-full">
            <div className="rounded-md border bg-white">
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <h2 className="font-medium">Resumen</h2>
                <label className="inline-flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={form.payoutsEnabled}
                    onChange={(e) => onTogglePayoutsEnabled(e.target.checked)}
                    disabled={saving}
                  />
                  Habilitar pagos
                </label>
              </div>

              <div className="px-4 py-3 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Estado</span>
                  <span
                    className={
                      "rounded-full px-2 py-0.5 text-xs " +
                      (uiPayoutsReady ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-700")
                    }
                  >
                    {uiPayoutsReady ? "Habilitados" : "Deshabilitados"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Banco</span>
                  <span className="font-medium">{form.payoutBankName || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Tipo</span>
                  <span className="font-medium">{form.payoutAccountType || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">N° cuenta</span>
                  <span className="font-medium">{maskedDisplay}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Titular</span>
                  <span className="font-medium">{form.payoutHolderName || "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">RUT</span>
                  <span className="font-medium">
                    {form.payoutHolderRut ? form.payoutHolderRut : "—"}
                  </span>
                </div>

                <div className="pt-3">
                  <div className="text-gray-600 mb-1">Requisitos</div>
                  <ul className="space-y-1 text-sm">
                    <li className={form.payoutBankName ? "text-emerald-700" : "text-rose-700"}>
                      {form.payoutBankName ? "✅" : "❗"} Banco seleccionado
                    </li>
                    <li className={form.payoutAccountType ? "text-emerald-700" : "text-rose-700"}>
                      {form.payoutAccountType ? "✅" : "❗"} Tipo de cuenta
                    </li>
                    <li className={/^\d{7,14}$/.test(form.payoutAccountNumber) ? "text-emerald-700" : "text-rose-700"}>
                      {/^\d{7,14}$/.test(form.payoutAccountNumber) ? "✅" : "❗"} Número de cuenta válido
                    </li>
                    <li className={form.payoutHolderName ? "text-emerald-700" : "text-rose-700"}>
                      {form.payoutHolderName ? "✅" : "❗"} Titular de la cuenta
                    </li>
                    <li className={isValidRut(cleanRut(form.payoutHolderRut)) ? "text-emerald-700" : "text-rose-700"}>
                      {isValidRut(cleanRut(form.payoutHolderRut)) ? "✅" : "❗"} RUT válido
                    </li>
                  </ul>
                </div>

                {data.updatedAt && (
                  <div className="text-xs text-gray-500 pt-2">
                    Últ. actualización: {new Date(data.updatedAt).toLocaleString()}
                  </div>
                )}

                {!editMode && (
                  <div className="pt-3">
                    <button
                      type="button"
                      onClick={() => setEditMode(true)}
                      className="w-full inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm hover:bg-gray-50"
                    >
                      Editar datos
                    </button>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}










