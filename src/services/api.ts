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

// ---- Response: SOLO 401 redirige a login. 403 NO redirige ni borra token.
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err?.response?.status as number | undefined;
    const url = String(err?.config?.url || "");
    const hadToken = !!localStorage.getItem("token");

    const isAuthEndpoint = /\/auth\/(login|register|forgot-password|reset-password)/.test(url);
    const isLoginPage =
      typeof window !== "undefined" && window.location.pathname.startsWith("/login");

    // 401 -> sesión inválida/expirada: limpiar y enviar a login
    if (status === 401 && hadToken && !isAuthEndpoint) {
      // Derivar razón
      const msg: string =
        err?.response?.data?.error || err?.response?.data?.message || "";
      const reason = msg.toLowerCase().includes("desactivada")
        ? "deactivated"
        : "session_expired";

      // Limpiar sesión local
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Avisar al resto de la app (opcional)
      try {
        window.dispatchEvent(new CustomEvent("auth:logout", { detail: { reason } }));
      } catch {}

      if (typeof window !== "undefined" && !isLoginPage) {
        const qs = new URLSearchParams({ reason }).toString();
        window.location.replace(`/login?${qs}`);
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
      } catch {}
    }

    return Promise.reject(err);
  }
);

export default api;







