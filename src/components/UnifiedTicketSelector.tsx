// src/components/UnifiedTicketSelector.tsx
import { useState, useEffect } from 'react';
import api from '../services/api';
import type { ResaleTicket, EventSection } from '../types/ticket';

interface SectionSelection {
  section: EventSection | ResaleTicket;
  quantity: number;
  seats: string[];
  isResale: boolean;
}

interface Props {
  eventId: number;
  eventType: 'RESALE' | 'OWN';
  onSelectionsChange: (selections: SectionSelection[]) => void;
}

export default function UnifiedTicketSelector({ eventId, eventType, onSelectionsChange }: Props) {
  const [sections, setSections] = useState<EventSection[]>([]);
  const [resaleTickets, setResaleTickets] = useState<ResaleTicket[]>([]);
  const [cart, setCart] = useState<SectionSelection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, [eventId, eventType]);

  const loadItems = async () => {
    try {
      setLoading(true);
      
      if (eventType === 'OWN') {
        const response = await api.get(`/events/${eventId}/sections`);
        setSections(response.data);
      } else {
        const response = await api.get(`/events/${eventId}/resale-tickets`);
        setResaleTickets(response.data);
      }
    } catch (err: any) {
      console.error('❌ [ERROR] Error al cargar opciones:', err);
      console.error('  - Response:', err.response?.data);
      setError(err.response?.data?.error || 'Error al cargar las opciones');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOwnSection = (section: EventSection, quantity: number, seats: string[]) => {
    const newCart = [...cart];
    const existingIndex = newCart.findIndex(
      (item) => !item.isResale && (item.section as EventSection).id === section.id
    );

    if (existingIndex >= 0) {
      newCart[existingIndex] = { section, quantity, seats, isResale: false };
    } else {
      newCart.push({ section, quantity, seats, isResale: false });
    }

    setCart(newCart);
    onSelectionsChange(newCart);
    
    // Scroll suave al carrito después de agregar
    setTimeout(() => {
      const cartElement = document.getElementById('cart-section');
      if (cartElement) {
        cartElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  const handleAddResaleTicket = (ticket: ResaleTicket) => {
    // Verificar si el ticket ya está seleccionado
    const isAlreadySelected = cart.some(
      (item) => item.isResale && (item.section as ResaleTicket).id === ticket.id
    );

    let newCart: SectionSelection[];
    if (isAlreadySelected) {
      // Si ya está seleccionado, deseleccionarlo
      newCart = cart.filter(
        (item) => !(item.isResale && (item.section as ResaleTicket).id === ticket.id)
      );
    } else {
      // Solo se puede seleccionar 1 ticket de reventa a la vez
      newCart = [{ section: ticket, quantity: 1, seats: [], isResale: true }];
    }
    
    setCart(newCart);
    onSelectionsChange(newCart);
    
    // Scroll suave al carrito después de agregar (solo si agregó)
    if (!isAlreadySelected) {
      setTimeout(() => {
        const cartElement = document.getElementById('cart-section');
        if (cartElement) {
          cartElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    }
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = cart.filter((_, i) => i !== index);
    setCart(newCart);
    onSelectionsChange(newCart);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-dark-700 border-t-neon-cyan"></div>
          <div className="absolute inset-0 rounded-full bg-neon-cyan/10 blur-xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel-error p-4 rounded-lg border border-red-500/20">
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lista de opciones disponibles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-dark-50">
          {eventType === 'OWN' ? 'Selecciona tu sección' : 'Entradas disponibles'}
        </h3>

        {eventType === 'OWN' ? (
          // Render sections for OWN events
          <div className="space-y-3">
            {sections.length === 0 ? (
              <div className="glass-panel-warning p-6 text-center rounded-lg border border-yellow-500/20">
                <svg className="mx-auto h-12 w-12 text-yellow-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h4 className="text-lg font-semibold text-yellow-300 mb-2">No hay secciones configuradas</h4>
                <p className="text-dark-300 text-sm">
                  El organizador aún no ha configurado las secciones para este evento.
                </p>
              </div>
            ) : (
              sections.map((section) => {
                return (
                  <OwnSectionCard
                    key={section.id}
                    section={section}
                    onAdd={handleAddOwnSection}
                    isInCart={cart.some(
                      (item) => !item.isResale && (item.section as EventSection).id === section.id
                    )}
                    eventId={eventId}
                  />
                );
              })
            )}
          </div>
        ) : (
          // Render tickets for RESALE events in unified style  
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {resaleTickets.length === 0 ? (
              <div className="col-span-full glass-panel p-6 text-center rounded-lg border border-dark-700">
                <svg className="mx-auto h-12 w-12 text-dark-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <h4 className="text-lg font-semibold text-dark-100 mb-2">No hay entradas disponibles</h4>
                <p className="text-dark-400 text-sm">
                  Actualmente no hay tickets en reventa para este evento.
                </p>
              </div>
            ) : (
              resaleTickets.map((ticket) => (
                <ResaleTicketCard
                  key={ticket.id}
                  ticket={ticket}
                  onSelect={handleAddResaleTicket}
                  isSelected={cart.some(
                    (item) => item.isResale && (item.section as ResaleTicket).id === ticket.id
                  )}
                />
              ))
            )}
          </div>
        )}
      </div>

      {/* Carrito */}
      {cart.length > 0 && (
        <div 
          id="cart-section"
          className="glass-panel-accent p-4 rounded-lg border border-neon-cyan/30 shadow-glow-cyan animate-fade-in"
        >
          <h4 className="font-semibold text-neon-cyan mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Tu selección:
          </h4>
          <div className="space-y-2">
            {cart.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between glass-panel p-3 rounded border border-dark-700 transition-all duration-200 hover:border-neon-cyan/50 animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-1">
                  {item.isResale ? (
                    <div>
                      <p className="font-medium text-dark-50">Entrada - Fila {(item.section as ResaleTicket).row}, Asiento {(item.section as ResaleTicket).seat}</p>
                      {(item.section as ResaleTicket).zone && (
                        <p className="text-sm text-dark-400">Zona: {(item.section as ResaleTicket).zone}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium text-dark-50">{(item.section as EventSection).name}</p>
                      <p className="text-sm text-dark-400">
                        {item.quantity} {item.quantity === 1 ? 'entrada' : 'entradas'}
                        {item.seats.length > 0 && ` - Asientos: ${item.seats.join(', ')}`}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveFromCart(index)}
                  className="ml-4 text-red-400 hover:text-red-300 transition-colors duration-150 hover:scale-110 transform"
                  aria-label="Eliminar del carrito"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Component for OWN event sections
function OwnSectionCard({
  section,
  onAdd,
  isInCart,
  eventId,
}: {
  section: EventSection;
  onAdd: (section: EventSection, quantity: number, seats: string[]) => void;
  isInCart: boolean;
  eventId: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [occupiedSeats, setOccupiedSeats] = useState<Set<string>>(new Set());

  // Cargar asientos ocupados cuando se expande la sección
  useEffect(() => {
    if (expanded && occupiedSeats.size === 0) {
      api.get(`/events/${eventId}/sections/${section.id}/occupied-seats`)
        .then(response => {
          setOccupiedSeats(new Set(response.data.occupiedSeats));
        })
        .catch(error => {
          console.error('Error al cargar asientos ocupados:', error);
        });
    }
  }, [expanded]); // Solo depende de expanded, no de otros estados

  const handleQuantityChange = (newQty: number) => {
    setQuantity(newQty);
    
    // Ajustar asientos seleccionados si es necesario
    if (selectedSeats.length > newQty) {
      // Reducir: mantener solo los primeros N asientos seleccionados
      setSelectedSeats(selectedSeats.slice(0, newQty));
    }
  };

  const handleSeatClick = (seat: string) => {
    // No permitir seleccionar asientos ocupados
    if (occupiedSeats.has(seat)) {
      return;
    }
    
    if (selectedSeats.includes(seat)) {
      setSelectedSeats(selectedSeats.filter((s) => s !== seat));
    } else if (selectedSeats.length < quantity) {
      setSelectedSeats([...selectedSeats, seat]);
    }
  };

  const handleAddToCart = () => {
    onAdd(section, quantity, selectedSeats);
    setExpanded(false);
  };

  // Generar filas y asientos usando rowStart, rowEnd, seatsPerRow
  const generateRows = () => {
    const rows: string[] = [];
    if (section.rowStart && section.rowEnd) {
      // Normalizar a mayúsculas para el procesamiento
      const rowStartUpper = section.rowStart.toUpperCase();
      const rowEndUpper = section.rowEnd.toUpperCase();
      
      // Soporta letras y números
      const isAlpha = /^[A-Z]+$/.test(rowStartUpper) && /^[A-Z]+$/.test(rowEndUpper);
      
      if (isAlpha) {
        const letterToNumber = (str: string): number => {
          let result = 0;
          for (let i = 0; i < str.length; i++) {
            result = result * 26 + (str.charCodeAt(i) - 64);
          }
          return result;
        };
        const numberToLetter = (num: number): string => {
          let str = '';
          while (num > 0) {
            str = String.fromCharCode(((num - 1) % 26) + 65) + str;
            num = Math.floor((num - 1) / 26);
          }
          return str;
        };
        const start = letterToNumber(rowStartUpper);
        const end = letterToNumber(rowEndUpper);
        for (let i = start; i <= end; i++) {
          rows.push(numberToLetter(i));
        }
      } else {
        const start = parseInt(section.rowStart);
        const end = parseInt(section.rowEnd);
        for (let i = start; i <= end; i++) {
          rows.push(i.toString());
        }
      }
    }
    return rows;
  };

  const rows = generateRows();
  const seatsPerRow = section.seatsPerRow || 0;
  const hasSeats = rows.length > 0 && seatsPerRow > 0;
  const canConfirm = hasSeats ? selectedSeats.length === quantity : true;
  const isSoldOut = section.available !== undefined && section.available === 0;

  return (
    <div className={`glass-panel rounded-lg overflow-hidden border transition-all duration-200 ${
      isSoldOut ? 'opacity-60 border-dark-700' : 'border-dark-700 hover:border-neon-cyan/50 hover:shadow-glow-cyan'
    }`}>
      <button
        onClick={() => !isSoldOut && setExpanded(!expanded)}
        disabled={isSoldOut}
        className={`w-full p-4 text-left transition-all duration-200 flex items-center justify-between ${
          isSoldOut ? 'cursor-not-allowed' : 'hover:bg-dark-800/50'
        }`}
      >
        <div className="flex-1">
          <h4 className="font-semibold text-dark-50">{section.name}</h4>
          <div className="flex items-center gap-3 text-sm text-dark-400">
            <span>Capacidad total: {section.totalCapacity}</span>
            {section.available !== undefined && (
              <>
                <span className="text-dark-600">•</span>
                <span className={section.available > 0 ? 'text-neon-green font-medium' : 'text-red-400 font-medium'}>
                  {section.available > 0 ? `${section.available} disponibles` : 'Agotado'}
                </span>
              </>
            )}
          </div>
          {section.description && (
            <p className="text-sm text-dark-500 mt-1">{section.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isInCart && (
            <span className="px-2 py-1 bg-neon-cyan/20 text-neon-cyan text-xs rounded-full animate-pulse-subtle border border-neon-cyan/30">
              En carrito
            </span>
          )}
          <svg
            className={`w-5 h-5 text-dark-400 transition-transform ${
              expanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="p-4 bg-dark-850 border-t border-dark-700 space-y-4">
          {/* Selector de cantidad */}
          <div>
            <label className="block text-sm font-medium text-dark-200 mb-2">
              Cantidad de entradas:
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                className="px-3 py-1 glass-panel border border-dark-700 rounded hover:border-neon-cyan/50 text-dark-200 transition"
              >
                -
              </button>
              <span className="px-4 py-1 glass-panel border border-dark-700 rounded text-dark-50">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                className="px-3 py-1 glass-panel border border-dark-700 rounded hover:border-neon-cyan/50 text-dark-200 transition"
              >
                +
              </button>
              <span className="text-xs text-dark-500 ml-2">
                (Sin límite)
              </span>
            </div>
          </div>

          {/* Selector de asientos (con tabla de filas y columnas) */}
          {hasSeats && (
            <div>
              <label className="block text-sm font-medium text-dark-200 mb-2">
                Selecciona {quantity} asiento{quantity > 1 ? 's' : ''}
                {selectedSeats.length > 0 && (
                  <span className="ml-2 text-xs text-neon-green font-semibold">
                    ({selectedSeats.length}/{quantity})
                  </span>
                )}
              </label>

              {/* Leyenda de colores */}
              <div className="flex gap-4 mb-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-dark-700 border border-dark-600 rounded"></div>
                  <span className="text-dark-400">Disponible</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-neon-cyan rounded shadow-glow-cyan"></div>
                  <span className="text-dark-400">Seleccionado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-dark-400">Ocupado</span>
                </div>
              </div>
              
              <div className="glass-panel rounded-lg border border-dark-700 p-3 max-h-64 overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-dark-800 z-10">
                    <tr>
                      <th className="border border-dark-700 p-2 font-semibold text-neon-cyan">Fila</th>
                      {[...Array(seatsPerRow)].map((_, idx) => (
                        <th key={idx} className="border border-dark-700 p-2 font-semibold text-neon-cyan">
                          {idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row}>
                        <td className="border border-dark-700 p-2 font-bold bg-dark-850 text-center text-dark-200">
                          {row}
                        </td>
                        {[...Array(seatsPerRow)].map((_, seatIdx) => {
                          const seatId = `${row}-${seatIdx + 1}`;
                          const isSelectedSeat = selectedSeats.includes(seatId);
                          const isOccupied = occupiedSeats.has(seatId);
                          const canSelectSeat = !isOccupied && (selectedSeats.length < quantity || isSelectedSeat);
                          
                          return (
                            <td key={seatId} className="border border-dark-700 p-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSeatClick(seatId);
                                }}
                                disabled={isOccupied || !canSelectSeat}
                                className={`w-full h-8 rounded font-bold transition-all ${
                                  isOccupied
                                    ? 'bg-red-500 text-white cursor-not-allowed opacity-75'
                                    : isSelectedSeat 
                                    ? 'bg-neon-cyan text-dark-900 scale-105 shadow-glow-cyan' 
                                    : canSelectSeat
                                    ? 'bg-dark-700 hover:bg-dark-600 text-dark-200 hover:scale-105 border border-dark-600'
                                    : 'bg-dark-850 text-dark-700 cursor-not-allowed'
                                }`}
                                title={isOccupied ? 'Asiento ocupado' : isSelectedSeat ? 'Seleccionado' : 'Disponible'}
                              >
                                {isOccupied ? '✕' : isSelectedSeat ? '✓' : seatIdx + 1}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {selectedSeats.length > 0 && (
                <div className="mt-2 p-2 glass-panel-accent border border-neon-cyan/30 rounded text-xs">
                  <span className="font-semibold text-neon-cyan">Asientos seleccionados:</span>
                  <span className="ml-2 text-dark-200">{selectedSeats.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={!canConfirm}
            className="w-full py-2 px-4 btn-primary rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transform shadow-md hover:shadow-glow-cyan"
          >
            {isInCart ? 'Actualizar Selección' : 'Agregar al Carrito'}
          </button>
          
          {!canConfirm && hasSeats && (
            <p className="text-xs text-yellow-400 text-center font-medium">
              Debes seleccionar exactamente {quantity} asiento{quantity > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// Component for RESALE tickets with unified style
function ResaleTicketCard({
  ticket,
  onSelect,
  isSelected,
}: {
  ticket: ResaleTicket;
  onSelect: (ticket: ResaleTicket) => void;
  isSelected: boolean;
}) {
  return (
    <div
      className={`glass-panel rounded-lg p-3 border transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-neon-cyan shadow-glow-cyan bg-neon-cyan/10 scale-105'
          : 'border-dark-700 hover:border-neon-purple/50 hover:shadow-glow-purple hover:scale-102'
      }`}
      onClick={() => onSelect(ticket)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg className="w-4 h-4 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            <h4 className="font-semibold text-sm text-dark-50">Ticket Original</h4>
          </div>
          
          <div className="space-y-0.5 text-xs text-dark-400">
            <p className="flex items-center gap-1">
              <span className="font-medium text-dark-300">Fila:</span> {ticket.row}
              <span className="mx-1">•</span>
              <span className="font-medium text-dark-300">Asiento:</span> {ticket.seat}
            </p>
            {ticket.zone && (
              <p>
                <span className="font-medium text-dark-300">Zona:</span> {ticket.zone}
              </p>
            )}
          </div>
        </div>

        {isSelected && (
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-neon-cyan rounded-full flex items-center justify-center shadow-glow-cyan">
              <svg className="w-3 h-3 text-dark-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <button
        className={`w-full py-1.5 px-3 rounded-lg font-medium text-sm transition-all ${
          isSelected
            ? 'bg-neon-cyan text-dark-900 shadow-glow-cyan'
            : 'bg-dark-800 text-dark-200 hover:bg-dark-700 border border-dark-700'
        }`}
      >
        {isSelected ? 'Seleccionado ✓' : 'Seleccionar'}
      </button>
    </div>
  );
}
