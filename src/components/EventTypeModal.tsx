// src/components/EventTypeModal.tsx
import { useState } from "react";

export type EventType = "own" | "resale";

interface EventTypeModalProps {
  isOpen: boolean;
  onSelect: (type: EventType) => void;
  onClose: () => void;
}

export default function EventTypeModal({ isOpen, onSelect, onClose }: EventTypeModalProps) {
  const [selected, setSelected] = useState<EventType | null>(null);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-dark-850 border-2 border-dark-700/80 rounded-2xl max-w-2xl w-full p-8 shadow-2xl shadow-neon-cyan/30 animate-slide-up">
        <h2 className="text-3xl font-display font-bold text-center mb-3 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">
          ¿Qué tipo de evento deseas crear?
        </h2>
        <p className="text-dark-200 text-center mb-8 text-lg">
          Selecciona una opción para continuar
        </p>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* evento propio */}
          <button
            type="button"
            onClick={() => setSelected("own")}
            className={`
              relative p-8 rounded-2xl border-2 transition-all duration-300 text-left transform hover:scale-105
              ${
                selected === "own"
                  ? "border-neon-cyan bg-neon-cyan/20 shadow-glow-cyan shadow-xl"
                  : "border-dark-600 hover:border-neon-cyan/60 hover:shadow-lg bg-dark-800/50"
              }
            `}
          >
            <div className="flex flex-col items-center text-center">
              <div className="text-6xl mb-4">🎤</div>
              <h3 className="text-xl font-bold mb-3 text-white">Evento Propio</h3>
              <p className="text-sm text-dark-200 mb-4 leading-relaxed">
                Crea y gestiona tu propio evento desde cero
              </p>
              <div className="bg-neon-green/10 border border-neon-green/40 rounded-lg px-4 py-2 text-sm">
                <span className="font-semibold text-neon-green">✓ Capacidad ilimitada</span>
              </div>
            </div>
            {selected === "own" && (
              <div className="absolute top-3 right-3">
                <div className="bg-neon-cyan text-dark-900 rounded-full w-8 h-8 flex items-center justify-center shadow-glow-cyan font-bold text-lg">
                  ✓
                </div>
              </div>
            )}
          </button>

          {/* reventa */}
          <button
            type="button"
            onClick={() => setSelected("resale")}
            className={`
              relative p-8 rounded-2xl border-2 transition-all duration-300 text-left transform hover:scale-105
              ${
                selected === "resale"
                  ? "border-neon-purple bg-neon-purple/20 shadow-glow-purple shadow-xl"
                  : "border-dark-600 hover:border-neon-purple/60 hover:shadow-lg bg-dark-800/50"
              }
            `}
          >
            <div className="flex flex-col items-center text-center">
              <div className="text-6xl mb-4">🎫</div>
              <h3 className="text-xl font-bold mb-3 text-white">Reventa de Tickets</h3>
              <p className="text-sm text-dark-200 mb-4 leading-relaxed">
                Vende tickets físicos que ya posees
              </p>
              <div className="bg-neon-purple/10 border border-neon-purple/40 rounded-lg px-4 py-2 text-sm">
                <span className="font-semibold text-neon-purple">✓ Hasta 4 tickets</span>
              </div>
            </div>
            {selected === "resale" && (
              <div className="absolute top-3 right-3">
                <div className="bg-neon-purple text-dark-900 rounded-full w-8 h-8 flex items-center justify-center shadow-glow-purple font-bold text-lg">
                  ✓
                </div>
              </div>
            )}
          </button>
        </div>

        {/* informacion adicional */}
        {selected && (
          <div className="mb-8 p-5 bg-dark-800/70 border border-dark-600 rounded-xl animate-fade-in">
            <h4 className="font-bold text-base mb-3 text-white">
              {selected === "own" ? "Evento Propio - Características:" : "Reventa - Características:"}
            </h4>
            <ul className="text-sm text-dark-100 space-y-2">
              {selected === "own" ? (
                <>
                  <li className="flex items-center gap-3">
                    <span className="text-neon-green text-xl">•</span> 
                    <span>Sin límite de entradas disponibles</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-neon-green text-xl">•</span> 
                    <span>Control total sobre el evento</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-neon-green text-xl">•</span> 
                    <span>Define tus propios precios</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-neon-green text-xl">•</span> 
                    <span>Gestiona los pagos directamente</span>
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-3">
                    <span className="text-neon-purple text-xl">•</span> 
                    <span>Máximo 4 entradas para revender</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-neon-purple text-xl">•</span> 
                    <span>Precio limitado a +30% del valor original</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-neon-purple text-xl">•</span> 
                    <span>Debes subir las entradas físicas/digitales</span>
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="text-neon-purple text-xl">•</span> 
                    <span>Requiere aprobación del administrador</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        )}

        <div className="flex gap-4 justify-end pt-6 border-t border-dark-700">
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost px-8 py-3 text-base"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="btn-primary px-8 py-3 text-base disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
}
