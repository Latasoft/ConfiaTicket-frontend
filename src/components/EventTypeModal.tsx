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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="glass-panel border border-dark-700 rounded-xl max-w-2xl w-full p-6 shadow-2xl shadow-neon-cyan/20 animate-slide-up">
        <h2 className="text-3xl font-display font-bold text-center mb-2 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">
          ¿Qué tipo de evento deseas crear?
        </h2>
        <p className="text-dark-300 text-center mb-6">
          Selecciona una opción para continuar
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* evento propio */}
          <button
            type="button"
            onClick={() => setSelected("own")}
            className={`
              relative p-6 rounded-xl border-2 transition-all duration-200 text-left
              ${
                selected === "own"
                  ? "border-neon-cyan bg-neon-cyan/10 shadow-glow-cyan"
                  : "border-dark-700 hover:border-neon-cyan/50 hover:shadow-md glass-panel"
              }
            `}
          >
            <div className="flex flex-col items-center text-center">
              <div className="text-5xl mb-3">🎤</div>
              <h3 className="text-lg font-semibold mb-2 text-dark-50">Evento Propio</h3>
              <p className="text-sm text-dark-400 mb-3">
                Crea y gestiona tu propio evento desde cero
              </p>
              <div className="glass-panel-accent border border-neon-green/30 rounded-lg px-3 py-2 text-xs">
                <span className="font-semibold text-neon-green">✓ Capacidad ilimitada</span>
              </div>
            </div>
            {selected === "own" && (
              <div className="absolute top-2 right-2">
                <div className="bg-neon-cyan text-dark-900 rounded-full w-6 h-6 flex items-center justify-center shadow-glow-cyan font-bold">
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
              relative p-6 rounded-xl border-2 transition-all duration-200 text-left
              ${
                selected === "resale"
                  ? "border-neon-purple bg-neon-purple/10 shadow-glow-purple"
                  : "border-dark-700 hover:border-neon-purple/50 hover:shadow-md glass-panel"
              }
            `}
          >
            <div className="flex flex-col items-center text-center">
              <div className="text-5xl mb-3">🎫</div>
              <h3 className="text-lg font-semibold mb-2 text-dark-50">Reventa de Entradas</h3>
              <p className="text-sm text-dark-400 mb-3">
                Revende entradas que ya compraste de otro evento
              </p>
              <div className="glass-panel-accent border border-neon-purple/30 rounded-lg px-3 py-2 text-xs">
                <span className="font-semibold text-neon-purple">Máximo 4 entradas</span>
              </div>
            </div>
            {selected === "resale" && (
              <div className="absolute top-2 right-2">
                <div className="bg-neon-purple text-white rounded-full w-6 h-6 flex items-center justify-center shadow-glow-purple font-bold">
                  ✓
                </div>
              </div>
            )}
          </button>
        </div>

        {/* informacion adicional */}
        {selected && (
          <div className="mb-6 p-4 glass-panel border border-dark-700 rounded-lg animate-fade-in">
            <h4 className="font-semibold text-sm mb-2 text-dark-50">
              {selected === "own" ? "Evento Propio - Características:" : "Reventa - Características:"}
            </h4>
            <ul className="text-sm text-dark-300 space-y-1">
              {selected === "own" ? (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-neon-green">•</span> Sin límite de entradas disponibles
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-neon-green">•</span> Control total sobre el evento
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-neon-green">•</span> Define tus propios precios
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-neon-green">•</span> Gestiona los pagos directamente
                  </li>
                </>
              ) : (
                <>
                  <li className="flex items-center gap-2">
                    <span className="text-neon-purple">•</span> Máximo 4 entradas para revender
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-neon-purple">•</span> Precio limitado a +30% del valor original
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-neon-purple">•</span> Debes subir las entradas físicas/digitales
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-neon-purple">•</span> Requiere aprobación del administrador
                  </li>
                </>
              )}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!selected}
            className="flex-1 btn-primary px-4 py-3 rounded-lg font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="btn-ghost px-4 py-3 rounded-lg transition-all"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
