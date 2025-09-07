// src/pages/Register.tsx
import { useState, useMemo } from "react";
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

/* =================== Fechas / edad mínima =================== */
const MIN_AGE = 18;
function formatYmd(d: Date) {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    .toISOString()
    .slice(0, 10);
}
function yearsAgo(n: number) {
  const t = new Date();
  return new Date(t.getFullYear() - n, t.getMonth(), t.getDate());
}
const TODAY_YEAR = new Date().getFullYear();
const MAX_DOB_STR = formatYmd(yearsAgo(MIN_AGE)); // tope superior (hoy - 18)
const MIN_DOB_STR = "1900-01-01";

/* =================== Utilidades RUT (front) =================== */
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
  let sum = 0, mul = 2;
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

/* =================== Utilidades DOB (selects) =================== */
const MONTHS = [
  { v: "01", label: "ene." },
  { v: "02", label: "feb." },
  { v: "03", label: "mar." },
  { v: "04", label: "abr." },
  { v: "05", label: "may." },
  { v: "06", label: "jun." },
  { v: "07", label: "jul." },
  { v: "08", label: "ago." },
  { v: "09", label: "sept." },
  { v: "10", label: "oct." },
  { v: "11", label: "nov." },
  { v: "12", label: "dic." },
];
function daysInMonth(year: number, month1to12: number) {
  return new Date(year, month1to12, 0).getDate();
}
function calcAge(ymd: string) {
  const [y, m, d] = ymd.split("-").map((t) => parseInt(t, 10));
  if (!y || !m || !d) return -1;
  const today = new Date();
  let age = today.getFullYear() - y;
  const dm = (today.getMonth() + 1) - m;
  if (dm < 0 || (dm === 0 && today.getDate() < d)) age--;
  return age;
}
function isValidEmail(s: string) {
  return /^\S+@\S+\.\S+$/.test(s);
}

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

  // zxcvbn
  const [score, setScore] = useState(0); // 0..4
  const [feedback, setFeedback] = useState<{ warning?: string; suggestions: string[] }>({
    suggestions: [],
  });
  const scoreLabel = ["Muy débil", "Débil", "Regular", "Buena", "Excelente"][score] || "Muy débil";
  const barPercent = ((score / 4) * 100).toFixed(0);
  const barColor =
    ["#dc2626", "#ea580c", "#a16207", "#15803d", "#047857"][score] || "#dc2626";
  const scoreClass =
    ["text-red-600", "text-orange-600", "text-yellow-700", "text-green-700", "text-emerald-700"][score] ||
    "text-red-600";

  // DOB con selects (Año/Mes/Día)
  const MAX_YEAR = useMemo(() => TODAY_YEAR - MIN_AGE, []);
  const MIN_YEAR = 1900;
  // 👇 Ahora listamos todos los años 1900..hoy (desc), y deshabilitamos los > MAX_YEAR (menores de edad)
  const yearOptions = useMemo(
    () => Array.from({ length: TODAY_YEAR - MIN_YEAR + 1 }, (_, i) => String(TODAY_YEAR - i)),
    []
  );

  const [dob, setDob] = useState<{ y: string; m: string; d: string }>({ y: "", m: "", d: "" });

  const maxDays = useMemo(() => {
    const y = parseInt(dob.y || "0", 10);
    const m = parseInt(dob.m || "0", 10);
    if (!y || !m) return 31;
    return daysInMonth(y, m);
  }, [dob.y, dob.m]);

  const dayOptions = useMemo(
    () => Array.from({ length: maxDays }, (_, i) => String(i + 1).padStart(2, "0")),
    [maxDays]
  );

  const birthDate = useMemo(() => {
    if (!dob.y || !dob.m || !dob.d) return "";
    return `${dob.y}-${dob.m}-${dob.d}`;
  }, [dob]);

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "rut") {
      setRutErr(null);
      const cleaned = value.replace(/\s+/g, "").replace(/[^0-9kK\.\-]/g, "");
      setForm((s) => ({ ...s, rut: cleaned.slice(0, LIMITS.RUT) }));
      return;
    }

    if (name === "name") {
      const v = value.replace(/\s{2,}/g, " ").slice(0, LIMITS.NAME);
      setForm((s) => ({ ...s, name: v }));
      return;
    }

    if (name === "email") {
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

    if (!rut || !name || !email || !birthDate || !password || !form.confirm) {
      setMsg({ type: "err", text: "Completa todos los campos." });
      return;
    }

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

    const rutNorm = normalizeRut(rut);
    if (!rutNorm || !validateRut(rutNorm)) {
      setRutErr("RUT inválido. Ejemplo válido: 12345678-9");
      return;
    }

    if (!isValidEmail(email)) {
      setMsg({ type: "err", text: "Email inválido." });
      return;
    }

    if (birthDate < MIN_DOB_STR || birthDate > MAX_DOB_STR) {
      setMsg({
        type: "err",
        text: `La fecha de nacimiento debe estar entre ${MIN_DOB_STR} y ${MAX_DOB_STR}.`,
      });
      return;
    }
    if (calcAge(birthDate) < MIN_AGE) {
      setMsg({ type: "err", text: `Debes ser mayor de ${MIN_AGE} años.` });
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
        birthDate, // YYYY-MM-DD
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

        {/* Fecha de nacimiento: Selects */}
        <div>
          <label className="block text-sm mb-1">Fecha de nacimiento *</label>
          <div className="grid grid-cols-3 gap-2">
            {/* Año */}
            <select
              value={dob.y}
              onChange={(e) => {
                const y = e.target.value;
                setDob((s) => {
                  const d = s.d
                    ? Math.min(
                        parseInt(s.d, 10),
                        daysInMonth(parseInt(y || "0", 10), parseInt(s.m || "0", 10))
                      )
                    : "";
                  return { ...s, y, d: d ? String(d).padStart(2, "0") : s.d };
                });
              }}
              className="border rounded-md px-2 py-2"
              required
            >
              <option value="">Año</option>
              {yearOptions.map((y) => {
                const isMinor = parseInt(y, 10) > MAX_YEAR;
                return (
                  <option key={y} value={y} disabled={isMinor}>
                    {y}{isMinor ? " — menor de 18" : ""}
                  </option>
                );
              })}
            </select>

            {/* Mes */}
            <select
              value={dob.m}
              onChange={(e) => {
                const m = e.target.value;
                setDob((s) => {
                  const dMax = s.y ? daysInMonth(parseInt(s.y, 10), parseInt(m || "0", 10)) : 31;
                  const d = s.d ? Math.min(parseInt(s.d, 10), dMax) : "";
                  return { ...s, m, d: d ? String(d).padStart(2, "0") : s.d };
                });
              }}
              className="border rounded-md px-2 py-2"
              required
            >
              <option value="">Mes</option>
              {MONTHS.map((m) => (
                <option key={m.v} value={m.v}>{m.label}</option>
              ))}
            </select>

            {/* Día */}
            <select
              value={dob.d}
              onChange={(e) => setDob((s) => ({ ...s, d: e.target.value }))}
              className="border rounded-md px-2 py-2"
              required
            >
              <option value="">Día</option>
              {dayOptions.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Debes tener al menos {MIN_AGE} años. Rango permitido: {MIN_DOB_STR} – {MAX_DOB_STR}.
            Los años recientes aparecen deshabilitados porque corresponden a menores de edad.
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








