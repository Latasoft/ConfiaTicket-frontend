// src/types/event.ts

export interface EventItem {
  id: number;
  title: string;
  description?: string | null;

  /** Fecha/hora principal del evento (ISO). */
  date?: string | null;

  /** Ubicación/lugar del evento. */
  location?: string | null;

  /** Capacidad total declarada (1..4 en reventa). */
  capacity?: number | null;

  /* ==================== Precio ==================== */
  /**
   * Precio unitario en CLP (sin decimales), provisto por el backend.
   * Es el que mostramos/ocupamos en BuyBox.
   */
  price?: number | null;

  /**
   * Alias legado usado en algunas UIs (mantenido por compatibilidad).
   * Si viene `price`, úsalo como fuente de la verdad.
   */
  priceFrom?: number | null;

  /* ==================== Imágenes ==================== */
  /** URL directa de portada (devuelta por backend). */
  coverImageUrl?: string | null;

  /** Alias legado en el front. */
  imageUrl?: string | null;

  /* =========== Campos calculados por backend =========== */
  /** Entradas disponibles considerando pagadas + holds activos. */
  remaining?: number;

  /** El evento ya comenzó. */
  hasStarted?: boolean;

  /** Puede comprarse (aprobado, no iniciado, con stock). */
  canBuy?: boolean;

  /* ==================== Metadatos ==================== */
  organizerId?: number | null;
  approved?: boolean | null;
  createdAt?: string | null;
  
  /** Tipo de evento: OWN (propio) o RESALE (reventa) */
  eventType?: 'OWN' | 'RESALE' | null;

  /** Si el backend lo incluye en /events/:id */
  organizer?: { id: number; name: string; email: string } | null;

  /* ====== Compat opcional con formularios antiguos ====== */
  venue?: string | null;
  city?: string | null;
  startAt?: string | null;
  endAt?: string | null;
}


