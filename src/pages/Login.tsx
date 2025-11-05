// src/pages/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { loginUser } from "@/services/authService";

function reasonMessage(reason?: string | null) {
  switch (reason) {
    case "session_expired":
      return "Tu sesión caducó. Vuelve a iniciar sesión.";
    case "deactivated":
      return "Tu cuenta está desactivada. Si crees que es un error, contáctanos.";
    case "unauthorized":
      return "Necesitas iniciar sesión para continuar.";
    case "forbidden":
      return "No tienes acceso a esa sección con tu sesión actual. Inicia sesión.";
    default:
      return null;
  }
}

function formatMMSS(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function defaultRouteFor(_u: { role: string; verifiedOrganizer?: boolean }) {
  return "/";
}

const LIMITS = {
  IDENT_EMAIL: 254,
  IDENT_RUT: 16,
  PASSWORD: 128,
};

export default function Login() {
  const [rutOrEmail, setRutOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [lockUntil, setLockUntil] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const isLocked = useMemo(() => (lockUntil ?? 0) > now, [lockUntil, now]);
  const remainingMs = useMemo(() => Math.max(0, (lockUntil ?? 0) - now), [lockUntil, now]);

  const location = useLocation() as any;
  const [info, setInfo] = useState<string | null>(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const msg = reasonMessage(sp.get("reason"));
    setInfo(msg);
  }, [location.search]);

  useEffect(() => {
    if (location.state?.from) {
      navigate(location.pathname + location.search, { replace: true });
    }
  }, [location.state, location.pathname, location.search, navigate]);

  useEffect(() => {
    if (!lockUntil) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [lockUntil]);

  useEffect(() => {
    if (lockUntil && !isLocked) {
      setLockUntil(null);
      setErr(null);
    }
  }, [isLocked, lockUntil]);

  const handleIdentifierChange = (value: string) => {
    let v = value.replace(/\s+/g, "");
    const limit = v.includes("@") ? LIMITS.IDENT_EMAIL : LIMITS.IDENT_RUT;
    if (v.length > limit) v = v.slice(0, limit);
    setRutOrEmail(v);
  };

  const handlePasswordChange = (value: string) => {
    let v = value;
    if (v.length > LIMITS.PASSWORD) v = v.slice(0, LIMITS.PASSWORD);
    setPassword(v);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || isLocked) return;
    setErr(null);

    const idRaw = rutOrEmail.trim();
    const isEmail = idRaw.includes("@");

    if (!idRaw) {
      setErr("Ingresa tu RUT o email.");
      return;
    }
    if ((isEmail && idRaw.length > LIMITS.IDENT_EMAIL) || (!isEmail && idRaw.length > LIMITS.IDENT_RUT)) {
      setErr("El identificador es demasiado largo.");
      return;
    }
    if (!password) {
      setErr("Ingresa tu contraseña.");
      return;
    }

    setLoading(true);
    try {
      const identifier = isEmail ? idRaw.toLowerCase() : idRaw;
      const { token } = await loginUser(identifier, password);
      const u = await login(token);
      
      // Redirigir a la página original si viene de un redirect
      const sp = new URLSearchParams(location.search);
      const redirectPath = sp.get("redirect");
      if (redirectPath) {
        navigate(redirectPath, { replace: true });
      } else {
        navigate(defaultRouteFor(u), { replace: true });
      }
    } catch (error: any) {
      const status = error?.response?.status;
      const baseMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "No se pudo iniciar sesión";

      if (status === 423) {
        setErr(baseMsg);
        const until = error?.response?.data?.lockUntil;
        if (typeof until === "number") {
          setLockUntil(until);
          setNow(Date.now());
        }
      } else if (status === 401) {
        const remaining = error?.response?.data?.attemptsRemaining;
        if (typeof remaining === "number") {
          if (remaining > 1) setErr(`${baseMsg}. Intentos restantes antes del bloqueo: ${remaining}.`);
          else if (remaining === 1) setErr(`${baseMsg}. Te queda 1 intento antes del bloqueo.`);
          else setErr(`${baseMsg}. Estás al límite de intentos.`);
        } else {
          setErr(baseMsg);
        }
      } else {
        setErr(baseMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Ingresar</h1>

      {info && (
        <div className="mb-4 rounded-md border p-3 bg-amber-50 text-amber-900 flex items-start gap-2">
          <span className="mt-0.5">⚠️</span>
          <div className="flex-1">{info}</div>
          <button
            type="button"
            className="ml-2 text-amber-900/70 hover:text-amber-900"
            onClick={() => setInfo(null)}
            aria-label="Cerrar aviso"
            title="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      {err && (
        <div className="mb-4 rounded-md bg-red-100 text-red-800 p-3">
          {err}
          {isLocked ? (
            <div className="mt-1 text-sm">
              Podrás reintentar en <strong>{formatMMSS(remainingMs)}</strong>.
            </div>
          ) : null}
        </div>
      )}

      {isLocked && !err && (
        <div className="mb-4 rounded-md border p-3 bg-red-50 text-red-800">
          La cuenta está temporalmente bloqueada. Reintenta en{" "}
          <strong>{formatMMSS(remainingMs)}</strong>.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1">RUT o correo</label>
          <input
            type="text"
            className="w-full border rounded-md px-3 py-2"
            value={rutOrEmail}
            onChange={(e) => handleIdentifierChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === " ") e.preventDefault(); }}
            maxLength={LIMITS.IDENT_EMAIL}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="username"
            placeholder="12.345.678-9 o usuario@correo.com"
            required
            disabled={isLocked || loading}
          />
          {/* ← texto de “máx.” eliminado */}
        </div>

        <div>
          <label className="block text-sm mb-1">Contraseña</label>
          <input
            type="password"
            className="w-full border rounded-md px-3 py-2"
            value={password}
            onChange={(e) => handlePasswordChange(e.target.value)}
            autoComplete="current-password"
            maxLength={LIMITS.PASSWORD}
            required
            disabled={isLocked || loading}
            placeholder="Tu contraseña"
          />
          {/* ← sin mensaje de mínimo en login */}
        </div>

        <button
          type="submit"
          disabled={loading || isLocked}
          className="w-full px-4 py-2 rounded-md bg-blue-600 text-white disabled:opacity-60"
        >
          {loading ? "Ingresando..." : isLocked ? `Espera ${formatMMSS(remainingMs)}` : "Entrar"}
        </button>
      </form>

      <p className="text-sm text-gray-600 mt-4">
        ¿No tienes cuenta?{" "}
        <Link to="/registro" className="text-blue-600 underline">
          Registrarme
        </Link>
      </p>
    </div>
  );
}








