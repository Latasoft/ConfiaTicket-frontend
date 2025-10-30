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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Lista de opciones disponibles */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          {eventType === 'OWN' ? 'Selecciona tu sección' : 'Entradas disponibles'}
        </h3>

        {eventType === 'OWN' ? (
          // Render sections for OWN events
          <div className="space-y-3">
            {sections.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-yellow-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h4 className="text-lg font-semibold text-yellow-900 mb-2">No hay secciones configuradas</h4>
                <p className="text-yellow-800 text-sm">
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
              <div className="col-span-full bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No hay entradas disponibles</h4>
                <p className="text-gray-600 text-sm">
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
          className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-4 shadow-lg animate-fade-in"
        >
          <h4 className="font-semibold text-blue-900 mb-3">Tu selección:</h4>
          <div className="space-y-2">
            {cart.map((item, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-white rounded p-3 shadow-sm transition-all duration-200 hover:shadow-md animate-slide-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex-1">
                  {item.isResale ? (
                    <div>
                      <p className="font-medium">Entrada - Fila {(item.section as ResaleTicket).row}, Asiento {(item.section as ResaleTicket).seat}</p>
                      {(item.section as ResaleTicket).zone && (
                        <p className="text-sm text-gray-600">Zona: {(item.section as ResaleTicket).zone}</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="font-medium">{(item.section as EventSection).name}</p>
                      <p className="text-sm text-gray-600">
                        {item.quantity} {item.quantity === 1 ? 'entrada' : 'entradas'}
                        {item.seats.length > 0 && ` - Asientos: ${item.seats.join(', ')}`}
                      </p>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveFromCart(index)}
                  className="ml-4 text-red-600 hover:text-red-800 transition-colors duration-150 hover:scale-110 transform"
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
    <div className={`border rounded-lg overflow-hidden shadow-sm transition-shadow duration-200 ${
      isSoldOut ? 'bg-gray-100 opacity-60' : 'bg-white hover:shadow-md'
    }`}>
      <button
        onClick={() => !isSoldOut && setExpanded(!expanded)}
        disabled={isSoldOut}
        className={`w-full p-4 text-left transition-all duration-200 flex items-center justify-between ${
          isSoldOut ? 'cursor-not-allowed' : 'hover:bg-gray-50'
        }`}
      >
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{section.name}</h4>
          <div className="flex items-center gap-3 text-sm text-gray-600">
            <span>Capacidad total: {section.totalCapacity}</span>
            {section.available !== undefined && (
              <>
                <span className="text-gray-400">•</span>
                <span className={section.available > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                  {section.available > 0 ? `${section.available} disponibles` : 'Agotado'}
                </span>
              </>
            )}
          </div>
          {section.description && (
            <p className="text-sm text-gray-500 mt-1">{section.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isInCart && (
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full animate-pulse-subtle">
              En carrito
            </span>
          )}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${
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
        <div className="p-4 bg-gray-50 border-t space-y-4">
          {/* Selector de cantidad */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cantidad de entradas:
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleQuantityChange(Math.max(1, quantity - 1))}
                className="px-3 py-1 border rounded hover:bg-gray-100"
              >
                -
              </button>
              <span className="px-4 py-1 border rounded bg-white">{quantity}</span>
              <button
                onClick={() => handleQuantityChange(quantity + 1)}
                className="px-3 py-1 border rounded hover:bg-gray-100"
              >
                +
              </button>
              <span className="text-xs text-gray-500 ml-2">
                (Sin límite)
              </span>
            </div>
          </div>

          {/* Selector de asientos (con tabla de filas y columnas) */}
          {hasSeats && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecciona {quantity} asiento{quantity > 1 ? 's' : ''}
                {selectedSeats.length > 0 && (
                  <span className="ml-2 text-xs text-green-600 font-semibold">
                    ({selectedSeats.length}/{quantity})
                  </span>
                )}
              </label>

              {/* Leyenda de colores */}
              <div className="flex gap-4 mb-3 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-green-100 border border-gray-300 rounded"></div>
                  <span className="text-gray-600">Disponible</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-blue-500 rounded"></div>
                  <span className="text-gray-600">Seleccionado</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 bg-red-500 rounded"></div>
                  <span className="text-gray-600">Ocupado</span>
                </div>
              </div>
              
              <div className="bg-white rounded-lg border p-3 max-h-64 overflow-auto">
                <table className="w-full border-collapse text-xs">
                  <thead className="sticky top-0 bg-blue-500 z-10">
                    <tr>
                      <th className="border border-blue-400 p-2 font-semibold text-white">Fila</th>
                      {[...Array(seatsPerRow)].map((_, idx) => (
                        <th key={idx} className="border border-blue-400 p-2 font-semibold text-white">
                          {idx + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row}>
                        <td className="border p-2 font-bold bg-gray-50 text-center text-gray-700">
                          {row}
                        </td>
                        {[...Array(seatsPerRow)].map((_, seatIdx) => {
                          const seatId = `${row}-${seatIdx + 1}`;
                          const isSelectedSeat = selectedSeats.includes(seatId);
                          const isOccupied = occupiedSeats.has(seatId);
                          const canSelectSeat = !isOccupied && (selectedSeats.length < quantity || isSelectedSeat);
                          
                          return (
                            <td key={seatId} className="border p-1">
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
                                    ? 'bg-blue-500 text-white scale-105 shadow-md' 
                                    : canSelectSeat
                                    ? 'bg-green-100 hover:bg-green-200 text-gray-700 hover:scale-105'
                                    : 'bg-gray-50 text-gray-400 cursor-not-allowed'
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
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                  <span className="font-semibold text-blue-900">Asientos seleccionados:</span>
                  <span className="ml-2 text-blue-700">{selectedSeats.join(', ')}</span>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleAddToCart}
            disabled={!canConfirm}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed hover:scale-105 transform shadow-md hover:shadow-lg"
          >
            {isInCart ? 'Actualizar Selección' : 'Agregar al Carrito'}
          </button>
          
          {!canConfirm && hasSeats && (
            <p className="text-xs text-orange-600 text-center font-medium">
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
      className={`border rounded-lg p-3 transition-all duration-200 cursor-pointer ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md ring-2 ring-blue-300 scale-105'
          : 'border-gray-300 hover:border-blue-300 hover:shadow-sm hover:scale-102'
      }`}
      onClick={() => onSelect(ticket)}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-1.5 mb-1.5">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
              />
            </svg>
            <h4 className="font-semibold text-sm text-gray-900">Ticket Original</h4>
          </div>
          
          <div className="space-y-0.5 text-xs text-gray-600">
            <p className="flex items-center gap-1">
              <span className="font-medium">Fila:</span> {ticket.row}
              <span className="mx-1">•</span>
              <span className="font-medium">Asiento:</span> {ticket.seat}
            </p>
            {ticket.zone && (
              <p>
                <span className="font-medium">Zona:</span> {ticket.zone}
              </p>
            )}
          </div>
        </div>

        {isSelected && (
          <div className="flex-shrink-0">
            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        )}
      </div>

      <button
        className={`w-full py-1.5 px-3 rounded-lg font-medium text-sm transition-colors ${
          isSelected
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        {isSelected ? 'Seleccionado ✓' : 'Seleccionar'}
      </button>
    </div>
  );
}
