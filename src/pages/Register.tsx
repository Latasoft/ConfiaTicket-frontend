// src/pages/Register.tsx
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import zxcvbn from "zxcvbn";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

/* =================== Límites (alineados DB/UX) =================== */
const LIMITS = {
  RUT: 16,       // @db.VarChar(16)
  NAME: 100,     // @db.VarChar(100)
  EMAIL: 254,    // @db.VarChar(254)
  PASSWORD: 128, // defensivo (hash en DB cabe en 100)
};

/* =================== Utilidades RUT (front) =================== */
// Normaliza a "XXXXXXXX-D" (sin puntos; guion antes del DV; DV en mayúscula).
function normalizeRut(input: string): string {
  const raw = String(input || "")
    .replace(/\./g, "")
    .replace(/-/g, "")
    .toUpperCase();
  const m = raw.match(/^(\d{7,8})([0-9K])$/);
  if (!m) return "";
  const body = m[1]!;
  const dv = m[2]!;
  return `${body}-${dv}`;
}
function calcRutDv(body: string): string {
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]!, 10) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const res = 11 - (sum % 11);
  if (res === 11) return "0";
  if (res === 10) return "K";
  return String(res);
}
function validateRut(input: string): boolean {
  const norm = normalizeRut(input);
  if (!norm) return false;
  const m = norm.match(/^(\d{7,8})-([0-9K])$/);
  if (!m) return false;
  const body = m[1]!;
  const dv = m[2]!;
  return calcRutDv(body) === dv;
}
/* =============================================================== */

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    rut: "",
    name: "",
    email: "",
    password: "",
    confirm: "",
  });
  const [rutErr, setRutErr] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  // === zxcvbn ===
  const [score, setScore] = useState(0); // 0..4
  const [feedback, setFeedback] = useState<{ warning?: string; suggestions: string[] }>({
    suggestions: [],
  });
  const scoreLabel = ["Muy débil", "Débil", "Regular", "Buena", "Excelente"][score] || "Muy débil";
  const barPercent = ((score / 4) * 100).toFixed(0);
  const barColor =
    ["#dc2626", "#ea580c", "#a16207", "#15803d", "#047857"][score] || "#dc2626";
  const scoreClass =
    ["text-red-600", "text-orange-600", "text-yellow-700", "text-green-700", "text-emerald-700"][
      score
    ] || "text-red-600";

  // ---- onChange con recortes por campo ----
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "rut") {
      setRutErr(null);
      // Permitimos solo 0-9, k/K, puntos y guion; sin espacios y con límite 16
      const cleaned = value.replace(/\s+/g, "").replace(/[^0-9kK\.\-]/g, "");
      setForm((s) => ({ ...s, rut: cleaned.slice(0, LIMITS.RUT) }));
      return;
    }

    if (name === "name") {
      // Recorte y colapso de espacios excesivos; límite 100
      const v = value.replace(/\s{2,}/g, " ").slice(0, LIMITS.NAME);
      setForm((s) => ({ ...s, name: v }));
      return;
    }

    if (name === "email") {
      // Sin espacios; todo lo demás permitido; límite 254
      const v = value.replace(/\s+/g, "").slice(0, LIMITS.EMAIL);
      setForm((s) => ({ ...s, email: v }));
      return;
    }

    if (name === "password" || name === "confirm") {
      const v = value.slice(0, LIMITS.PASSWORD);
      setForm((s) => ({ ...s, [name]: v }));

      if (name === "password") {
        try {
          const r = zxcvbn(v);
          setScore(r.score);
          setFeedback({ warning: r.feedback.warning, suggestions: r.feedback.suggestions || [] });
        } catch {
          setScore(0);
          setFeedback({ suggestions: [] });
        }
      }
      return;
    }

    // fallback (no debería ocurrir)
    setForm((s) => ({ ...s, [name]: value }));
  };

  function onRutBlur() {
    const n = normalizeRut(form.rut);
    if (!n || !validateRut(n)) {
      setRutErr("RUT inválido. Ejemplo válido: 12345678-9");
    } else {
      setRutErr(null);
      setForm((s) => ({ ...s, rut: n }));
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);

    const rut = form.rut.trim();
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    // Campos obligatorios
    if (!rut || !name || !email || !password || !form.confirm) {
      setMsg({ type: "err", text: "Completa todos los campos." });
      return;
    }

    // Chequeos de longitud (defensivos)
    if (rut.length > LIMITS.RUT) {
      setRutErr(`El RUT no puede exceder ${LIMITS.RUT} caracteres.`);
      return;
    }
    if (name.length > LIMITS.NAME) {
      setMsg({ type: "err", text: `El nombre no puede exceder ${LIMITS.NAME} caracteres.` });
      return;
    }
    if (email.length > LIMITS.EMAIL) {
      setMsg({ type: "err", text: `El email no puede exceder ${LIMITS.EMAIL} caracteres.` });
      return;
    }
    if (password.length > LIMITS.PASSWORD || form.confirm.length > LIMITS.PASSWORD) {
      setMsg({ type: "err", text: `La contraseña no puede exceder ${LIMITS.PASSWORD} caracteres.` });
      return;
    }

    // Validaciones específicas
    const rutNorm = normalizeRut(rut);
    if (!rutNorm || !validateRut(rutNorm)) {
      setRutErr("RUT inválido. Ejemplo válido: 12345678-9");
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setMsg({ type: "err", text: "Email inválido." });
      return;
    }
    if (password.length < 8) {
      setMsg({ type: "err", text: "La contraseña debe tener al menos 8 caracteres." });
      return;
    }
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /\d/.test(password);
    const hasSymbol = /[^A-Za-z0-9]/.test(password);
    const categoriesCount = [hasLower, hasUpper, hasDigit, hasSymbol].filter(Boolean).length;
    if (categoriesCount < 3) {
      setMsg({
        type: "err",
        text: "La contraseña debe incluir al menos 3 de: minúsculas, mayúsculas, números y símbolos.",
      });
      return;
    }
    const localPart = email.split("@")[0] || "";
    const lowered = password.toLowerCase();
    if (localPart.length >= 3 && lowered.includes(localPart)) {
      setMsg({ type: "err", text: "La contraseña no debe contener tu email." });
      return;
    }
    const nameTokens = name.toLowerCase().split(/\s+/).filter((t) => t.length >= 3);
    if (nameTokens.some((t) => lowered.includes(t))) {
      setMsg({ type: "err", text: "La contraseña no debe contener tu nombre." });
      return;
    }
    if (form.password !== form.confirm) {
      setMsg({ type: "err", text: "Las contraseñas no coinciden." });
      return;
    }
    if (score < 2) {
      setMsg({
        type: "err",
        text: "Tu contraseña es muy débil. Usa más caracteres y evita frases comunes.",
      });
      return;
    }

    try {
      setLoading(true);
      const { data } = await api.post("/auth/register", {
        rut: rutNorm,
        name,
        email,
        password,
        role: "buyer",
      });

      if (data?.token) {
        await login(data.token);
      }

      setMsg({ type: "ok", text: "Cuenta creada. ¡Bienvenido!" });
      navigate("/");
    } catch (err: any) {
      const text =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "No se pudo crear la cuenta.";
      setMsg({ type: "err", text });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Crear cuenta</h1>

      {msg && (
        <div
          className={`mb-4 rounded-md p-3 ${
            msg.type === "ok" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        {/* RUT */}
        <div>
          <label className="block text-sm mb-1">RUT *</label>
          <input
            name="rut"
            value={form.rut}
            onChange={onChange}
            onBlur={onRutBlur}
            onKeyDown={(e) => { if (e.key === " ") e.preventDefault(); }}
            className={`w-full border rounded-md px-3 py-2 ${rutErr ? "border-red-400" : ""}`}
            placeholder="12345678-9"
            title="Ingresa 7 u 8 dígitos, guion y dígito verificador (0-9 o K)"
            pattern="[0-9Kk\-\.]*"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            maxLength={LIMITS.RUT}
            aria-invalid={Boolean(rutErr)}
            required
          />
          <p className="text-xs text-gray-600 mt-1">
            Formato: 12345678-9 (DV puede ser 0-9 o K).
          </p>
          {rutErr && <p className="text-xs text-red-600 mt-1">{rutErr}</p>}
        </div>

        <div>
          <label className="block text-sm mb-1">Nombre</label>
          <input
            name="name"
            value={form.name}
            onChange={onChange}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Tu nombre"
            autoComplete="name"
            maxLength={LIMITS.NAME}
            required
          />
          {/* Sin leyenda de “Máx. … caracteres” */}
        </div>

        <div>
          <label className="block text-sm mb-1">Email</label>
          <input
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            className="w-full border rounded-md px-3 py-2"
            placeholder="tucorreo@ejemplo.com"
            autoComplete="email"
            autoCapitalize="off"
            autoCorrect="off"
            maxLength={LIMITS.EMAIL}
            required
          />
          <p className="text-xs text-gray-600 mt-1">
            Podrás iniciar sesión con tu <strong>RUT</strong> o con tu <strong>email</strong>.
          </p>
        </div>

        <div>
          <label className="block text-sm mb-1">Contraseña</label>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={onChange}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
            maxLength={LIMITS.PASSWORD}
            required
          />

          {/* Barra de fortaleza */}
          <div className="mt-2">
            <div className="h-2 rounded bg-gray-200 overflow-hidden">
              <div
                className="h-2 rounded transition-all"
                style={{ width: `${barPercent}%`, background: barColor }}
              />
            </div>
            <p className={`mt-1 text-sm ${scoreClass}`}>Fortaleza: {scoreLabel}</p>

            <ul className="text-xs text-gray-600 list-disc pl-5 mt-1 space-y-1">
              <li>Mínimo 8 caracteres.</li>
              <li>Incluye al menos 3 de: minúsculas, mayúsculas, números y símbolos.</li>
              <li>No incluyas tu nombre ni tu email.</li>
              {/* Quitamos la línea de “Máx. … caracteres.” */}
            </ul>

            <ul className="text-xs text-gray-600 list-disc pl-5 mt-2 space-y-1">
              {feedback.warning ? <li>{feedback.warning}</li> : null}
              {feedback.suggestions?.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Repetir contraseña</label>
          <input
            name="confirm"
            type="password"
            value={form.confirm}
            onChange={onChange}
            className="w-full border rounded-md px-3 py-2"
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            maxLength={LIMITS.PASSWORD}
            required
          />
          {/* Sin leyenda de “Máx. … caracteres” */}
        </div>

        <button
          type="submit"
          disabled={loading || Boolean(rutErr)}
          className="w-full px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      <p className="text-sm text-gray-600 mt-4">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="text-blue-600 underline">
          Ingresar
        </Link>
      </p>
    </div>
  );
}





