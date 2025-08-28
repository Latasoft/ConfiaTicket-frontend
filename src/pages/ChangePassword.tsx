// src/pages/ChangePassword.tsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { changePassword, logoutAll, deleteAccount, changeEmail } from "@/services/authService";
import { useAuth } from "@/context/AuthContext";
import zxcvbn from "zxcvbn";

const MIN_LEN = 8;   // longitud mínima
const MIN_SCORE = 3; // 0..4 (exigir 3 = "Fuerte")

function scoreMeta(score: number) {
  switch (score) {
    case 0:
      return { label: "Muy débil", bar: "bg-red-500", text: "text-red-600", width: "w-0" };
    case 1:
      return { label: "Débil", bar: "bg-orange-500", text: "text-orange-600", width: "w-1/4" };
    case 2:
      return { label: "Aceptable", bar: "bg-yellow-500", text: "text-yellow-600", width: "w-2/4" };
    case 3:
      return { label: "Fuerte", bar: "bg-lime-600", text: "text-lime-700", width: "w-3/4" };
    case 4:
    default:
      return { label: "Muy fuerte", bar: "bg-green-600", text: "text-green-700", width: "w-full" };
  }
}

export default function ChangePassword() {
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  // ====================== Cambiar correo ======================
  const [newEmail, setNewEmail] = useState("");
  const [newEmailConfirm, setNewEmailConfirm] = useState("");
  const [emailPassword, setEmailPassword] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailDone, setEmailDone] = useState<string | null>(null);

  async function onChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (emailLoading) return;
    setEmailError(null);
    setEmailDone(null);

    const norm = newEmail.trim().toLowerCase();
    const norm2 = newEmailConfirm.trim().toLowerCase();

    if (!norm || !norm2 || !emailPassword) {
      setEmailError("Completa todos los campos.");
      return;
    }
    if (norm !== norm2) {
      setEmailError("Los correos no coinciden.");
      return;
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(norm);
    if (!emailOk) {
      setEmailError("Formato de email inválido.");
      return;
    }

    setEmailLoading(true);
    try {
      const { message, email } = await changeEmail(emailPassword, norm);
      try {
        const raw = localStorage.getItem("user");
        if (raw) {
          const parsed = JSON.parse(raw);
          localStorage.setItem("user", JSON.stringify({ ...parsed, email }));
          window.dispatchEvent(new CustomEvent("auth:user-updated", { detail: { email } }));
        }
      } catch { /* no-op */ }

      setEmailDone(message || "Correo actualizado correctamente.");
      setNewEmail("");
      setNewEmailConfirm("");
      setEmailPassword("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo actualizar el correo";
      setEmailError(msg);
    } finally {
      setEmailLoading(false);
    }
  }

  // ====================== Cambiar contraseña ======================
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwDone, setPwDone] = useState(false);

  // Análisis con zxcvbn (penaliza si se parece a email/nombre)
  const pwdAnalysis = useMemo(() => {
    const userInputs: string[] = [];
    if (user?.email) userInputs.push(user.email);
    if (user?.name) userInputs.push(user.name);
    return zxcvbn(newPassword, userInputs);
  }, [newPassword, user?.email, user?.name]);

  // Filtra sugerencias de zxcvbn que contradicen la política mínima
  const BLOCKED_SUGGESTIONS = [
    /no need for symbols, digits, or uppercase letters/i,
    /no se necesitan símbolos, dígitos ni letras mayúsculas/i,
  ];
  const safeSuggestions = (pwdAnalysis.feedback.suggestions || []).filter(
    (s) => !BLOCKED_SUGGESTIONS.some((re) => re.test(s))
  );
  const safeWarning =
    !!pwdAnalysis.feedback.warning &&
    !BLOCKED_SUGGESTIONS.some((re) => re.test(pwdAnalysis.feedback.warning || ""));

  const pwdScore = pwdAnalysis.score; // 0..4
  const meta = scoreMeta(pwdScore);

  // Reglas mínimas (coinciden con backend)
  const hasLower = /[a-z]/.test(newPassword);
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasDigit = /\d/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const categoriesCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;

  const tooShort = newPassword.length > 0 && newPassword.length < MIN_LEN;
  const categoriesInvalid = newPassword.length >= MIN_LEN && categoriesCount < 3;
  const emailLocal = (user?.email?.split("@")[0] || "").toLowerCase();
  const includesEmailLocal =
    emailLocal.length >= 3 && newPassword.toLowerCase().includes(emailLocal);
  const nameTokens = (user?.name || "")
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length >= 3);
  const includesNameToken = nameTokens.some((t) => newPassword.toLowerCase().includes(t));
  const tooWeak = newPassword.length >= MIN_LEN && pwdScore < MIN_SCORE;

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwLoading) return;
    setPwError(null);

    if (!currentPassword || !newPassword) {
      setPwError("Completa todos los campos.");
      return;
    }
    if (newPassword === currentPassword) {
      setPwError("La nueva contraseña no puede ser igual a la actual.");
      return;
    }
    if (newPassword !== confirm) {
      setPwError("Las contraseñas no coinciden.");
      return;
    }
    if (newPassword.length < MIN_LEN) {
      setPwError(`La nueva contraseña debe tener al menos ${MIN_LEN} caracteres.`);
      return;
    }
    if (categoriesCount < 3) {
      setPwError("Incluye al menos 3 de: minúsculas, mayúsculas, números y símbolos.");
      return;
    }
    if (includesEmailLocal) {
      setPwError("La contraseña no debe contener tu email.");
      return;
    }
    if (includesNameToken) {
      setPwError("La contraseña no debe contener tu nombre.");
      return;
    }
    if (pwdScore < MIN_SCORE) {
      setPwError("La contraseña es demasiado débil. Aumenta su complejidad.");
      return;
    }

    setPwLoading(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPwDone(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo cambiar la contraseña";
      setPwError(msg);
    } finally {
      setPwLoading(false);
    }
  }

  // ====================== Logout en todos los dispositivos ======================
  const [loAllLoading, setLoAllLoading] = useState(false);
  const [loAllMsg, setLoAllMsg] = useState<string | null>(null);
  const [loAllErr, setLoAllErr] = useState<string | null>(null);

  async function onLogoutAll() {
    if (loAllLoading) return;
    setLoAllErr(null);
    setLoAllMsg(null);
    setLoAllLoading(true);
    try {
      const { message } = await logoutAll();
      setLoAllMsg(message || "Sesiones cerradas en todos los dispositivos.");
      await logout();
      navigate("/login", { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo cerrar sesión en todos los dispositivos";
      setLoAllErr(msg);
    } finally {
      setLoAllLoading(false);
    }
  }

  // ====================== Eliminar cuenta ======================
  const [delPassword, setDelPassword] = useState("");
  const [delLoading, setDelLoading] = useState(false);
  const [delError, setDelError] = useState<string | null>(null);

  async function onDeleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (delLoading) return;
    setDelError(null);

    if (!delPassword) {
      setDelError("Ingresa tu contraseña para confirmar.");
      return;
    }
    const ok = window.confirm(
      "¿Seguro que deseas desactivar tu cuenta? Podrás contactar a un administrador para reactivarla."
    );
    if (!ok) return;

    setDelLoading(true);
    try {
      await deleteAccount(delPassword);
      await logout();
      navigate("/", { replace: true });
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo desactivar la cuenta";
      setDelError(msg);
    } finally {
      setDelLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-10">
      {/* ===================== Cambiar correo ===================== */}
      <section className="rounded-lg border p-5">
        <h2 className="text-lg font-medium mb-2">Cambiar correo</h2>
        <p className="text-sm text-gray-600 mb-4">
          Para tu seguridad, necesitamos tu contraseña actual para confirmar el cambio.
        </p>

        {emailError && (
          <div className="rounded-md border p-3 bg-red-50 text-red-700 mb-4">{emailError}</div>
        )}
        {emailDone && (
          <div className="rounded-md border p-3 bg-green-50 text-green-800 mb-4">{emailDone}</div>
        )}

        <form onSubmit={onChangeEmail} className="space-y-3 max-w-md">
          <div>
            <label className="block text-sm font-medium mb-1">Nuevo correo</label>
            <input
              type="email"
              className="w-full border rounded-md px-3 py-2 outline-none focus:ring focus:ring-blue-200"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Confirmar nuevo correo</label>
            <input
              type="email"
              className="w-full border rounded-md px-3 py-2 outline-none focus:ring focus:ring-blue-200"
              value={newEmailConfirm}
              onChange={(e) => setNewEmailConfirm(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Tu contraseña actual</label>
            <input
              type="password"
              className="w-full border rounded-md px-3 py-2 outline-none focus:ring focus:ring-blue-200"
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={emailLoading}
            className="rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            {emailLoading ? "Guardando..." : "Actualizar correo"}
          </button>
        </form>
      </section>

      {/* ===================== Cambiar contraseña ===================== */}
      <section>
        <div className="rounded-lg border p-5">
          <h2 className="text-lg font-medium mb-4">Cambiar contraseña</h2>

          {pwDone ? (
            <div className="rounded-md border p-3 bg-green-50 text-green-800 mb-4">
              ¡Listo! Tu contraseña se actualizó correctamente.
            </div>
          ) : null}

          {pwError && (
            <div className="rounded-md border p-3 bg-red-50 text-red-700 mb-4">
              {pwError}
            </div>
          )}

          <form onSubmit={onSubmitPassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium mb-1">
                Contraseña actual
              </label>
              <input
                type="password"
                className="w-full border rounded-md px-3 py-2 outline-none focus:ring focus:ring-blue-200"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Nueva contraseña
              </label>
              <input
                type="password"
                className="w-full border rounded-md px-3 py-2 outline-none focus:ring focus:ring-blue-200"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />

              {/* Medidor */}
              <div className="mt-2">
                <div className="h-2 w-full bg-gray-200 rounded">
                  <div
                    className={`h-2 ${meta.bar} rounded transition-all duration-300 ${meta.width}`}
                  />
                </div>
                <div className={`mt-1 text-xs ${meta.text}`}>
                  Fortaleza: {meta.label}
                  {tooShort ? (
                    <span className="ml-2 text-gray-600">
                      (mínimo {MIN_LEN} caracteres)
                    </span>
                  ) : null}
                </div>

                {/* Reglas mínimas (coinciden con backend) */}
                <ul className="mt-1 text-xs text-gray-600 list-disc list-inside space-y-0.5">
                  <li>Mínimo {MIN_LEN} caracteres.</li>
                  <li>Incluye al menos 3 de: minúsculas, mayúsculas, números y símbolos.</li>
                  <li>No incluyas tu nombre ni tu email.</li>
                </ul>

                {/* Sugerencias de zxcvbn (filtradas) */}
                {safeWarning ? (
                  <div className="mt-1 text-xs text-gray-600">
                    {pwdAnalysis.feedback.warning}
                  </div>
                ) : null}
                {safeSuggestions.length ? (
                  <ul className="mt-1 text-xs text-gray-600 list-disc list-inside space-y-0.5">
                    {safeSuggestions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Confirmar nueva contraseña
              </label>
              <input
                type="password"
                className="w-full border rounded-md px-3 py-2 outline-none focus:ring focus:ring-blue-200"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={
                  pwLoading ||
                  tooShort ||
                  categoriesInvalid ||
                  (newPassword.length >= MIN_LEN && tooWeak)
                }
                className="rounded-md px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {pwLoading ? "Guardando..." : "Guardar cambios"}
              </button>
              <button
                type="button"
                className="rounded-md px-4 py-2 border"
                onClick={() => navigate(-1)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* ===================== Logout-all ===================== */}
      <section className="rounded-lg border p-5">
        <h2 className="text-lg font-medium mb-2">Cerrar sesión en todos los dispositivos</h2>
        <p className="text-sm text-gray-600 mb-4">
          Esto invalidará todas tus sesiones activas. Te pediremos iniciar sesión nuevamente.
        </p>

        {loAllErr && (
          <div className="rounded-md border p-3 bg-red-50 text-red-700 mb-4">
            {loAllErr}
          </div>
        )}
        {loAllMsg && (
          <div className="rounded-md border p-3 bg-green-50 text-green-800 mb-4">
            {loAllMsg}
          </div>
        )}

        <button
          onClick={onLogoutAll}
          disabled={loAllLoading}
          className="rounded-md px-4 py-2 bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-60"
        >
          {loAllLoading ? "Cerrando sesiones..." : "Cerrar sesión en todos los dispositivos"}
        </button>
      </section>

      {/* ===================== Eliminar cuenta ===================== */}
      <section className="rounded-lg border p-5">
        <h2 className="text-lg font-medium mb-2">Eliminar mi cuenta</h2>
        <p className="text-sm text-gray-600 mb-4">
          Desactivaremos tu cuenta (borrado suave). Podrás solicitar reactivación más adelante.
        </p>

        {delError && (
          <div className="rounded-md border p-3 bg-red-50 text-red-700 mb-4">
            {delError}
          </div>
        )}

        <form onSubmit={onDeleteAccount} className="space-y-3 max-w-md">
          <label className="block text-sm font-medium">
            Escribe tu contraseña para confirmar:
          </label>
          <input
            type="password"
            className="w-full border rounded-md px-3 py-2 outline-none focus:ring focus:ring-blue-200"
            value={delPassword}
            onChange={(e) => setDelPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
          <button
            type="submit"
            disabled={delLoading}
            className="rounded-md px-4 py-2 bg-red-600 text-white hover:bg-red-700 disabled:opacity-60"
          >
            {delLoading ? "Eliminando..." : "Eliminar cuenta"}
          </button>
        </form>
      </section>
    </div>
  );
}







