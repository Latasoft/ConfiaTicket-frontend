// src/components/ProtectedImageModal.tsx
import { useState, useEffect } from "react";
import axios from "axios";

interface ProtectedImageModalProps {
  imageUrl: string;  // URL completa del endpoint: "/api/admin/documents/filename.jpg"
  buttonText?: string;
  buttonClassName?: string;
  title?: string;
}

/**
 * Botón que abre un modal mostrando una imagen protegida.
 * Carga la imagen con autenticación JWT y la muestra en un modal.
 */
export default function ProtectedImageModal({
  imageUrl,
  buttonText = "Ver documento",
  buttonClassName = "inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors",
  title = "Documento de identidad",
}: ProtectedImageModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Cargar imagen cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    let objectUrl: string | null = null;

    async function loadImage() {
      try {
        setLoading(true);
        setError(false);

        const token = localStorage.getItem("token");
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
        const fullUrl = `${apiUrl}${imageUrl}`;

        const response = await axios.get(fullUrl, {
          responseType: "blob",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        objectUrl = URL.createObjectURL(response.data);
        setBlobUrl(objectUrl);
      } catch (err) {
        console.error("Error al cargar imagen protegida:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadImage();

    // Cleanup: liberar memoria cuando se cierre el modal
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [isOpen, imageUrl]);

  return (
    <>
      {/* Botón para abrir el modal */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={buttonClassName}
      >
        {buttonText}
      </button>

      {/* Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">{title}</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            {/* Contenido */}
            <div className="p-4 flex justify-center items-center min-h-[300px]">
              {loading && (
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Cargando imagen...</p>
                </div>
              )}

              {error && (
                <div className="text-center text-red-600">
                  <p>No se pudo cargar la imagen</p>
                  <p className="text-sm text-gray-500 mt-2">Verifica tu conexión o permisos</p>
                </div>
              )}

              {!loading && !error && blobUrl && (
                <img
                  src={blobUrl}
                  alt={title}
                  className="max-w-full h-auto rounded"
                />
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end p-4 border-t">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
