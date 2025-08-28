// src/services/authService.ts
import api from "./api";

export interface RegisterPayload {
  name: string;
  email: string;
  rut: string;            // 👈 nuevo: RUT obligatorio
  password: string;
  role?: "buyer";         // igual lo forzamos abajo
}

export async function registerUser(payload: RegisterPayload) {
  const { name, email, rut, password } = payload;

  const { data } = await api.post("/auth/register", {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    rut: rut.trim(),      // lo puede normalizar/validar el backend
    password,
    role: "buyer",
  });
  // data: { message, token, user }
  return data;
}

// 👇 ahora acepta RUT o email en el primer parámetro
export async function loginUser(rutOrEmail: string, password: string) {
  const { data } = await api.post("/auth/login", { rutOrEmail, password });
  // data: { token, user }
  return data;
}

export async function fetchMe() {
  const { data } = await api.get("/auth/me");
  return data;
}

/* ========= Cambio de contraseña desde sesión ========= */
export async function changePassword(currentPassword: string, newPassword: string) {
  const { data } = await api.post("/auth/change-password", { currentPassword, newPassword });
  // data: { message }
  return data;
}

/* ========= Eliminar mi cuenta (borrado suave) ========= */
export async function deleteAccount(password: string) {
  const { data } = await api.post("/auth/delete-account", { password });
  // data: { message }
  return data;
}

/* ========= Cerrar sesión en todos los dispositivos ========= */
export async function logoutAll() {
  const { data } = await api.post("/auth/logout-all");
  // data: { message }
  return data;
}

/* ========= Cambiar correo ========= */
export async function changeEmail(password: string, newEmail: string) {
  const { data } = await api.post("/auth/change-email", { password, newEmail });
  // data: { message, email }
  return data;
}





