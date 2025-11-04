// src/utils/downloadProtectedFile.ts
import axios from 'axios';

/**
 * Descarga un archivo protegido usando el token de autenticación
 * @param url - URL del archivo (ej: "/api/documents/claims/filename.pdf")
 * @param filename - Nombre con el que se guardará el archivo
 */
export async function downloadProtectedFile(url: string, filename?: string): Promise<void> {
  try {
    const token = localStorage.getItem('token');
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
    
    // Construir URL completa
    const fullUrl = url.startsWith('http') ? url : `${apiUrl}${url}`;

    // Hacer request con autenticación
    const response = await axios.get(fullUrl, {
      responseType: 'blob',
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
      },
    });

    // Extraer nombre del archivo de la URL si no se proporciona
    const downloadFilename = filename || url.split('/').pop() || 'archivo';

    // Crear un blob URL temporal
    const blobUrl = window.URL.createObjectURL(response.data);

    // Crear un enlace temporal y hacer click automáticamente
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = downloadFilename;
    document.body.appendChild(link);
    link.click();

    // Limpiar
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  } catch (error: unknown) {
    console.error('Error descargando archivo:', error);
    
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        throw new Error('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
      } else if (axiosError.response?.status === 403) {
        throw new Error('No tienes permiso para acceder a este archivo.');
      } else if (axiosError.response?.status === 404) {
        throw new Error('Archivo no encontrado.');
      }
    }
    throw new Error('Error al descargar el archivo. Intenta nuevamente.');
  }
}
