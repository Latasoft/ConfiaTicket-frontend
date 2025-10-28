// src/components/OwnEventSectionSelector.tsx
import { useState, useEffect } from 'react';
import type { EventSection } from '../types/ticket';
import { getEventSections } from '../services/ticketService';

interface SectionSelection {
  section: EventSection;
  quantity: number;
  seats: string[];
}

interface Props {
  eventId: number;
  eventPrice: number;
  onSelectionsChange?: (selections: SectionSelection[]) => void;
  selectedSectionId?: number | null; // Deprecated - mantener por compatibilidad
}

export default function OwnEventSectionSelector({
  eventId,
  eventPrice,
  onSelectionsChange,
}: Props) {
  const [sections, setSections] = useState<EventSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSectionId, setExpandedSectionId] = useState<number | null>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [selectedSeats, setSelectedSeats] = useState<Record<number, string[]>>({});
  const [cart, setCart] = useState<SectionSelection[]>([]);

  useEffect(() => {
    loadSections();
  }, [eventId]);

  const loadSections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getEventSections(eventId);
      setSections(data);
      // Inicializar cantidades en 1
      const initialQty: Record<number, number> = {};
      data.forEach((s) => {
        initialQty[s.id] = 1;
      });
      setQuantities(initialQty);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar secciones');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (sectionId: number, delta: number) => {
    setQuantities((prev) => {
      const current = prev[sectionId] || 1;
      const newQty = Math.max(1, Math.min(10, current + delta)); // Min 1, Max 10
      
      // Gestión inteligente de asientos al cambiar cantidad
      if (newQty !== current) {
        setSelectedSeats((prevSeats) => {
          const currentSeats = prevSeats[sectionId] || [];
          
          // Si aumentó la cantidad, mantener los asientos ya seleccionados
          if (newQty > current) {
            return prevSeats; // Mantener selección actual
          }
          
          // Si disminuyó, quitar asientos desde el final (LIFO - Last In First Out)
          if (newQty < current && currentSeats.length > newQty) {
            return {
              ...prevSeats,
              [sectionId]: currentSeats.slice(0, newQty)
            };
          }
          
          return prevSeats;
        });
      }
      
      return { ...prev, [sectionId]: newQty };
    });
  };

  const handleSelectSection = (section: EventSection) => {
    // Cambiar entre secciones libremente
    if (expandedSectionId !== section.id) {
      setExpandedSectionId(section.id);
      
      // Si esta sección ya está en el carrito, cargar sus datos
      const inCart = cart.find(c => c.section.id === section.id);
      if (inCart) {
        setQuantities(prev => ({ ...prev, [section.id]: inCart.quantity }));
        setSelectedSeats(prev => ({ ...prev, [section.id]: inCart.seats }));
      }
    } else {
      // Si es la misma, toggle
      setExpandedSectionId(null);
    }
  };

  const handleAddToCart = (section: EventSection) => {
    const quantity = quantities[section.id] || 1;
    const seats = selectedSeats[section.id] || [];
    
    setCart(prev => {
      // Si ya existe esta sección, actualizar
      const existingIndex = prev.findIndex(s => s.section.id === section.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { section, quantity, seats };
        return updated;
      }
      // Si no existe, agregar
      return [...prev, { section, quantity, seats }];
    });
    
    // Colapsar la sección después de agregar
    setExpandedSectionId(null);
  };

  const handleRemoveFromCart = (sectionId: number) => {
    setCart(prev => prev.filter(s => s.section.id !== sectionId));
    // Resetear selecciones de esa sección
    setSelectedSeats(prev => {
      const updated = { ...prev };
      delete updated[sectionId];
      return updated;
    });
  };

  // Notificar cambios al padre
  const handleConfirmCart = () => {
    if (onSelectionsChange && cart.length > 0) {
      onSelectionsChange(cart);
    }
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
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-medium">Error</p>
        <p className="text-sm">{error}</p>
        <button
          onClick={loadSections}
          className="mt-2 text-sm text-red-600 hover:text-red-700 underline"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (sections.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <p className="text-yellow-800 font-medium">No hay secciones configuradas</p>
        <p className="text-yellow-700 text-sm mt-1">
          El organizador aún no ha definido las zonas del evento
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header simple */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-blue-800 font-medium">🎟️ Selecciona tus Entradas</p>
        <p className="text-blue-700 text-sm mt-1">
          Puedes seleccionar entradas de una o varias secciones. Recibirás un PDF con código QR al completar la compra.
        </p>
      </div>

      {/* Carrito de selecciones */}
      {cart.length > 0 && (
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-green-900 flex items-center gap-2">
              🛒 Tu Carrito ({cart.length} {cart.length === 1 ? 'sección' : 'secciones'})
            </h4>
          </div>
          
          <div className="space-y-2 mb-4">
            {cart.map(({ section, quantity, seats }) => (
              <div key={section.id} className="bg-white rounded-lg p-3 flex items-center justify-between shadow-sm">
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{section.name}</p>
                  <p className="text-sm text-gray-600">
                    {quantity} {quantity === 1 ? 'entrada' : 'entradas'}
                    {seats.length > 0 && ` • Asientos: ${seats.join(', ')}`}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 text-lg">
                    ${(eventPrice * quantity).toLocaleString('es-CL')}
                  </span>
                  <button
                    onClick={() => handleRemoveFromCart(section.id)}
                    className="text-red-600 hover:text-red-800 hover:bg-red-100 p-2 rounded-lg transition"
                    title="Eliminar del carrito"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="border-t-2 border-green-200 pt-3 mb-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-lg font-bold text-green-900">Total general:</span>
              <span className="text-3xl font-bold text-green-900">
                ${cart.reduce((sum, s) => sum + (eventPrice * s.quantity), 0).toLocaleString('es-CL')}
              </span>
            </div>
            <div className="text-xs text-green-700 mb-3">
              Total de entradas: {cart.reduce((sum, s) => sum + s.quantity, 0)}
            </div>
          </div>
          
          <button
            onClick={handleConfirmCart}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold rounded-lg transition shadow-lg hover:shadow-xl transform hover:scale-[1.02] text-lg"
          >
            Continuar con el pago ({cart.length} {cart.length === 1 ? 'sección' : 'secciones'}) →
          </button>
        </div>
      )}

      <div className="space-y-3">
        {sections.map((section) => {
          const quantity = quantities[section.id] || 1;
          const totalPrice = eventPrice * quantity;

          // Generar filas y asientos
          let rows: string[] = [];
          if (section.rowStart && section.rowEnd) {
            // Soporta letras y números
            const isAlpha = /^[A-Z]+$/.test(section.rowStart) && /^[A-Z]+$/.test(section.rowEnd);
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
              const start = letterToNumber(section.rowStart);
              const end = letterToNumber(section.rowEnd);
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
          const seatsPerRow = section.seatsPerRow || 0;

          const selected = selectedSeats[section.id] || [];
          const hasSeats = rows.length > 0 && seatsPerRow > 0;
          const canConfirm = hasSeats ? selected.length === quantity : true;
          const inCart = cart.find(c => c.section.id === section.id);
          const isExpanded = expandedSectionId === section.id;

          return (
            <div
              key={section.id}
              className={`border-2 rounded-lg transition-all bg-white overflow-hidden ${
                inCart
                  ? 'border-green-500 bg-green-50/30' 
                  : isExpanded
                  ? 'border-blue-500 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {/* Header compacto - siempre visible */}
              <div 
                className="p-4 cursor-pointer hover:bg-gray-50 transition"
                onClick={() => handleSelectSection(section)}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-bold text-lg text-gray-900">{section.name}</h3>
                      {inCart && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full flex-shrink-0">
                          ✓ {inCart.quantity} en carrito
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
                      {section.rowStart && section.rowEnd && (
                        <span>📍 Filas {section.rowStart}-{section.rowEnd}</span>
                      )}
                      {section.seatsPerRow && (
                        <span>💺 {section.seatsPerRow} asientos/fila</span>
                      )}
                      <span className="font-medium">Cap: {section.totalCapacity}</span>
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-gray-500">Desde</div>
                    <div className="text-2xl font-bold text-gray-900">
                      ${eventPrice.toLocaleString('es-CL')}
                    </div>
                    <div className="text-xs text-blue-600 mt-1">
                      {isExpanded ? 'Ocultar ▲' : 'Ver detalles ▼'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Panel expandido */}
              {isExpanded && (
                <div className="border-t border-gray-200 p-4 bg-gray-50 space-y-4">
                  {/* Selector de cantidad */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ¿Cuántas entradas?
                    </label>
                    <div className="flex items-center gap-3 bg-white rounded-lg p-3 border">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuantityChange(section.id, -1);
                        }}
                        disabled={quantity <= 1} 
                        className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg font-bold text-xl transition"
                      >
                        −
                      </button>
                      <div className="flex-1 text-center">
                        <div className="text-3xl font-bold text-gray-900">{quantity}</div>
                        <div className="text-xs text-gray-600">{quantity === 1 ? 'entrada' : 'entradas'}</div>
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleQuantityChange(section.id, 1);
                        }}
                        disabled={quantity >= 10} 
                        className="w-10 h-10 flex items-center justify-center bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg font-bold text-xl transition"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Selector de asientos */}
                  {rows.length > 0 && seatsPerRow > 0 && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-semibold text-gray-700">
                          Selecciona {quantity} asiento{quantity !== 1 ? 's' : ''}
                        </label>
                        {selected.length > 0 && (
                          <span className="text-xs font-medium text-green-600">
                            {selected.length}/{quantity}
                          </span>
                        )}
                      </div>
                      
                      <div className="bg-white rounded-lg border p-3 max-h-64 overflow-auto">
                        <table className="w-full border-collapse text-xs">
                          <thead className="sticky top-0 bg-gray-100 z-10">
                            <tr>
                              <th className="border p-2 font-semibold">Fila</th>
                              {[...Array(seatsPerRow)].map((_, idx) => (
                                <th key={idx} className="border p-2 font-semibold">{idx + 1}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                              <tr key={row}>
                                <td className="border p-2 font-bold bg-gray-50 text-center">{row}</td>
                                {[...Array(seatsPerRow)].map((_, seatIdx) => {
                                  const seatId = `${row}-${seatIdx + 1}`;
                                  const isSelectedSeat = selected.includes(seatId);
                                  const canSelect = selected.length < quantity || isSelectedSeat;
                                  
                                  return (
                                    <td key={seatId} className="border p-1">
                                      <button
                                        type="button"
                                        className={`w-full h-8 rounded font-bold transition ${
                                          isSelectedSeat 
                                            ? 'bg-green-500 text-white scale-105' 
                                            : canSelect
                                            ? 'bg-gray-100 hover:bg-green-100 text-gray-700'
                                            : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                                        }`}
                                        disabled={!canSelect}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const seatId = `${row}-${seatIdx + 1}`;
                                          setSelectedSeats((prev) => {
                                            const current = prev[section.id] || [];
                                            if (current.includes(seatId)) {
                                              return { ...prev, [section.id]: current.filter((s) => s !== seatId) };
                                            } else if (current.length < quantity) {
                                              return { ...prev, [section.id]: [...current, seatId] };
                                            }
                                            return prev;
                                          });
                                        }}
                                      >
                                        {isSelectedSeat ? '✓' : seatIdx + 1}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      
                      {selected.length > 0 && (
                        <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                          <span className="font-semibold text-blue-900">Asientos:</span>
                          <span className="ml-2 text-blue-700">{selected.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Resumen y botón */}
                  <div className="bg-white rounded-lg border p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Precio unitario:</span>
                      <span className="font-semibold">${eventPrice.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Cantidad:</span>
                      <span className="font-semibold">{quantity}</span>
                    </div>
                    <div className="border-t pt-3 flex justify-between items-center">
                      <span className="text-lg font-bold">Total:</span>
                      <span className="text-2xl font-bold text-green-600">
                        ${totalPrice.toLocaleString('es-CL')}
                      </span>
                    </div>
                    
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddToCart(section);
                      }}
                      disabled={!canConfirm}
                      className={`w-full py-3 px-4 font-bold rounded-lg transition ${
                        canConfirm
                          ? inCart
                            ? 'bg-blue-600 hover:bg-blue-700 text-white'
                            : 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {inCart ? '✓ Actualizar en carrito' : '🛒 Agregar al carrito'}
                    </button>
                    
                    {!canConfirm && hasSeats && (
                      <p className="text-xs text-orange-600 text-center font-medium">
                        ⚠️ Debes seleccionar exactamente {quantity} asiento{quantity !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
