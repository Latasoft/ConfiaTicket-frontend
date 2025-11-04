// src/components/CreateClaimModal.tsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createClaim,
  uploadClaimEvidence,
  type ClaimReason,
  getReasonLabel,
} from '../services/claimsService';

interface CreateClaimModalProps {
  reservationId: number;
  eventTitle: string;
  onClose: () => void;
}

const CLAIM_REASONS: ClaimReason[] = [
  'TICKET_NOT_RECEIVED',
  'TICKET_INVALID',
  'TICKET_DUPLICATED',
  'EVENT_CANCELLED',
  'EVENT_CHANGED',
  'WRONG_SEATS',
  'POOR_QUALITY',
  'OVERCHARGED',
  'OTHER',
];

export default function CreateClaimModal({
  reservationId,
  eventTitle,
  onClose,
}: CreateClaimModalProps) {
  const navigate = useNavigate();
  const [reason, setReason] = useState<ClaimReason>('OTHER');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      setError('Puedes subir máximo 5 archivos');
      return;
    }
    setSelectedFiles(files);
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!description.trim()) {
      setError('La descripción es requerida');
      return;
    }

    if (description.length > 2000) {
      setError('La descripción no puede exceder 2000 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Crear el reclamo
      const claim = await createClaim({
        reservationId,
        reason,
        description: description.trim(),
      });

      // Si hay archivos seleccionados, subirlos como evidencia
      if (selectedFiles.length > 0) {
        await uploadClaimEvidence(claim.id, selectedFiles);
      }

      // Navegar al detalle del reclamo creado
      navigate(`/mis-reclamos/${claim.id}`);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Error al crear el reclamo');
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Crear Reclamo</h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Info del evento */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-medium text-gray-700">Evento:</p>
            <p className="text-lg font-semibold text-gray-900">{eventTitle}</p>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Motivo */}
          <div className="mb-6">
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-2">
              Motivo del reclamo *
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value as ClaimReason)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              {CLAIM_REASONS.map((r) => (
                <option key={r} value={r}>
                  {getReasonLabel(r)}
                </option>
              ))}
            </select>
          </div>

          {/* Descripción */}
          <div className="mb-6">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
              Descripción del problema *
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe detalladamente el problema que tuviste con tu compra..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={6}
              maxLength={2000}
              required
            />
            <p className="text-sm text-gray-500 mt-1">
              {description.length}/2000 caracteres
            </p>
          </div>

          {/* Adjuntar evidencia (opcional) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evidencia (opcional)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition disabled:opacity-50"
            >
              <div className="flex items-center justify-center gap-2">
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
                <span className="text-sm text-gray-600">
                  {selectedFiles.length > 0 
                    ? `${selectedFiles.length} archivo(s) seleccionado(s)` 
                    : 'Adjuntar imágenes o PDF (máx. 5 archivos)'}
                </span>
              </div>
            </button>
            
            {/* Lista de archivos seleccionados */}
            {selectedFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-gray-50 px-3 py-2 rounded">
                    <span className="text-gray-700">📎 {file.name}</span>
                    <span className="text-gray-500">{(file.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-xs text-red-600 hover:text-red-800"
                >
                  Limpiar archivos
                </button>
              </div>
            )}
          </div>

          {/* Nota informativa */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-yellow-800 mb-1">
                  Información importante
                </p>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Los reclamos solo pueden crearse dentro de las 48 horas posteriores a la compra</li>
                  <li>Recibirás una respuesta de nuestro equipo en un plazo de 72 horas</li>
                  <li>Puedes cancelar o reabrir tu reclamo según las condiciones</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creando...' : 'Crear Reclamo'}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition disabled:opacity-50"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
