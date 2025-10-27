// src/pages/OrganizerEventForm.tsx
import { useEffect, useState, useCallback, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useParams } from "react-router-dom";
import {
  createMyEvent,
  getMyEvent,
  updateMyEvent,
  type OrganizerEvent,
} from "@/services/organizerEventsService";
import { useAuth } from "@/context/AuthContext";
import {
  listOrganizerReservations,
  type OrganizerReservationItem,
} from "@/services/ticketsService";
import EventTypeModal, { type EventType } from "@/components/EventTypeModal";

/* =================== Límites (alineados con DB) =================== */
const LIMITS = {
  TITLE: 120,
  DESCRIPTION: 4000,
  VENUE: 120,
  CITY: 120,
  COMMUNE: 120, // 👈 NUEVO
  COVER_URL: 1024,
  // Capacidad
  CAPACITY_MIN: 1,
  CAPACITY_MAX_RESALE: 4,      // reventa 4 entradas maximo
  CAPACITY_MAX_OWN: 999999,    // evento propio ilimitado
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

/* =================== Schema (con límites dinámicos) =================== */
// Función para crear schema dinámico según tipo de evento
function createSchema(eventType: EventType | null) {
  const capacityMax = eventType === "resale" ? LIMITS.CAPACITY_MAX_RESALE : LIMITS.CAPACITY_MAX_OWN;
  
  return z
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
      commune: z.string().trim().min(2, "Requerido").max(LIMITS.COMMUNE, `Máximo ${LIMITS.COMMUNE} caracteres`),
      startAt: z.string().min(1, "Fecha/hora requerida"),
      endAt: z.string().optional(),

      // Capacidad dinámica según tipo
      capacity: z.preprocess(
        (v) => Number(v),
        z
          .number()
          .int("Debe ser entero")
          .min(LIMITS.CAPACITY_MIN, `Mínimo ${LIMITS.CAPACITY_MIN}`)
          .max(capacityMax, `Máximo ${capacityMax}`)
      ),

      // Precios
      priceBase: z
        .preprocess(
          (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)), 
          eventType === "resale" 
            ? z.number().int("Debe ser entero").min(0, "Precio base es requerido para reventa")
            : z.number().int().min(0).optional()
        )
        .optional(),
      price: z.preprocess((v) => Number(v), z.number().int("Debe ser entero").min(0, "Debe ser ≥ 0")),
    })
    // Validación cruzada solo para reventa
    .superRefine((vals, ctx) => {
      if (eventType === "resale") {
        // Validar que priceBase existe
        if (typeof vals.priceBase !== "number") {
          ctx.addIssue({
            path: ["priceBase"],
            code: z.ZodIssueCode.custom,
            message: "El precio base es requerido para reventa",
          });
          return;
        }
        
        const maxAllowed = Math.floor(vals.priceBase * 1.3);
        if (vals.price > maxAllowed) {
          ctx.addIssue({
            path: ["price"],
            code: z.ZodIssueCode.custom,
            message: `Con reventa, el precio no puede superar ${formatMoneyCLP(maxAllowed)} (+30%).`,
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
}

type FormValues = z.infer<ReturnType<typeof createSchema>>;
type FormValuesInput = z.input<ReturnType<typeof createSchema>>;
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

  // Estado del tipo de evento (reventa o propio)
  const [eventType, setEventType] = useState<EventType | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(!isEdit); // Mostrar modal solo en creación

  // estado del indicador de etapa (etapa datos y etapa subir entradas)
  const [currentStep, setCurrentStep] = useState(1);
  const [createdEventId, setCreatedEventId] = useState<number | null>(null);
  const [showPendingModal, setShowPendingModal] = useState(false);

  const { user } = useAuth() as {
    user?: { id: number; name?: string; rut?: string; role: string; verifiedOrganizer?: boolean };
  };
  const organizerName = user?.name || "";
  const organizerRut = user?.rut || "";

  const [currentStatus, setCurrentStatus] = useState<OrganizerEvent["status"] | null>(null);
  const [toast, setToast] = useState<ErrorToast>(null);

  // Crear schema dinámico basado en el tipo de evento
  const schema = useMemo(() => createSchema(eventType), [eventType]);

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

  // Handler para seleccionar tipo de evento
  const handleEventTypeSelect = useCallback((type: EventType) => {
    setEventType(type);
    setShowTypeModal(false);
    // Si es evento propio, permitir más capacidad
    if (type === "own") {
      setValue("capacity", 100); // Valor inicial sugerido para eventos propios
    } else {
      setValue("capacity", 1); // Valor inicial para reventa
    }
  }, [setValue]);

  // limpiar formulario para un nuevo evento
  useEffect(() => {
    if (!isEdit) {
      // Resetear todos los campos al crear nuevo evento
      setValue("title", "");
      setValue("description", "");
      setValue("coverImageUrl", "");
      setValue("venue", "");
      setValue("city", "");
      setValue("commune", "");
      setValue("startAt", "");
      setValue("endAt", "");
      setValue("capacity", 1);
      setValue("priceBase", "");
      setValue("price", "");
      setCreatedEventId(null);
      setCurrentStep(1);
      setEventType(null);
      setShowTypeModal(true);
    }
  }, [isEdit, setValue]);

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
      setValue("commune", ev.commune ?? "");
      setValue("startAt", toLocalInput(ev.startAt));
      setValue("endAt", toLocalInput(ev.endAt ?? undefined));
      setValue("capacity", ev.capacity as unknown as FormValuesInput["capacity"]);
      setCurrentStatus(ev.status);
      
      // Detectar tipo de evento basado en capacidad o priceBase
      // Si tiene priceBase o capacidad <= 4, es reventa
      const isResale = (ev as any).priceBase != null || ev.capacity <= LIMITS.CAPACITY_MAX_RESALE;
      setEventType(isResale ? "resale" : "own");
      setShowTypeModal(false);
      
      // definir id del evento
      setCreatedEventId(ev.id);

      if ((ev as any).price != null) {
        setValue("price", String((ev as any).price));
      }
      if ((ev as any).priceBase != null) {
        setValue("priceBase", String((ev as any).priceBase));
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
      priceBase: values.priceBase || undefined, // Incluir priceBase si existe
      organizerName: organizerName || undefined,
      organizerRut: organizerRut || undefined,
    };

    (payload as any).imageUrl = values.coverImageUrl || undefined;

    try {
      if (isEdit) {
        await updateMyEvent(Number(id), payload as any);
        // ir a la etapa 2 en modo edicion
        setCurrentStep(2);
        setToast(null);
      } else {
        const response = await createMyEvent(payload as any);
        setCreatedEventId(response.id);
        setCurrentStep(2);
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

  // componente incador de pasos
  const Stepper = () => {
    const steps = [
      { number: 1, label: "Datos del Evento" },
      { number: 2, label: "Tickets/Entradas" }
    ];

    return (
      <div className="mb-8">
        <div className="flex items-center justify-center">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    currentStep === step.number
                      ? "bg-black text-white"
                      : currentStep > step.number
                      ? "bg-green-500 text-white"
                      : "bg-gray-300 text-gray-600"
                  }`}
                >
                  {currentStep > step.number ? "✓" : step.number}
                </div>
                <span className="text-xs mt-2 text-center font-medium">{step.label}</span>
              </div>
          
              {index < steps.length - 1 && (
                <div
                  className={`w-24 h-1 mx-2 ${
                    currentStep > step.number ? "bg-green-500" : "bg-gray-300"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      {/* Modal de selección de tipo de evento */}
      <EventTypeModal
        isOpen={showTypeModal}
        onSelect={handleEventTypeSelect}
        onClose={() => {
          setShowTypeModal(false);
          navigate("/organizador/eventos");
        }}
      />

      <h1 className="text-2xl font-bold mb-2">
        {isEdit ? "Editar evento" : "Crear evento"}
        {eventType && (
          <span className="ml-3 text-base font-normal text-gray-600">
            ({eventType === "resale" ? "Reventa" : "Evento Propio"})
          </span>
        )}
      </h1>

      <Stepper />

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

      {/* formulario del evento */}
      {currentStep === 1 && (
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
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Datos del evento</h2>
            {eventType && (
              <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                eventType === "resale" 
                  ? "bg-blue-100 text-blue-800" 
                  : "bg-green-100 text-green-800"
              }`}>
                {eventType === "resale" ? "Reventa" : "Evento Propio"}
              </span>
            )}
          </div>

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
              Número de entradas * 
              <span className="text-xs text-gray-500 ml-1">
                {eventType === "resale" 
                  ? `(máx. ${LIMITS.CAPACITY_MAX_RESALE})` 
                  : `(hasta ${LIMITS.CAPACITY_MAX_OWN.toLocaleString()})`
                }
              </span>
            </label>
            <input
              type="number"
              min={LIMITS.CAPACITY_MIN}
              max={eventType === "resale" ? LIMITS.CAPACITY_MAX_RESALE : LIMITS.CAPACITY_MAX_OWN}
              step={1}
              {...register("capacity")}
              className="w-full border rounded px-3 py-2"
              placeholder={eventType === "resale" ? "1" : "100"}
            />
            {errors.capacity && <p className="text-sm text-red-600">{errors.capacity.message as string}</p>}
            {eventType === "resale" && (
              <p className="text-xs text-blue-600 mt-1">
                Reventa: Máximo {LIMITS.CAPACITY_MAX_RESALE} entradas permitidas
              </p>
            )}
            {eventType === "own" && (
              <p className="text-xs text-green-600 mt-1">
                Evento propio: Sin límite de capacidad
              </p>
            )}
          </div>

          {/* ======= Precios ======= */}
          <div className="mt-4 grid md:grid-cols-2 gap-3">
            {eventType === "resale" && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Precio base (CLP) * <span className="text-xs text-gray-500">(valor original del ticket)</span>
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
                <p className="text-xs text-gray-500 mt-1">
                  El precio que pagaste originalmente por la entrada
                </p>
              </div>
            )}
            <div className={eventType === "own" ? "md:col-span-2" : ""}>
              <label className="block text-sm font-medium mb-1">
                Precio {eventType === "resale" ? "de reventa" : "de venta"} (CLP) *
              </label>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                {...register("price")}
                className={`w-full border rounded px-3 py-2 ${errors.price ? "border-red-400" : ""}`}
                placeholder="Ej: 12000"
              />
              {eventType === "resale" && maxAllowedResale !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  Máximo permitido: <strong>{formatMoneyCLP(maxAllowedResale)}</strong> (+30% del precio base).
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
            Continuar
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
      )}

      {/* creación de entradas */}
      {currentStep === 2 && eventType && <TicketsStep 
        eventId={createdEventId!}
        expectedCapacity={capacityWatch}
        eventType={eventType}
        onFinish={() => {
          setShowPendingModal(true);
        }}
        onBack={() => {
          setCurrentStep(1);
        }}
      />}

      {showPendingModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-3">
              Evento {isEdit ? "actualizado" : "creado"} exitosamente
            </h3>
            <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
              <p className="text-sm text-yellow-900">
                <strong>Tu evento está pendiente de validación</strong>
              </p>
              <p className="text-sm text-yellow-800 mt-2">
                Un administrador revisará la información antes de aprobarlo. 
                Te notificaremos cuando esté disponible para los usuarios.
              </p>
            </div>
            <button
              onClick={() => {
                setShowPendingModal(false);
                navigate("/organizador/eventos", {
                  state: { 
                    toast: { 
                      kind: "info", 
                      text: `Evento ${isEdit ? "actualizado" : "creado"}. Pendiente de aprobación.` 
                    } 
                  },
                  replace: true,
                });
              }}
              className="w-full px-4 py-2 bg-black text-white rounded hover:bg-black/90"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* =================== Componente de Tickets =================== */
function TicketsStep({ 
  eventId, 
  onFinish, 
  onBack, 
  expectedCapacity,
  eventType 
}: { 
  eventId: number; 
  onFinish: () => void; 
  onBack: () => void;
  expectedCapacity: number;
  eventType: EventType;
}) {
  // si es evento propio
  if (eventType === "own") {
    return <OwnEventTicketsStep 
      eventId={eventId}
      expectedCapacity={expectedCapacity}
      onFinish={onFinish}
      onBack={onBack}
    />;
  }

  // si es reventa
  return <ResaleTicketsStep
    eventId={eventId}
    expectedCapacity={expectedCapacity}
    onFinish={onFinish}
    onBack={onBack}
  />;
}

/* =================== Tickets para Evento Propio =================== */
function OwnEventTicketsStep({
  eventId,
  expectedCapacity,
  onFinish,
  onBack
}: {
  eventId: number;
  expectedCapacity: number;
  onFinish: () => void;
  onBack: () => void;
}) {
  const [rows, setRows] = useState<OrganizerReservationItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  async function fetchReservations() {
    setLoadingList(true);
    try {
      const response = await listOrganizerReservations({ 
        page: 1, 
        pageSize: 100,
        eventId 
      });
      setRows(response.items || []);
    } catch (err) {
      console.error("Error al cargar reservas:", err);
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchReservations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const ticketsWithReservations = rows.length;

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
        <div className="flex items-start gap-3">
          <div>
            <h2 className="text-lg font-semibold text-green-900">Evento Propio - Gestión de Tickets</h2>
            <p className="text-sm text-green-800 mt-1">
              Para eventos propios, los tickets se gestionan cuando los usuarios realicen compras.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-semibold mb-3">¿Cómo funciona?</h3>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-2">
            <span className="font-semibold text-green-600">1.</span>
            <span>Los usuarios comprarán entradas de tu evento desde la plataforma</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-green-600">2.</span>
            <span>Cuando confirmen el pago, se crearán reservas que verás en tu panel</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-green-600">3.</span>
            <span>Deberás subir los tickets físicos/digitales para cada reserva</span>
          </li>
          <li className="flex gap-2">
            <span className="font-semibold text-green-600">4.</span>
            <span>Los administradores aprobarán los tickets y se entregarán a los compradores</span>
          </li>
        </ol>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Estado actual</h4>
        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-blue-800">Capacidad del evento:</p>
            <p className="text-2xl font-bold text-blue-900">{expectedCapacity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-800">Reservas actuales:</p>
            <p className="text-2xl font-bold text-blue-900">{ticketsWithReservations}</p>
          </div>
        </div>
      </div>

      {/* tabla de reservas */}
      {loadingList ? (
        <div className="p-8 text-center text-gray-500">Cargando reservas...</div>
      ) : rows.length > 0 ? (
        <div className="border rounded-lg">
          <h3 className="font-semibold p-4 border-b bg-gray-50">Reservas del Evento</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-3 text-left">ID</th>
                  <th className="p-3 text-left">Comprador</th>
                  <th className="p-3 text-left">Cantidad</th>
                  <th className="p-3 text-left">Estado</th>
                  <th className="p-3 text-left">Ticket</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.reservationId} className="border-b hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">#{r.reservationId}</td>
                    <td className="p-3">{r.buyer?.name || "—"}</td>
                    <td className="p-3">{r.quantity || 1}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        r.status === "PAID" 
                          ? "bg-green-100 text-green-800"
                          : r.status === "PENDING_PAYMENT"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {r.hasTicket ? (
                        <span className="text-green-600 text-sm">✓ Subido</span>
                      ) : (
                        <span className="text-gray-400 text-sm">Pendiente</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-2">Aún no hay reservas para este evento</p>
          <p className="text-sm text-gray-500">
            Las reservas aparecerán aquí cuando los usuarios compren entradas
          </p>
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h4 className="font-semibold text-amber-900 mb-2">Recordatorio</h4>
        <p className="text-sm text-amber-800">
          Podrás gestionar y subir tickets desde el <strong>Panel de Organizador → Gestión de Tickets</strong> una vez que tu evento sea aprobado y los usuarios comiencen a comprar.
        </p>
      </div>

      {/* botones de navegacion */}
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={onBack}
          className="px-4 py-2 border rounded hover:bg-black/5"
        >
          ← Volver
        </button>
        <button
          onClick={onFinish}
          className="px-4 py-2 bg-black text-white rounded hover:bg-black/90"
        >
          Finalizar y Enviar a Aprobación
        </button>
      </div>
    </div>
  );
}

/* =================== Tickets para Reventa =================== */
function ResaleTicketsStep({
  expectedCapacity,
  onFinish,
  onBack
}: {
  eventId: number;
  expectedCapacity: number;
  onFinish: () => void;
  onBack: () => void;
}) {
  type TicketInfo = {
    id: number;
    row: string;
    seat: string;
    zone?: string;
    level?: string;
    description?: string;
    imageFile: File | null;
    imagePreview?: string;
    uploaded: boolean;
  };

  const [tickets, setTickets] = useState<TicketInfo[]>([]);
  const [currentTicket, setCurrentTicket] = useState({
    row: "",
    seat: "",
    zone: "",
    level: "",
    description: "",
  });
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentPreview, setCurrentPreview] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // inicializar tickets vacíos
    const initialTickets: TicketInfo[] = Array.from({ length: expectedCapacity }, (_, i) => ({
      id: i + 1,
      row: "",
      seat: "",
      zone: "",
      level: "",
      description: "",
      imageFile: null,
      uploaded: false,
    }));
    setTickets(initialTickets);
  }, [expectedCapacity]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // validar tipo
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowed.includes(file.type)) {
      setError("Solo se permiten imágenes JPG, PNG o PDF");
      return;
    }

    // validar tamaño
    if (file.size > 10 * 1024 * 1024) {
      setError("El archivo no debe superar 10MB");
      return;
    }

    setCurrentFile(file);
    setError(null);

    // preview
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setCurrentPreview("");
    }
  };

  const handleAddTicket = async (ticketIndex: number) => {
    // validar campos requeridos
    if (!currentTicket.row.trim()) {
      setError("La fila es requerida");
      return;
    }
    if (!currentTicket.seat.trim()) {
      setError("El asiento es requerido");
      return;
    }
    if (!currentFile) {
      setError("Debes subir una imagen del ticket");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // TODO: aqui iria la llamada al backend
      
      const updatedTickets = [...tickets];
      updatedTickets[ticketIndex] = {
        ...updatedTickets[ticketIndex],
        row: currentTicket.row,
        seat: currentTicket.seat,
        zone: currentTicket.zone,
        level: currentTicket.level,
        description: currentTicket.description,
        imageFile: currentFile,
        imagePreview: currentPreview,
        uploaded: true,
      };
      setTickets(updatedTickets);

      // limpiar formulario
      setCurrentTicket({
        row: "",
        seat: "",
        zone: "",
        level: "",
        description: "",
      });
      setCurrentFile(null);
      setCurrentPreview("");
      setSuccess(`Ticket #${ticketIndex + 1} guardado correctamente`);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Error al guardar el ticket");
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveTicket = (ticketIndex: number) => {
    const updatedTickets = [...tickets];
    updatedTickets[ticketIndex] = {
      ...updatedTickets[ticketIndex],
      row: "",
      seat: "",
      zone: "",
      level: "",
      description: "",
      imageFile: null,
      imagePreview: undefined,
      uploaded: false,
    };
    setTickets(updatedTickets);
  };

  const uploadedCount = tickets.filter(t => t.uploaded).length;
  const allUploaded = uploadedCount === expectedCapacity;

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
        <div className="flex items-start gap-3">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">Reventa - Información de Tickets</h2>
            <p className="text-sm text-blue-800 mt-1">
              Completa la información de cada entrada que vas a revender
            </p>
          </div>
        </div>
      </div>

      {/* Progreso */}
      <div className={`p-4 rounded-lg border ${
        allUploaded 
          ? "bg-green-50 border-green-200" 
          : "bg-blue-50 border-blue-200"
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-sm">
              Tickets configurados: {uploadedCount} / {expectedCapacity}
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {allUploaded 
                ? "✓ Todas las entradas han sido configuradas"
                : `Faltan ${expectedCapacity - uploadedCount} entrada(s) por configurar`
              }
            </p>
          </div>
          {allUploaded && (
            <span className="text-2xl">✓</span>
          )}
        </div>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="p-3 rounded border border-red-300 bg-red-50 text-red-800 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded border border-green-300 bg-green-50 text-green-800 text-sm">
          {success}
        </div>
      )}

      {/* lista de tickets */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tickets.map((ticket, index) => (
          <div key={ticket.id} className={`border rounded-lg p-4 ${
            ticket.uploaded ? "bg-green-50 border-green-300" : "bg-white border-gray-300"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Ticket #{index + 1}</h3>
              {ticket.uploaded && (
                <button
                  onClick={() => handleRemoveTicket(index)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Eliminar
                </button>
              )}
            </div>

            {ticket.uploaded ? (
              <div className="space-y-2 text-sm">
                {ticket.imagePreview && (
                  <img 
                    src={ticket.imagePreview} 
                    alt={`Ticket ${index + 1}`}
                    className="w-full h-32 object-cover rounded mb-2"
                  />
                )}
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <span className="text-gray-600">Fila:</span>
                  <span className="font-medium">{ticket.row}</span>
                  <span className="text-gray-600">Asiento:</span>
                  <span className="font-medium">{ticket.seat}</span>
                  {ticket.zone && (
                    <>
                      <span className="text-gray-600">Zona:</span>
                      <span className="font-medium">{ticket.zone}</span>
                    </>
                  )}
                  {ticket.level && (
                    <>
                      <span className="text-gray-600">Nivel:</span>
                      <span className="font-medium">{ticket.level}</span>
                    </>
                  )}
                </div>
                {ticket.description && (
                  <p className="text-xs text-gray-600 mt-2">{ticket.description}</p>
                )}
                <span className="text-green-600 text-xs font-medium">✓ Configurado</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  // scroll al formulario
                  document.getElementById('ticket-form')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-2 border border-dashed border-gray-400 rounded text-sm text-gray-600 hover:bg-gray-50"
              >
                + Agregar información
              </button>
            )}
          </div>
        ))}
      </div>

      {/* formulario para agregar ticket */}
      {!allUploaded && (
        <div id="ticket-form" className="border rounded-lg p-6 bg-gray-50">
          <h3 className="font-semibold mb-4">Agregar información del próximo ticket</h3>
          
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Fila * <span className="text-xs text-gray-500">(ej: A, 12, VIP)</span>
              </label>
              <input
                type="text"
                value={currentTicket.row}
                onChange={(e) => setCurrentTicket({ ...currentTicket, row: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="A"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Asiento * <span className="text-xs text-gray-500">(ej: 15, B3)</span>
              </label>
              <input
                type="text"
                value={currentTicket.seat}
                onChange={(e) => setCurrentTicket({ ...currentTicket, seat: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="15"
                maxLength={20}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Zona/Sección <span className="text-xs text-gray-500">(opcional)</span>
              </label>
              <input
                type="text"
                value={currentTicket.zone}
                onChange={(e) => setCurrentTicket({ ...currentTicket, zone: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Tribuna Norte"
                maxLength={50}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Nivel <span className="text-xs text-gray-500">(opcional)</span>
              </label>
              <input
                type="text"
                value={currentTicket.level}
                onChange={(e) => setCurrentTicket({ ...currentTicket, level: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Platea Alta"
                maxLength={50}
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Descripción <span className="text-xs text-gray-500">(opcional)</span>
            </label>
            <textarea
              value={currentTicket.description}
              onChange={(e) => setCurrentTicket({ ...currentTicket, description: e.target.value })}
              className="w-full border rounded px-3 py-2 min-h-[80px]"
              placeholder="Información adicional sobre este ticket..."
              maxLength={200}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Imagen del Ticket * <span className="text-xs text-gray-500">(JPG, PNG o PDF - máx 10MB)</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg,application/pdf"
              onChange={handleFileChange}
              className="w-full border rounded px-3 py-2 text-sm"
            />
            {currentPreview && (
              <div className="mt-3">
                <img 
                  src={currentPreview} 
                  alt="Preview" 
                  className="max-w-full h-48 object-contain border rounded"
                />
              </div>
            )}
          </div>

          <button
            onClick={() => handleAddTicket(uploadedCount)}
            disabled={uploading || !currentTicket.row || !currentTicket.seat || !currentFile}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Guardando..." : `Guardar Ticket #${uploadedCount + 1}`}
          </button>
        </div>
      )}

      {/* botones de navegacion */}
      <div className="flex items-center justify-between pt-4 border-t">
        <button
          onClick={onBack}
          className="px-4 py-2 border rounded hover:bg-black/5"
        >
          ← Volver
        </button>
        <button
          onClick={onFinish}
          disabled={!allUploaded}
          className="px-4 py-2 bg-black text-white rounded hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {allUploaded ? "Finalizar y Enviar a Aprobación" : `Completa los ${expectedCapacity - uploadedCount} tickets restantes`}
        </button>
      </div>
    </div>
  );
}



















