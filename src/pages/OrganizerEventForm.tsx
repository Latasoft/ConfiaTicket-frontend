// src/pages/OrganizerEventForm.tsx
import { useEffect, useState, useCallback, useMemo, useRef } from "react";
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
import EventTypeModal, { type EventType } from "@/components/EventTypeModal";
import { getSystemConfig, type SystemConfig } from "@/services/configService";

/* =================== Límites por defecto (fallback) =================== */
const DEFAULT_LIMITS = {
  TITLE: 120,
  DESCRIPTION: 4000,
  VENUE: 120,
  CITY: 120,
  COMMUNE: 120,
  COVER_URL: 1024,
  // Capacidad (serán sobrescritos por la configuración del admin)
  CAPACITY_MIN_OWN: 1,
  CAPACITY_MAX_OWN: 999999,
  CAPACITY_MIN_RESALE: 1,
  CAPACITY_MAX_RESALE: 4,
  // Precios (serán sobrescritos)
  PRICE_MIN: 0,
  PRICE_MAX: 10000000,
  RESALE_MARKUP_PERCENT: 30,
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
// Función para crear schema dinámico según tipo de evento y configuración del sistema
function createSchema(eventType: EventType | null, config: SystemConfig | null) {
  // Usar límites de configuración o valores por defecto
  const fieldLimits = config?.fieldLimits || DEFAULT_LIMITS;
  const ticketLimits = config?.ticketLimits || {
    OWN: { MIN: DEFAULT_LIMITS.CAPACITY_MIN_OWN, MAX: DEFAULT_LIMITS.CAPACITY_MAX_OWN },
    RESALE: { MIN: DEFAULT_LIMITS.CAPACITY_MIN_RESALE, MAX: DEFAULT_LIMITS.CAPACITY_MAX_RESALE },
  };
  const priceLimits = config?.priceLimits || {
    MIN: DEFAULT_LIMITS.PRICE_MIN,
    MAX: DEFAULT_LIMITS.PRICE_MAX,
    RESALE_MARKUP_PERCENT: DEFAULT_LIMITS.RESALE_MARKUP_PERCENT,
  };

  const capacityLimits = eventType === "resale" ? ticketLimits.RESALE : ticketLimits.OWN;
  
  return z
    .object({
      // Evento
      title: z.string().trim().min(3, "Mínimo 3 caracteres").max(fieldLimits.TITLE, `Máximo ${fieldLimits.TITLE} caracteres`),
      description: z
        .string()
        .trim()
        .max(fieldLimits.DESCRIPTION, `Máximo ${fieldLimits.DESCRIPTION} caracteres`)
        .optional()
        .or(z.literal("")),
      coverImageUrl: z
        .string()
        .trim()
        .max(fieldLimits.COVER_URL, `URL demasiado larga (máx. ${fieldLimits.COVER_URL})`)
        .url("URL inválida")
        .optional()
        .or(z.literal("")),
      venue: z.string().trim().min(2, "Requerido").max(fieldLimits.VENUE, `Máximo ${fieldLimits.VENUE} caracteres`),
      city: z.string().trim().max(fieldLimits.CITY, `Máximo ${fieldLimits.CITY} caracteres`).optional(),
      commune: z.string().trim().min(2, "Requerido").max(fieldLimits.COMMUNE, `Máximo ${fieldLimits.COMMUNE} caracteres`),
      startAt: z.string().min(1, "Fecha/hora requerida"),
      endAt: z.string().optional(),

      // Capacidad dinámica según tipo y configuración
      capacity: z.preprocess(
        (v) => Number(v),
        capacityLimits.MAX !== null
          ? z
              .number()
              .int("Debe ser entero")
              .min(capacityLimits.MIN, `Mínimo ${capacityLimits.MIN}`)
              .max(capacityLimits.MAX, `Máximo ${capacityLimits.MAX.toLocaleString()}`)
          : z
              .number()
              .int("Debe ser entero")
              .min(capacityLimits.MIN, `Mínimo ${capacityLimits.MIN}`)
      ),

      // Precios con límites dinámicos
      priceBase: z
        .preprocess(
          (v) => (v === "" || v === undefined || v === null ? undefined : Number(v)), 
          eventType === "resale" 
            ? z.number().int("Debe ser entero").min(priceLimits.MIN, `Mínimo ${formatMoneyCLP(priceLimits.MIN)}`)
            : z.number().int().min(0).optional()
        )
        .optional(),
      price: z.preprocess(
        (v) => Number(v), 
        z.number().int("Debe ser entero").min(priceLimits.MIN, `Mínimo ${formatMoneyCLP(priceLimits.MIN)}`).max(priceLimits.MAX, `Máximo ${formatMoneyCLP(priceLimits.MAX)}`)
      ),
    })
    // Validación cruzada solo para reventa (usa límites dinámicos)
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
        
        // Usar el porcentaje de markup configurado por el admin
        const markupPercent = priceLimits.RESALE_MARKUP_PERCENT;
        const maxAllowed = Math.floor(vals.priceBase * (1 + markupPercent / 100));
        
        if (vals.price > maxAllowed) {
          ctx.addIssue({
            path: ["price"],
            code: z.ZodIssueCode.custom,
            message: `Con reventa, el precio no puede superar ${formatMoneyCLP(maxAllowed)} (+${markupPercent}%).`,
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

  const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);

  // Helper para obtener límites con fallback
  const limits = useMemo(() => ({
    field: systemConfig?.fieldLimits || {
      TITLE: DEFAULT_LIMITS.TITLE,
      DESCRIPTION: DEFAULT_LIMITS.DESCRIPTION,
      VENUE: DEFAULT_LIMITS.VENUE,
      CITY: DEFAULT_LIMITS.CITY,
      COMMUNE: DEFAULT_LIMITS.COMMUNE,
      COVER_URL: DEFAULT_LIMITS.COVER_URL,
    },
    ticket: systemConfig?.ticketLimits || {
      OWN: { MIN: DEFAULT_LIMITS.CAPACITY_MIN_OWN, MAX: DEFAULT_LIMITS.CAPACITY_MAX_OWN },
      RESALE: { MIN: DEFAULT_LIMITS.CAPACITY_MIN_RESALE, MAX: DEFAULT_LIMITS.CAPACITY_MAX_RESALE },
    },
    price: systemConfig?.priceLimits || {
      MIN: DEFAULT_LIMITS.PRICE_MIN,
      MAX: DEFAULT_LIMITS.PRICE_MAX,
      RESALE_MARKUP_PERCENT: DEFAULT_LIMITS.RESALE_MARKUP_PERCENT,
    },
  }), [systemConfig]);

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
  const [hasSoldTickets, setHasSoldTickets] = useState(false);
  const [soldTicketsCount, setSoldTicketsCount] = useState(0);
  const [sectionsComplete, setSectionsComplete] = useState(true);
  const [sectionsCapacity, setSectionsCapacity] = useState(0);
  const [missingCapacity, setMissingCapacity] = useState(0);
  const [toast, setToast] = useState<ErrorToast>(null);

  // Cargar configuración del sistema al montar el componente
  useEffect(() => {
    (async () => {
      try {
        const config = await getSystemConfig();
        setSystemConfig(config);
      } catch (error) {
        console.error("Error al cargar configuración del sistema:", error);
        // Continuar con valores por defecto
      }
    })();
  }, []);

  // Crear schema dinámico basado en el tipo de evento y configuración del sistema
  const schema = useMemo(() => createSchema(eventType, systemConfig), [eventType, systemConfig]);

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
      // Para reventa, usar el mínimo del límite configurado
      setValue("capacity", limits.ticket.RESALE.MIN || 1);
    }
  }, [setValue, limits]);

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
      
      // Guardar información de tickets vendidos
      setHasSoldTickets((ev as any).hasSoldTickets || false);
      setSoldTicketsCount((ev as any).soldTicketsCount || 0);
      
      // Guardar información de completitud de secciones/tickets
      setSectionsComplete((ev as any).sectionsComplete ?? true);
      setSectionsCapacity((ev as any).sectionsCapacity ?? 0);
      setMissingCapacity((ev as any).missingCapacity ?? 0);
      
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
      
      // Detectar tipo de evento basado en priceBase o capacidad
      // Si tiene priceBase o capacidad <= límite de reventa configurado, es reventa
      const isResale = (ev as any).priceBase != null || ev.capacity <= limits.ticket.RESALE.MAX;
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
  }, [id, isEdit, setValue, limits]);

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
        const normalizedPayload = {
          ...payload,
          eventType: eventType === 'resale' ? 'RESALE' : eventType === 'own' ? 'OWN' : undefined,
        };
        const response = await createMyEvent(normalizedPayload as any);
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

  // Calcular precio máximo de reventa usando la configuración del sistema
  const maxAllowedResale = priceBaseWatch > 0 
    ? Math.floor(priceBaseWatch * (1 + limits.price.RESALE_MARKUP_PERCENT / 100)) 
    : null;
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

          {/* Aviso de tickets vendidos */}
          {hasSoldTickets && (
            <div className="mb-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-amber-900 mb-1">
                    Evento con entradas vendidas
                  </h3>
                  <p className="text-sm text-amber-800 mb-2">
                    Este evento ya tiene <strong>{soldTicketsCount} {soldTicketsCount === 1 ? 'entrada vendida' : 'entradas vendidas'}</strong>.
                    Por lo tanto, no puedes modificar: fecha, ubicación, capacidad ni precios.
                  </p>
                  <p className="text-xs text-amber-700">
                    Solo puedes editar: título, descripción e imagen de portada.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Aviso de capacidad incompleta */}
          {isEdit && !sectionsComplete && (
            <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <span className="text-2xl">ℹ️</span>
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-1">
                    Capacidad incompleta
                  </h3>
                  <p className="text-sm text-blue-800 mb-2">
                    {eventType === 'own' 
                      ? `Has definido ${sectionsCapacity} de ${watch("capacity")} cupos en las secciones. Faltan ${missingCapacity} cupos por definir.`
                      : `Has cargado ${sectionsCapacity} de ${watch("capacity")} tickets. Faltan ${missingCapacity} tickets por cargar.`
                    }
                  </p>
                  <p className="text-xs text-blue-700">
                    {eventType === 'own' 
                      ? 'Debes agregar o modificar secciones hasta completar la capacidad total del evento.'
                      : 'Debes cargar más tickets hasta completar la capacidad total del evento.'
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Título *</label>
            <input
              {...register("title")}
              className="w-full border rounded px-3 py-2"
              placeholder="Ej: Concierto de Rock"
              maxLength={limits.field.TITLE}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message as string}</p>}
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              {...register("description")}
              className="w-full border rounded px-3 py-2 min-h-[100px]"
              placeholder="Detalles del evento…"
              maxLength={limits.field.DESCRIPTION}
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
                const cleaned = (sanitizeGoogleImgUrl(e.target.value.trim()) || "").slice(0, limits.field.COVER_URL);
                setValue("coverImageUrl", cleaned, { shouldDirty: true });
                setPreviewError(null);
              }}
              className="w-full border rounded px-3 py-2"
              placeholder="https://…/archivo.jpg (evita enlaces de búsqueda; usa la URL directa)"
              maxLength={limits.field.COVER_URL}
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
                disabled={hasSoldTickets}
                className={`w-full border rounded px-3 py-2 ${hasSoldTickets ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Estadio Nacional"
                maxLength={limits.field.VENUE}
                title={hasSoldTickets ? 'No se puede modificar la ubicación porque hay entradas vendidas' : ''}
              />
              {errors.venue && <p className="text-sm text-red-600">{errors.venue.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ciudad</label>
              <input
                {...register("city")}
                disabled={hasSoldTickets}
                className={`w-full border rounded px-3 py-2 ${hasSoldTickets ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Santiago"
                maxLength={limits.field.CITY}
                title={hasSoldTickets ? 'No se puede modificar la ciudad porque hay entradas vendidas' : ''}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Comuna *</label>
              <input
                {...register("commune")}
                disabled={hasSoldTickets}
                className={`w-full border rounded px-3 py-2 ${hasSoldTickets ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="Providencia"
                maxLength={limits.field.COMMUNE}
                title={hasSoldTickets ? 'No se puede modificar la comuna porque hay entradas vendidas' : ''}
              />
              {errors.commune && <p className="text-sm text-red-600">{errors.commune.message as string}</p>}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium mb-1">Inicio (fecha y hora) *</label>
              <input 
                type="datetime-local" 
                {...register("startAt")} 
                disabled={hasSoldTickets}
                className={`w-full border rounded px-3 py-2 ${hasSoldTickets ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                title={hasSoldTickets ? 'No se puede modificar la fecha porque hay entradas vendidas' : ''}
              />
              {errors.startAt && <p className="text-sm text-red-600">{errors.startAt.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Fin (opcional)</label>
              <input 
                type="datetime-local" 
                {...register("endAt")} 
                disabled={hasSoldTickets}
                className={`w-full border rounded px-3 py-2 ${hasSoldTickets ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                title={hasSoldTickets ? 'No se puede modificar la fecha porque hay entradas vendidas' : ''}
              />
            </div>
          </div>

          <div className="mb-1">
            <label className="block text-sm font-medium mb-1">
              Número de entradas * 
              <span className="text-xs text-gray-500 ml-1">
                {eventType === "resale" 
                  ? `(máx. ${limits.ticket.RESALE.MAX})` 
                  : limits.ticket.OWN.MAX !== null
                    ? `(hasta ${limits.ticket.OWN.MAX.toLocaleString()})`
                    : '(sin límite)'
                }
              </span>
            </label>
            <input
              type="number"
              min={limits.ticket[eventType === "resale" ? "RESALE" : "OWN"].MIN}
              max={limits.ticket[eventType === "resale" ? "RESALE" : "OWN"].MAX ?? undefined}
              step={1}
              {...register("capacity")}
              disabled={hasSoldTickets}
              className={`w-full border rounded px-3 py-2 ${hasSoldTickets ? 'bg-gray-100 cursor-not-allowed' : ''}`}
              placeholder={eventType === "resale" ? "1" : "100"}
              title={hasSoldTickets ? 'No se puede modificar la capacidad porque hay entradas vendidas' : ''}
            />
            {errors.capacity && <p className="text-sm text-red-600">{errors.capacity.message as string}</p>}
            {eventType === "resale" && (
              <p className="text-xs text-blue-600 mt-1">
                Reventa: Máximo {limits.ticket.RESALE.MAX.toLocaleString()} entradas permitidas
              </p>
            )}
            {eventType === "own" && (
              <p className="text-xs text-green-600 mt-1">
                Evento propio: {limits.ticket.OWN.MAX !== null 
                  ? `Hasta ${limits.ticket.OWN.MAX.toLocaleString()} entradas` 
                  : 'Sin límite de capacidad'
                }
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
                  disabled={hasSoldTickets}
                  className={`w-full border rounded px-3 py-2 ${hasSoldTickets ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                  placeholder="Ej: 10000"
                  title={hasSoldTickets ? 'No se puede modificar el precio porque hay entradas vendidas' : ''}
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
                disabled={hasSoldTickets}
                className={`w-full border rounded px-3 py-2 ${hasSoldTickets ? 'bg-gray-100 cursor-not-allowed' : ''} ${errors.price ? "border-red-400" : ""}`}
                placeholder="Ej: 12000"
                title={hasSoldTickets ? 'No se puede modificar el precio porque hay entradas vendidas' : ''}
              />
              {eventType === "resale" && maxAllowedResale !== null && (
                <p className="text-xs text-gray-500 mt-1">
                  Máximo permitido: <strong>{formatMoneyCLP(maxAllowedResale)}</strong> (+{limits.price.RESALE_MARKUP_PERCENT}% del precio base).
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
  type Section = {
    id: number;
    name: string;
    rowStart: string | null;
    rowEnd: string | null;
    seatsPerRow: number | null;
    seatStart: number | null;
    seatEnd: number | null;
    totalCapacity: number;
  };

  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  // formulario para nueva seccion
  const [sectionForm, setSectionForm] = useState({
    name: "",
    rowStart: "",
    rowEnd: "",
    seatsPerRow: "",
    seatStart: "",
    seatEnd: "",
    useRangeMode: true, // true = rango de filas, false = rango de asientos
  });

  // cargar secciones existentes
  async function fetchSections() {
    setLoading(true);
    try {
      const { listEventSections } = await import("@/services/organizerEventsService");
      const data = await listEventSections(eventId);
      setSections(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error al cargar secciones:", err);
      setError(err.response?.data?.error || "Error al cargar secciones");
      setSections([]); // Asegurar que sea un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  async function handleCreateSection() {
    const { name, rowStart, rowEnd, seatsPerRow, seatStart, seatEnd, useRangeMode } = sectionForm;

    if (!name.trim()) {
      setError("El nombre de la sección es requerido");
      return;
    }

    const payload: any = { name: name.trim() };

    // Calcular capacidad estimada de la nueva sección
    let estimatedCapacity = 0;

    if (useRangeMode) {
      // modo rango de filas
      if (!rowStart || !rowEnd || !seatsPerRow) {
        setError("Debes completar fila inicio, fila fin y asientos por fila");
        return;
      }
      payload.rowStart = rowStart.trim();
      payload.rowEnd = rowEnd.trim();
      payload.seatsPerRow = Number(seatsPerRow);
      
      // Estimar capacidad: calcular número de filas y multiplicar por asientos por fila
      const startChar = rowStart.trim().charCodeAt(0);
      const endChar = rowEnd.trim().charCodeAt(0);
      const numRows = Math.abs(endChar - startChar) + 1;
      estimatedCapacity = numRows * Number(seatsPerRow);
    } else {
      // modo rango de asientos
      if (!seatStart || !seatEnd) {
        setError("Debes completar asiento inicio y asiento fin");
        return;
      }
      payload.seatStart = Number(seatStart);
      payload.seatEnd = Number(seatEnd);
      
      // Estimar capacidad: diferencia entre asientos + 1
      estimatedCapacity = Math.abs(Number(seatEnd) - Number(seatStart)) + 1;
    }

    // Validar que no se exceda la capacidad del evento
    const currentCapacity = totalSectionCapacity;
    const remainingCapacity = expectedCapacity - currentCapacity;

    if (estimatedCapacity > remainingCapacity) {
      setError(
        `La capacidad estimada de esta sección (${estimatedCapacity.toLocaleString()}) excede la capacidad restante del evento (${remainingCapacity.toLocaleString()}). ` +
        `Ajusta los parámetros de la sección.`
      );
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { createEventSection } = await import("@/services/organizerEventsService");
      const newSection = await createEventSection(eventId, payload);
      setSections([...sections, newSection]);
      setSuccess(`Sección "${newSection.name}" creada exitosamente (Capacidad: ${newSection.totalCapacity})`);
      setSectionForm({
        name: "",
        rowStart: "",
        rowEnd: "",
        seatsPerRow: "",
        seatStart: "",
        seatEnd: "",
        useRangeMode: true,
      });
      setShowForm(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al crear sección");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteSection(sectionId: number) {
    if (!confirm("¿Estás seguro de eliminar esta sección?")) return;

    setLoading(true);
    try {
      const { deleteEventSection } = await import("@/services/organizerEventsService");
      await deleteEventSection(eventId, sectionId);
      setSections(sections.filter(s => s.id !== sectionId));
      setSuccess("Sección eliminada");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al eliminar sección");
    } finally {
      setLoading(false);
    }
  }

  const totalSectionCapacity = Array.isArray(sections) 
    ? sections.reduce((sum, s) => sum + s.totalCapacity, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-green-500 bg-green-50 p-4 rounded">
        <h2 className="text-lg font-semibold text-green-900">Evento Propio - Definir Secciones</h2>
        <p className="text-sm text-green-800 mt-1">
          Define las secciones de tu evento. Los tickets se generarán automáticamente cuando los usuarios compren.
        </p>
      </div>

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

      {/* Resumen de capacidad */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">Estado actual</h4>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-blue-800">Capacidad del evento:</p>
            <p className="text-2xl font-bold text-blue-900">{expectedCapacity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-800">Capacidad en secciones:</p>
            <p className="text-2xl font-bold text-blue-900">{totalSectionCapacity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-blue-800">Capacidad restante:</p>
            <p className={`text-2xl font-bold ${
              expectedCapacity - totalSectionCapacity > 0 ? 'text-green-600' : 'text-gray-500'
            }`}>
              {(expectedCapacity - totalSectionCapacity).toLocaleString()}
            </p>
          </div>
        </div>
        {totalSectionCapacity > 0 && totalSectionCapacity !== expectedCapacity && (
          <div className={`text-xs mt-2 ${
            totalSectionCapacity < expectedCapacity 
              ? 'text-blue-700' 
              : 'text-amber-700'
          }`}>
            {totalSectionCapacity < expectedCapacity ? (
              <p>ℹ️ Faltan {(expectedCapacity - totalSectionCapacity).toLocaleString()} asientos por definir en secciones</p>
            ) : (
              <p>⚠️ La capacidad en secciones ({totalSectionCapacity.toLocaleString()}) excede la capacidad del evento ({expectedCapacity.toLocaleString()})</p>
            )}
          </div>
        )}
      </div>

      {/* Lista de secciones */}
      {loading && sections.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Cargando secciones...</div>
      ) : sections.length > 0 ? (
        <div className="border rounded-lg overflow-hidden">
          <h3 className="font-semibold p-4 border-b bg-gray-50">Secciones Creadas</h3>
          <div className="divide-y">
            {sections.map((section) => (
              <div key={section.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold">{section.name}</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-600 mt-2">
                      {section.rowStart && (
                        <>
                          <div>
                            <span className="text-xs text-gray-500">Filas:</span>{" "}
                            <span className="font-medium">{section.rowStart} - {section.rowEnd}</span>
                          </div>
                          <div>
                            <span className="text-xs text-gray-500">Asientos/fila:</span>{" "}
                            <span className="font-medium">{section.seatsPerRow}</span>
                          </div>
                        </>
                      )}
                      {section.seatStart && (
                        <div>
                          <span className="text-xs text-gray-500">Asientos:</span>{" "}
                          <span className="font-medium">{section.seatStart} - {section.seatEnd}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-gray-500">Capacidad:</span>{" "}
                        <span className="font-bold text-green-600">{section.totalCapacity}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteSection(section.id)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-800 text-sm ml-4"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-2">Aún no hay secciones definidas</p>
          <p className="text-sm text-gray-500">
            Crea al menos una sección para tu evento
          </p>
        </div>
      )}

      {/* Boton para mostrar formulario */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          disabled={totalSectionCapacity >= expectedCapacity}
          className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          title={totalSectionCapacity >= expectedCapacity ? "La capacidad del evento está completa" : ""}
        >
          {totalSectionCapacity >= expectedCapacity 
            ? "Capacidad completa - No se pueden agregar más secciones" 
            : "+ Agregar Sección"
          }
        </button>
      )}

      {/* Formulario de nueva seccion */}
      {showForm && (
        <div className="border rounded-lg p-6 bg-gray-50">
          <h3 className="font-semibold mb-4">Nueva Sección</h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Nombre de la Sección *
              </label>
              <input
                type="text"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                className="w-full border rounded px-3 py-2"
                placeholder="Ej: Platea A, Tribuna Norte, VIP"
                maxLength={100}
              />
            </div>

            <div className="border-t pt-4">
              <label className="flex items-center gap-2 mb-3">
                <input
                  type="checkbox"
                  checked={sectionForm.useRangeMode}
                  onChange={(e) => setSectionForm({ ...sectionForm, useRangeMode: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Usar rango de filas</span>
              </label>

              {sectionForm.useRangeMode ? (
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Fila Inicio *</label>
                    <input
                      type="text"
                      value={sectionForm.rowStart}
                      onChange={(e) => setSectionForm({ ...sectionForm, rowStart: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="A"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Fila Fin *</label>
                    <input
                      type="text"
                      value={sectionForm.rowEnd}
                      onChange={(e) => setSectionForm({ ...sectionForm, rowEnd: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="Z"
                      maxLength={10}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Asientos por Fila *</label>
                    <input
                      type="number"
                      value={sectionForm.seatsPerRow}
                      onChange={(e) => setSectionForm({ ...sectionForm, seatsPerRow: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="20"
                      min="1"
                    />
                  </div>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Asiento Inicio *</label>
                    <input
                      type="number"
                      value={sectionForm.seatStart}
                      onChange={(e) => setSectionForm({ ...sectionForm, seatStart: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="1"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Asiento Fin *</label>
                    <input
                      type="number"
                      value={sectionForm.seatEnd}
                      onChange={(e) => setSectionForm({ ...sectionForm, seatEnd: e.target.value })}
                      className="w-full border rounded px-3 py-2"
                      placeholder="100"
                      min="1"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCreateSection}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear Sección"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                disabled={loading}
                className="px-4 py-2 border rounded hover:bg-gray-100"
              >
                Cancelar
              </button>
            </div>
          </div>
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
          disabled={sections.length === 0 || totalSectionCapacity !== expectedCapacity}
          className="px-4 py-2 bg-black text-white rounded hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            sections.length === 0 
              ? "Debes crear al menos una sección" 
              : totalSectionCapacity !== expectedCapacity
              ? `Debes completar la capacidad del evento (${totalSectionCapacity}/${expectedCapacity})`
              : ""
          }
        >
          {sections.length === 0 
            ? "Debes crear al menos una sección" 
            : totalSectionCapacity !== expectedCapacity
            ? `Falta completar capacidad (${totalSectionCapacity}/${expectedCapacity})`
            : "Finalizar y Enviar a Aprobación"
          }
        </button>
      </div>
    </div>
  );
}

/* =================== Tickets para Reventa =================== */
function ResaleTicketsStep({
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
  // Importar el tipo ResaleTicket del servicio
  const [tickets, setTickets] = useState<any[]>([]);
  const [currentTicket, setCurrentTicket] = useState({
    row: "",
    seat: "",
    zone: "",
    level: "",
    description: "",
  });
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [currentPreview, setCurrentPreview] = useState<string>("");
  const [error, setError] = useState<React.ReactNode>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Ref para limpiar el input file después de guardar
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar tickets existentes
  async function fetchTickets() {
    setLoading(true);
    try {
      const { listResaleTickets } = await import("@/services/organizerEventsService");
      const data = await listResaleTickets(eventId);
      setTickets(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Error al cargar tickets:", err);
      setError(err.response?.data?.error || "Error al cargar tickets");
      setTickets([]); // Asegurar que sea un array vacío en caso de error
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // validar tipo
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.type)) {
      setError("Solo se permiten imágenes JPG o PNG");
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
    const reader = new FileReader();
    reader.onloadend = () => {
      setCurrentPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddTicket = async () => {
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
      const { createResaleTicket } = await import("@/services/organizerEventsService");
      
      const payload = {
        row: currentTicket.row.trim(),
        seat: currentTicket.seat.trim(),
        ticketCode: `${currentTicket.row.trim()}-${currentTicket.seat.trim()}`,
        zone: currentTicket.zone.trim() || undefined,
        level: currentTicket.level.trim() || undefined,
        description: currentTicket.description.trim() || undefined,
        ticketFile: currentFile,
      };

      const newTicket = await createResaleTicket(eventId, payload);
      setTickets([...tickets, newTicket]);

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
      
      // Limpiar el input file usando la ref
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      
      setSuccess(`Ticket guardado correctamente`);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      // Manejar errores de extracción de QR específicamente
      const errorMsg = err.response?.data?.error || err.message || "Error al guardar el ticket";
      const errorDetails = err.response?.data?.details;
      
      if (errorDetails && Array.isArray(errorDetails)) {
        // Si el backend devuelve detalles (error de QR), mostrarlos
        setError(
          <div>
            <p className="font-semibold mb-2">{errorMsg}</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {errorDetails.map((detail: string, idx: number) => (
                <li key={idx}>{detail}</li>
              ))}
            </ul>
          </div>
        );
      } else {
        setError(errorMsg);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveTicket = async (ticketId: number) => {
    if (!confirm("¿Estás seguro de eliminar este ticket?")) return;

    setLoading(true);
    try {
      const { deleteResaleTicket } = await import("@/services/organizerEventsService");
      await deleteResaleTicket(eventId, ticketId);
      setTickets(tickets.filter(t => t.id !== ticketId));
      setSuccess("Ticket eliminado");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al eliminar el ticket");
    } finally {
      setLoading(false);
    }
  };

  const uploadedCount = tickets.length;
  const allUploaded = uploadedCount === expectedCapacity;
  const canAddMore = uploadedCount < expectedCapacity;

  return (
    <div className="space-y-6">
      <div className="border-l-4 border-blue-500 bg-blue-50 p-4 rounded">
        <div className="flex items-start gap-3">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">Reventa - Información de Tickets</h2>
            <p className="text-sm text-blue-800 mt-1">
              Sube las imágenes de las entradas que vas a revender (máximo {expectedCapacity})
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
                : `Puedes agregar ${expectedCapacity - uploadedCount} entrada(s) más`
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
      {loading && tickets.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Cargando tickets...</div>
      ) : tickets.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tickets.map((ticket) => (
            <div key={ticket.id} className="border rounded-lg p-4 bg-green-50 border-green-300">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm">Ticket #{ticket.id}</h3>
                <button
                  onClick={() => handleRemoveTicket(ticket.id)}
                  disabled={loading}
                  className="text-xs text-red-600 hover:underline disabled:opacity-50"
                >
                  Eliminar
                </button>
              </div>

              <div className="space-y-2 text-sm">
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
            </div>
          ))}
        </div>
      ) : (
        <div className="border rounded-lg p-8 text-center">
          <p className="text-gray-600 mb-2">Aún no has subido tickets</p>
          <p className="text-sm text-gray-500">
            Completa el formulario abajo para agregar tus entradas
          </p>
        </div>
      )}

      {/* formulario para agregar ticket */}
      {canAddMore && (
        <div id="ticket-form" className="border rounded-lg p-6 bg-gray-50">
          <h3 className="font-semibold mb-4">Agregar nuevo ticket</h3>
          
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
              Imagen del Ticket * <span className="text-xs text-gray-500">(JPG o PNG - máx 10MB)</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/jpg"
              onChange={handleFileChange}
              ref={fileInputRef}
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
            onClick={handleAddTicket}
            disabled={uploading || !currentTicket.row || !currentTicket.seat || !currentFile}
            className="w-full md:w-auto px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Guardando..." : "Guardar Ticket"}
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
          disabled={tickets.length === 0 || tickets.length !== expectedCapacity}
          className="px-4 py-2 bg-black text-white rounded hover:bg-black/90 disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            tickets.length === 0 
              ? "Debes subir al menos un ticket" 
              : tickets.length !== expectedCapacity
              ? `Debes subir exactamente ${expectedCapacity} tickets (${tickets.length}/${expectedCapacity})`
              : ""
          }
        >
          {tickets.length === 0 
            ? "Debes subir al menos un ticket" 
            : tickets.length !== expectedCapacity
            ? `Falta completar capacidad (${tickets.length}/${expectedCapacity})`
            : "Finalizar y Enviar a Aprobación"
          }
        </button>
      </div>
    </div>
  );
}



















