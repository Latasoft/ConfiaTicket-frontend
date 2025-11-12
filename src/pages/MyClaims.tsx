// src/pages/MyClaims.tsx
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getMyClaims,
  type Claim,
  getStatusLabel,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
  getReasonLabel,
} from '../services/claimsService';

export default function MyClaims() {
  const navigate = useNavigate();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadClaims();
  }, []);

  async function loadClaims() {
    try {
      setLoading(true);
      const data = await getMyClaims();
      setClaims(data);
    } catch (err) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Error al cargar reclamos');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Cargando reclamos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Mis Reclamos
        </h1>
        <p className="text-gray-600">
          Gestiona tus reclamos y consultas sobre tus compras
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Botón para ir a Mis Entradas */}
      <div className="mb-6">
        <Link
          to="/mis-entradas"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          ← Ver Mis Entradas
        </Link>
      </div>

      {/* Lista de reclamos */}
      {claims.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-lg font-medium text-gray-900">
            No tienes reclamos
          </h3>
          <p className="mt-1 text-gray-500">
            Si tienes algún problema con tu compra, puedes crear un reclamo desde "Mis Entradas"
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <div
              key={claim.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition cursor-pointer"
              onClick={() => navigate(`/mis-reclamos/${claim.id}`)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {/* Evento y fecha */}
                  <div className="mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {claim.reservation?.event.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {new Date(claim.reservation?.event.date || '').toLocaleDateString('es-CL', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  </div>

                  {/* Motivo */}
                  <div className="mb-3">
                    <span className="text-sm font-medium text-gray-700">
                      Motivo:
                    </span>{' '}
                    <span className="text-sm text-gray-900">
                      {getReasonLabel(claim.reason)}
                    </span>
                  </div>

                  {/* Descripción resumida */}
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {claim.description}
                  </p>

                  {/* Fecha de creación */}
                  <p className="text-xs text-gray-400 mt-2">
                    Creado el {new Date(claim.createdAt).toLocaleDateString('es-CL')} a las{' '}
                    {new Date(claim.createdAt).toLocaleTimeString('es-CL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Badges de estado y prioridad */}
                <div className="ml-4 flex flex-col gap-2 items-end">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      claim.status
                    )}`}
                  >
                    {getStatusLabel(claim.status)}
                  </span>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(
                      claim.priority
                    )}`}
                  >
                    {getPriorityLabel(claim.priority)}
                  </span>
                </div>
              </div>

              {/* Respuesta del admin (si existe) */}
              {claim.adminResponse && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Respuesta del equipo:
                  </p>
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {claim.adminResponse}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
