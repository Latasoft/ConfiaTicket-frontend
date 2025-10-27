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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6 shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 text-center">¿Qué tipo de evento deseas crear?</h2>
        <p className="text-gray-600 text-center mb-6">
          Selecciona una opción para continuar
        </p>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {/* evento propio */}
          <button
            type="button"
            onClick={() => setSelected("own")}
            className={`
              relative p-6 rounded-lg border-2 transition-all duration-200 text-left
              ${
                selected === "own"
                  ? "border-black bg-black/5 shadow-lg"
                  : "border-gray-300 hover:border-gray-400 hover:shadow-md"
              }
            `}
          >
            <div className="flex flex-col items-center text-center">
              <div className="text-5xl mb-3">🎤</div>
              <h3 className="text-lg font-semibold mb-2">Evento Propio</h3>
              <p className="text-sm text-gray-600 mb-3">
                Crea y gestiona tu propio evento desde cero
              </p>
              <div className="bg-green-50 border border-green-200 rounded px-3 py-2 text-xs">
                <span className="font-semibold text-green-800">✓ Capacidad ilimitada</span>
              </div>
            </div>
            {selected === "own" && (
              <div className="absolute top-2 right-2">
                <div className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center">
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
              relative p-6 rounded-lg border-2 transition-all duration-200 text-left
              ${
                selected === "resale"
                  ? "border-black bg-black/5 shadow-lg"
                  : "border-gray-300 hover:border-gray-400 hover:shadow-md"
              }
            `}
          >
            <div className="flex flex-col items-center text-center">
              <div className="text-5xl mb-3">🎫</div>
              <h3 className="text-lg font-semibold mb-2">Reventa de Entradas</h3>
              <p className="text-sm text-gray-600 mb-3">
                Revende entradas que ya compraste de otro evento
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded px-3 py-2 text-xs">
                <span className="font-semibold text-blue-800">Máximo 4 entradas</span>
              </div>
            </div>
            {selected === "resale" && (
              <div className="absolute top-2 right-2">
                <div className="bg-black text-white rounded-full w-6 h-6 flex items-center justify-center">
                  ✓
                </div>
              </div>
            )}
          </button>
        </div>

        {/* informacion adicional */}
        {selected && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="font-semibold text-sm mb-2">
              {selected === "own" ? "Evento Propio - Características:" : "Reventa - Características:"}
            </h4>
            <ul className="text-sm text-gray-700 space-y-1">
              {selected === "own" ? (
                <>
                  <li>• Sin límite de entradas disponibles</li>
                  <li>• Control total sobre el evento</li>
                  <li>• Define tus propios precios</li>
                  <li>• Gestiona los pagos directamente</li>
                </>
              ) : (
                <>
                  <li>• Máximo 4 entradas para revender</li>
                  <li>• Precio limitado a +30% del valor original</li>
                  <li>• Debes subir las entradas físicas/digitales</li>
                  <li>• Requiere aprobación del administrador</li>
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
            className="flex-1 px-4 py-3 rounded-lg bg-black text-white font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/90 transition-colors"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
