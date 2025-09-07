// src/pages/OrganizerEventForm.tsx
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import {
  createMyEvent,
  getMyEvent,
  updateMyEvent,
  type OrganizerEvent,
  type OrganizerUpdateResponse,
} from "@/services/organizerEventsService";
import { useAuth } from "@/context/AuthContext";

/* =================== Límites (alineados con DB) =================== */
const LIMITS = {
  TITLE: 120,
  DESCRIPTION: 4000,
  VENUE: 120,
  CITY: 120,
  COMMUNE: 120, // 👈 NUEVO
  COVER_URL: 1024,
  // Reventa personal: capacidad entre 1 y 4
  CAPACITY_MIN: 1,
  CAPACITY_MAX: 4,
};

/* =================== Utilidades =================== */
function formatMoneyCLP(v: number) {
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

// ✅ Si pegan un enlace de Google Imágenes (/imgres), extraemos el imgurl real.
function sanitizeGoogleImgUrl(raw?: string) {
  if (!raw) return raw;
  try {
    const u = new URL(raw);
    if (/google\.[^/]+/i.test(u.hostname) && u.pathname.includes("/imgres")) {
      const imgurl = u.searchParams.get("imgurl");
      if (imgurl) return decodeURIComponent(imgurl);
    }
    return raw;
  } catch {
    return raw;
  }
}

/* =================== Schema (con límites) =================== */
const schema = z
  .object({
    // Evento
    title: z.string().trim().min(3, "Mínimo 3 caracteres").max(LIMITS.TITLE, `Máximo ${LIMITS.TITLE} caracteres`),
    description: z
      .string()
      .trim()
      .max(LIMITS.DESCRIPTION, `Máximo ${LIMITS.DESCRIPTION} caracteres`)
      .optional()
      .or(z.literal("")),
    coverImageUrl: z
      .string()
      .trim()
      .max(LIMITS.COVER_URL, `URL demasiado larga (máx. ${LIMITS.COVER_URL})`)
      .url("URL inválida")
      .optional()
      .or(z.literal("")),
    venue: z.string().trim().min(2, "Requerido").max(LIMITS.VENUE, `Máximo ${LIMITS.VENUE} caracteres`),
    city: z.string().trim().max(LIMITS.CITY, `Máximo ${LIMITS.CITY} caracteres`).optional(),
    commune: z.string().trim().min(2, "Requerido").max(LIMITS.COMMUNE, `Máximo ${LIMITS.COMMUNE} caracteres`), // 👈 NUEVO (requerido)
    startAt: z.string().min(1, "Fecha/hora requerida"),
    endAt: z.string().optional(),

    // Capacidad 1..4
    capacity: z.preprocess(
      (v) => Number(v),
      z
        .number()
        .int("Debe ser entero")
        .min(LIMITS.CAPACITY_MIN, `Mínimo ${LIMITS.CAPACITY_MIN}`)
        .max(LIMITS.CAPACITY_MAX, `Máximo ${LIMITS.CAPACITY_MAX}`)
    ),

    // Precios
    priceBase: z
      .preprocess((v) => (v === "" || v === undefined || v === null ? undefined : Number(v)), z.number().int().min(0))
      .optional(),
    price: z.preprocess((v) => Number(v), z.number().int("Debe ser entero").min(0, "Debe ser ≥ 0")),
  })
  // Validación cruzada de reventa
  .superRefine((vals, ctx) => {
    if (typeof vals.priceBase === "number") {
      const maxAllowed = Math.floor(vals.priceBase * 1.3);
      if (vals.price > maxAllowed) {
        ctx.addIssue({
          path: ["price"],
          code: z.ZodIssueCode.custom,
          message: `Con reventa, el precio no puede superar el ${formatMoneyCLP(maxAllowed)} (+30%).`,
        });
      }
      if (vals.price < vals.priceBase) {
        ctx.addIssue({
          path: ["price"],
          code: z.ZodIssueCode.custom,
          message: "El precio de publicación no puede ser menor al precio base.",
        });
      }
    }
  });

type FormValues = z.infer<typeof schema>;
type FormValuesInput = z.input<typeof schema>;
type CreatePayload = Partial<OrganizerEvent> & {
  organizerName?: string;
  organizerRut?: string;
  price?: number; // CLP entero (el de publicación)
  commune?: string; // 👈 NUEVO
};
type ErrorToast = { kind: "error"; text: string } | null;

/* =================== Formulario =================== */
export default function OrganizerEventForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  // Datos del usuario para autocompletar “organizador”
  const { user } = useAuth() as {
    user?: { id: number; name?: string; rut?: string; role: string; verifiedOrganizer?: boolean };
  };
  const organizerName = user?.name || "";
  const organizerRut = user?.rut || "";

  const [currentStatus, setCurrentStatus] = useState<OrganizerEvent["status"] | null>(null);
  const [toast, setToast] = useState<ErrorToast>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValuesInput>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      description: "",
      coverImageUrl: "",
      venue: "",
      city: "",
      commune: "", // 👈 NUEVO
      startAt: "",
      endAt: "",
      capacity: 1,
      priceBase: "",
      price: "",
    },
  });

  const rawCover = watch("coverImageUrl");
  const priceBaseWatch = Number(watch("priceBase") || 0);
  const priceWatch = Number(watch("price") || 0);
  const capacityWatch = Number(watch("capacity") || 0);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Cargar datos si es edición
  useEffect(() => {
    if (!isEdit) return;
    (async () => {
      const ev = await getMyEvent(Number(id));
      const toLocalInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 16) : "");
      setValue("title", ev.title);
      setValue("description", ev.description ?? "");
      setValue("coverImageUrl", (ev as any).coverImageUrl ?? (ev as any).imageUrl ?? "");
      setValue("venue", ev.venue);
      setValue("city", ev.city ?? "");
      setValue("commune", (ev as any).commune ?? ""); // 👈 NUEVO
      setValue("startAt", toLocalInput(ev.startAt));
      setValue("endAt", toLocalInput(ev.endAt ?? undefined));
      setValue("capacity", ev.capacity as unknown as FormValuesInput["capacity"]);
      setCurrentStatus(ev.status);

      if ((ev as any).price != null) {
        setValue("price", String((ev as any).price));
      }
    })();
  }, [id, isEdit, setValue]);

  async function onSubmit(raw: FormValuesInput) {
    const values: FormValues = schema.parse({
      ...raw,
      coverImageUrl: sanitizeGoogleImgUrl(raw.coverImageUrl || ""),
    });

    const toIso = (v?: string) => (v ? new Date(v).toISOString() : undefined);

    const payload: CreatePayload = {
      title: values.title,
      description: values.description || undefined,
      coverImageUrl: values.coverImageUrl || undefined,
      venue: values.venue,
      city: values.city || undefined,
      commune: values.commune, // 👈 NUEVO
      startAt: toIso(values.startAt)!,
      endAt: toIso(values.endAt) ?? null,
      capacity: values.capacity,
      price: values.price,
      organizerName: organizerName || undefined,
      organizerRut: organizerRut || undefined,
    };

    (payload as any).imageUrl = values.coverImageUrl || undefined;

    try {
      if (isEdit) {
        const resp: OrganizerUpdateResponse = await updateMyEvent(Number(id), payload as any);
        navigate("/organizador/eventos", {
          state: {
            toast: { kind: "info", text: resp._message || "Tu evento fue actualizado y quedó PENDIENTE de aprobación." },
          },
          replace: true,
        });
      } else {
        await createMyEvent(payload as any);
        navigate("/organizador/eventos", {
          state: { toast: { kind: "success", text: "Evento creado y quedó PENDIENTE de aprobación." } },
          replace: true,
        });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.response?.data?.message || e?.message || "No se pudo guardar el evento";
      setToast({ kind: "error", text: msg });
    }
  }

  function StatusBadge({ s }: { s: OrganizerEvent["status"] }) {
    const base = "text-xs px-2 py-1 rounded";
    const map: Record<OrganizerEvent["status"], string> = {
      draft: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-900",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return <span className={`${base} ${map[s]}`}>{s}</span>;
  }

  function handleClearCover() {
    setPreviewError(null);
    setValue("coverImageUrl", "", { shouldDirty: true });
  }

  const coverUrl = (() => {
    const v = typeof rawCover === "string" ? rawCover.trim() : "";
    if (!v) return undefined;
    return sanitizeGoogleImgUrl(v);
  })();

  const maxAllowedResale = priceBaseWatch > 0 ? Math.floor(priceBaseWatch * 1.3) : null;
  const previewTotal =
    typeof priceWatch === "number" && typeof capacityWatch === "number" ? priceWatch * capacityWatch : 0;

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">{isEdit ? "Editar evento" : "Crear evento"}</h1>

      {toast && (
        <div className="mb-4 rounded border px-3 py-2 text-sm border-red-300 bg-red-50 text-red-800">
          <div className="flex items-start justify-between gap-3">
            <span>{toast.text}</span>
            <button onClick={() => setToast(null)} className="text-xs px-2 py-1 border rounded hover:bg-black/5">
              Cerrar
            </button>
          </div>
        </div>
      )}

      {isEdit && currentStatus && (
        <div className="mb-4 text-sm text-gray-700">
          Estado actual: <StatusBadge s={currentStatus} />
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Datos del organizador */}
        <div className="border rounded p-3">
          <h2 className="font-semibold mb-2">Datos del organizador</h2>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del organizador</label>
              <input
                value={organizerName || "—"}
                readOnly
                className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-700"
                placeholder="Nombre"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">RUT</label>
              <input
                value={organizerRut || "—"}
                readOnly
                className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-700"
                placeholder="12345678-9"
              />
            </div>
          </div>
        </div>

        {/* Datos del evento */}
        <div className="border rounded p-3">
          <h2 className="font-semibold mb-2">Datos del evento</h2>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Título *</label>
            <input
              {...register("title")}
              className="w-full border rounded px-3 py-2"
              placeholder="Ej: Concierto de Rock"
              maxLength={LIMITS.TITLE}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message as string}</p>}
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              {...register("description")}
              className="w-full border rounded px-3 py-2 min-h-[100px]"
              placeholder="Detalles del evento…"
              maxLength={LIMITS.DESCRIPTION}
            />
          </div>

          <div className="mb-3">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-sm font-medium mb-1">Imagen de portada (URL directa)</label>
              {coverUrl ? (
                <button type="button" onClick={handleClearCover} className="text-sm px-3 py-1 rounded border hover:bg-black/5">
                  Quitar
                </button>
              ) : null}
            </div>
            <input
              {...register("coverImageUrl")}
              onBlur={(e) => {
                const cleaned = (sanitizeGoogleImgUrl(e.target.value.trim()) || "").slice(0, LIMITS.COVER_URL);
                setValue("coverImageUrl", cleaned, { shouldDirty: true });
                setPreviewError(null);
              }}
              className="w-full border rounded px-3 py-2"
              placeholder="https://…/archivo.jpg (evita enlaces de búsqueda; usa la URL directa)"
              maxLength={LIMITS.COVER_URL}
            />
            {errors.coverImageUrl && <p className="text-sm text-red-600">{errors.coverImageUrl.message as string}</p>}

            <div className="mt-3">
              <div className="text-xs text-gray-500 mb-1">
                Recomendado: relación 16:9 (p. ej. 1600×900). Se recorta centrado en tarjetas y detalle.
              </div>
              <div className="relative rounded-xl overflow-hidden border aspect-video bg-gradient-to-br from-indigo-700 to-fuchsia-600">
                {coverUrl ? (
                  <>
                    <img
                      src={coverUrl}
                      alt="Vista previa de portada"
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setPreviewError(
                          "No pudimos cargar esa URL. Asegúrate de pegar un enlace directo al archivo (por ejemplo, termina en .jpg o .png)."
                        )
                      }
                      onLoad={() => setPreviewError(null)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/10 to-transparent" />
                  </>
                ) : (
                  <div className="absolute inset-0 grid place-content-center text-white/90">
                    <span className="text-5xl">🎟️</span>
                  </div>
                )}
              </div>
              {previewError && <p className="mt-2 text-sm text-amber-700">{previewError}</p>}
            </div>
          </div>

          {/* Lugar / Ciudad / Comuna */}
          <div className="grid md:grid-cols-3 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Lugar *</label>
              <input
                {...register("venue")}
                className="w-full border rounded px-3 py-2"
                placeholder="Estadio Nacional"
                maxLength={LIMITS.VENUE}
              />
              {errors.venue && <p className="text-sm text-red-600">{errors.venue.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ciudad</label>
              <input
                {...register("city")}
                className="w-full border rounded px-3 py-2"
                placeholder="Santiago"
                maxLength={LIMITS.CITY}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Comuna *</label>
              <input
                {...register("commune")}
                className="w-full border rounded px-3 py-2"
                placeholder="Providencia"
                maxLength={LIMITS.COMMUNE}
              />
              {errors.commune && <p className="text-sm text-red-600">{errors.commune.message as string}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Inicio (fecha y hora) *</label>
              <input type="datetime-local" {...register("startAt")} className="w-full border rounded px-3 py-2" />
              {errors.startAt && <p className="text-sm text-red-600">{errors.startAt.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fin (opcional)</label>
              <input type="datetime-local" {...register("endAt")} className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div className="mb-1">
            <label className="block text-sm font-medium mb-1">
              Número de entradas * <span className="text-xs text-gray-500">(máx. 4)</span>
            </label>
            <input
              type="number"
              min={LIMITS.CAPACITY_MIN}
              max={LIMITS.CAPACITY_MAX}
              step={1}
              {...register("capacity")}
              className="w-full border rounded px-3 py-2"
              placeholder="1"
            />
            {errors.capacity && <p className="text-sm text-red-600">{errors.capacity.message as string}</p>}
          </div>

          {/* ======= Precios ======= */}
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">
                Precio base (CLP) <span className="text-xs text-gray-500">(opcional, para validar reventa)</span>
              </label>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                {...register("priceBase")}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: 10000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Precio de publicación (CLP) *</label>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                {...register("price")}
                className={`w-full border rounded px-3 py-2 ${errors.price ? "border-red-400" : ""}`}
                placeholder="Ej: 12000"
              />
              {maxAllowedResale !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  Máximo permitido con reventa: <strong>{formatMoneyCLP(maxAllowedResale)}</strong> (+30%).
                </p>
              )}
              {errors.price && <p className="text-sm text-red-600">{errors.price.message as string}</p>}
            </div>
          </div>

          {/* Preview total (precio x capacidad) */}
          {priceWatch > 0 && capacityWatch > 0 && (
            <div className="mt-2 text-sm text-gray-700">
              Total estimado (todas las entradas): <strong>{formatMoneyCLP(previewTotal)}</strong>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button type="submit" disabled={isSubmitting} className="px-4 py-2 rounded bg-black text-white disabled:opacity-50">
            {isEdit ? "Guardar cambios" : "Crear evento"}
          </button>
          <button
            type="button"
            onClick={() => navigate("/organizador/eventos")}
            className="px-4 py-2 rounded border hover:bg-black/5"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}



















