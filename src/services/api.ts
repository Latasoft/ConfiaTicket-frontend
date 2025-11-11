// src/services/api.ts
import axios from "axios";

// Base URL: usa VITE_API_URL si está definida; si no, cae a "/api"
const rawBase = import.meta.env.VITE_API_URL || "/api";
const baseURL = rawBase.replace(/\/+$/, "") + "/api"; // agrega /api al final

const api = axios.create({
  baseURL,
  timeout: 15000,
  headers: {
    Accept: "application/json",
  },
});

// ---- Request: adjunta token si existe
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers ?? {};
    if (!config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// ---- Response: Auto-refresh en 401, luego retry. Si falla, redirige a login.
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve();
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;
    const status = err?.response?.status as number | undefined;
    const url = String(originalRequest?.url || "");
    const hadToken = !!localStorage.getItem("token");

    const isAuthEndpoint = /\/auth\/(login|register|forgot-password|reset-password)/.test(url);
    const isRefreshEndpoint = url.includes("/auth/refresh");
    const isLoginPage =
      typeof window !== "undefined" && window.location.pathname.startsWith("/login");

    // 401 -> intentar renovar token automáticamente
    if (status === 401 && hadToken && !isAuthEndpoint && !originalRequest._retry) {
      // Si es el endpoint de refresh el que falló, no intentar de nuevo
      if (isRefreshEndpoint) {
        // El refresh falló, limpiar y redirigir
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        try {
          window.dispatchEvent(
            new CustomEvent("auth:logout", { detail: { reason: "session_expired" } })
          );
        } catch {
          // ignore
        }
        if (!isLoginPage) {
          window.location.replace("/login?reason=session_expired");
        }
        return Promise.reject(err);
      }

      // Si ya hay un refresh en progreso, esperar
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // Reintentar la request original con el nuevo token
            return api(originalRequest);
          })
          .catch((error) => {
            return Promise.reject(error);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        // Intentar renovar el token
        const { data } = await api.post("/auth/refresh");
        const newToken = data.token;

        if (newToken) {
          // Guardar nuevo token
          localStorage.setItem("token", newToken);
          
          // Actualizar header de la request original
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${newToken}`;

          // Procesar cola de requests pendientes
          processQueue(null);

          // Reintentar request original
          return api(originalRequest);
        } else {
          throw new Error("No token returned from refresh");
        }
      } catch (refreshError) {
        // Refresh falló, limpiar sesión y redirigir
        processQueue(refreshError);
        localStorage.removeItem("token");
        localStorage.removeItem("user");

        const msg: string =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (refreshError as any)?.response?.data?.error ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (refreshError as any)?.response?.data?.message ||
          "";
        const reason = msg.toLowerCase().includes("desactivada")
          ? "deactivated"
          : "session_expired";

        try {
          window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason } }));
        } catch {
          // ignore
        }

        if (!isLoginPage) {
          const qs = new URLSearchParams({ reason }).toString();
          window.location.replace(`/login?${qs}`);
        }

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // 403 -> Prohibido: NO redirigir ni borrar token.
    // Deja que cada pantalla maneje el mensaje (ej. “No puedes comprar tu propio evento”).
    // Opcional: emite un evento para toasts globales
    if (status === 403) {
      try {
        window.dispatchEvent(
          new CustomEvent("auth:forbidden", {
            detail: { url, payload: err?.response?.data },
          })
        );
      } catch {
        // ignore
      }
    }

    return Promise.reject(err);
  }
);

export default api;







