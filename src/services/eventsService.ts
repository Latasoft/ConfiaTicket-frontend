import api from "@/services/api";
import type { EventItem } from "@/types/event";

/* ======================= Detalle de evento ======================= */
export type EventDetails = {
  id: number;
  title: string;
  description: string;
  date: string;              // ISO (fecha del evento)
  location: string;
  capacity: number;
  price?: number;            // CLP (entero)
  approved: boolean;
  coverImageUrl?: string | null;

  // Organización (el backend puede devolver organizerId u objeto organizer)
  organizerId?: number;
  organizer?: { id: number; name: string; email: string };

  // Cálculos/flags agregados por el backend
  remaining?: number;        // capacity - (pagadas + holds activos)
  hasStarted?: boolean;      // ahora >= inicio
  canBuy?: boolean;          // aprobado, no iniciado, ventas abiertas y stock > 0

  // Nuevo: cierre de ventas y cortesía de UI
  salesClosed?: boolean;       // true si ya pasó el cutoff
  salesCloseAt?: string;       // ISO con el cutoff calculado
  startsAt?: string;           // ISO normalizado que puede enviar el backend
  salesCutoffMinutes?: number; // p.ej., 1440 (24h)
};

export async function getEventDetails(id: number): Promise<EventDetails> {
  const { data } = await api.get(`/events/${id}`);
  return data as EventDetails;
}

/* =================== Lista de eventos públicos =================== */
export type PublicEventsParams = {
  q?: string;
  order?: "DATE_ASC" | "DATE_DESC" | "PRICE_ASC" | "PRICE_DESC";
  page?: number;
  pageSize?: number;
  includePast?: boolean;      // por defecto false (solo futuros)
  includeSoldOut?: boolean;   // por defecto false (oculta agotados)
};

export type PublicEventsResponse = {
  items: EventItem[];
  total?: number;
  page?: number;
  pageSize?: number;
};

// Normaliza params y agrega alias de compatibilidad
function buildPublicParams(p: PublicEventsParams) {
  const params: Record<string, any> = {};

  if (p.q && p.q.trim()) {
    params.q = p.q.trim();
    params.search = p.q.trim(); // alias
    params.term = p.q.trim();   // alias
  }

  if (p.order) {
    params.order = p.order;
    params.sort = p.order; // alias
  }

  if (typeof p.page === "number") {
    params.page = p.page;
    params.pageIndex = p.page; // alias
  }

  if (typeof p.pageSize === "number") {
    params.pageSize = p.pageSize;
    params.limit = p.pageSize; // alias
    params.take = p.pageSize;  // alias
  }

  if (p.includePast) {
    params.includePast = true;
    params.showPast = true; // alias
  }
  if (p.includeSoldOut) {
    params.includeSoldOut = true;
    params.showSoldOut = true; // alias
  }

  return params;
}

/** ⇨ Intenta /events/public y cae a otras rutas conocidas. */
export async function getPublicEvents(
  params: PublicEventsParams = {}
): Promise<PublicEventsResponse> {
  const q = buildPublicParams(params);

  // 1) Ruta preferida
  try {
    const { data } = await api.get("/events/public", { params: q });
    if (Array.isArray(data)) {
      return { items: data, total: data.length, page: 1, pageSize: data.length };
    }
    const items: EventItem[] = data?.items ?? data?.events ?? [];
    return {
      items,
      total: data?.total ?? items.length,
      page: data?.page ?? 1,
      pageSize: data?.pageSize ?? items.length,
    };
  } catch (e: any) {
    // 2) Fallbacks
    const tryRoutes = ["/events/public-events", "/public-events"];
    for (const route of tryRoutes) {
      try {
        const { data } = await api.get(route, { params: q });
        if (Array.isArray(data)) {
          return { items: data, total: data.length, page: 1, pageSize: data.length };
        }
        const items: EventItem[] = data?.items ?? data?.events ?? [];
        return {
          items,
          total: data?.total ?? items.length,
          page: data?.page ?? 1,
          pageSize: data?.pageSize ?? items.length,
        };
      } catch {
        /* probar siguiente */
      }
    }
    throw e;
  }
}

/* ======= Compatibilidad: firma anterior `listPublicEvents` ======= */
export async function listPublicEvents(params: {
  page?: number;
  limit?: number;
  orderBy?: "date" | "createdAt" | "title" | "location" | "capacity" | "price";
  orderDir?: "asc" | "desc";
  q?: string;
  includePast?: boolean;
  includeSoldOut?: boolean;
}) {
  const order =
    params.orderBy === "price"
      ? (params.orderDir === "desc" ? "PRICE_DESC" : "PRICE_ASC")
      : (params.orderDir === "desc" ? "DATE_DESC" : "DATE_ASC");

  const resp = await getPublicEvents({
    q: params.q,
    order,
    page: params.page,
    pageSize: params.limit,
    includePast: params.includePast,
    includeSoldOut: params.includeSoldOut,
  });

  return {
    events: resp.items,
    meta: {
      page: resp.page ?? 1,
      limit: resp.pageSize ?? (resp.items?.length ?? 0),
      total: resp.total ?? (resp.items?.length ?? 0),
      pages: resp.pageSize ? Math.max(1, Math.ceil((resp.total ?? 0) / resp.pageSize)) : 1,
    },
  };
}

/* ================== Reserva (HOLD) y pago de prueba ================== */
export async function holdTickets(eventId: number, qty: number) {
  const { data } = await api.post(`/bookings/hold`, { eventId, quantity: qty });
  return data as {
    ok: boolean;
    booking?: {
      id: number;
      code: string;
      quantity: number;
      amount: number;
      expiresAt: string;
    };
    holdMinutes?: number;
    error?: string;
    remaining?: number;
  };
}

export async function confirmPaymentTest(bookingId: number) {
  const { data } = await api.post(`/bookings/${bookingId}/pay-test`);
  return data as { ok: boolean; booking?: any; error?: string };
}





