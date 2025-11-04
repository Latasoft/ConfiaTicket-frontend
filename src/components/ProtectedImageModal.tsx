// src/components/ProtectedImageModal.tsx
import { useState, useEffect } from "react";
import axios from "axios";

interface ProtectedImageModalProps {
  imageUrl: string;  // URL completa del endpoint: "/api/admin/documents/filename.jpg"
  imageUrl2?: string;  // Segunda imagen opcional (ej: reverso de cédula)
  buttonText?: string;
  buttonClassName?: string;
  title?: string;
  label1?: string;  // Label para la primera imagen
  label2?: string;  // Label para la segunda imagen
}

/**
 * Botón que abre un modal mostrando una o dos imágenes protegidas.
 * Carga las imágenes con autenticación JWT y las muestra en un modal.
 */
export default function ProtectedImageModal({
  imageUrl,
  imageUrl2,
  buttonText = "Ver documento",
  buttonClassName = "inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors",
  title = "Documento de identidad",
  label1 = "Documento",
  label2 = "Reverso",
}: ProtectedImageModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [blobUrl2, setBlobUrl2] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Cargar imágenes cuando se abre el modal
  useEffect(() => {
    if (!isOpen) return;

    let objectUrl: string | null = null;
    let objectUrl2: string | null = null;

    async function loadImages() {
      try {
        setLoading(true);
        setError(false);

        const token = localStorage.getItem("token");
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
        
        // Cargar primera imagen
        const fullUrl = `${apiUrl}${imageUrl}`;
        const response = await axios.get(fullUrl, {
          responseType: "blob",
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });
        objectUrl = URL.createObjectURL(response.data);
        setBlobUrl(objectUrl);

        // Cargar segunda imagen si existe
        if (imageUrl2) {
          const fullUrl2 = `${apiUrl}${imageUrl2}`;
          const response2 = await axios.get(fullUrl2, {
            responseType: "blob",
            headers: {
              Authorization: token ? `Bearer ${token}` : "",
            },
          });
          objectUrl2 = URL.createObjectURL(response2.data);
          setBlobUrl2(objectUrl2);
        }
      } catch (err) {
        console.error("Error al cargar imágenes protegidas:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    loadImages();

    // Cleanup: liberar memoria cuando se cierre el modal
    return () => {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      if (objectUrl2) {
        URL.revokeObjectURL(objectUrl2);
      }
    };
  }, [isOpen, imageUrl, imageUrl2]);

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
            <div className="p-4 flex flex-col gap-4 min-h-[300px]">
              {loading && (
                <div className="text-center flex-1 flex items-center justify-center">
                  <div>
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Cargando {imageUrl2 ? 'imágenes' : 'imagen'}...</p>
                  </div>
                </div>
              )}

              {error && (
                <div className="text-center text-red-600 flex-1 flex items-center justify-center">
                  <div>
                    <p>No se pudo cargar {imageUrl2 ? 'las imágenes' : 'la imagen'}</p>
                    <p className="text-sm text-gray-500 mt-2">Verifica tu conexión o permisos</p>
                  </div>
                </div>
              )}

              {!loading && !error && blobUrl && (
                <>
                  {/* Primera imagen */}
                  <div className="flex flex-col items-center">
                    {imageUrl2 && (
                      <p className="text-sm font-medium text-gray-700 mb-2">🪪 {label1}</p>
                    )}
                    <img
                      src={blobUrl}
                      alt={label1}
                      className="max-w-full h-auto rounded border shadow-sm"
                    />
                  </div>

                  {/* Segunda imagen si existe */}
                  {imageUrl2 && blobUrl2 && (
                    <div className="flex flex-col items-center pt-4 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-2">🪪 {label2}</p>
                      <img
                        src={blobUrl2}
                        alt={label2}
                        className="max-w-full h-auto rounded border shadow-sm"
                      />
                    </div>
                  )}
                </>
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
