// src/pages/Login.tsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { loginUser } from "@/services/authService";
import { getFriendlyErrorMessage } from "@/utils/errorMessages";

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
  const [showPassword, setShowPassword] = useState(false);
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
      
      // Manejo especial para cuenta bloqueada (423)
      if (status === 423) {
        const baseMsg = error?.response?.data?.error || error?.response?.data?.message || "La cuenta está temporalmente bloqueada por múltiples intentos fallidos";
        setErr(baseMsg);
        const until = error?.response?.data?.lockUntil;
        if (typeof until === "number") {
          setLockUntil(until);
          setNow(Date.now());
        }
      } 
      // Manejo especial para credenciales incorrectas (401) con intentos restantes
      else if (status === 401) {
        const baseMsg = getFriendlyErrorMessage(error, "RUT/correo o contraseña incorrectos");
        const remaining = error?.response?.data?.attemptsRemaining;
        if (typeof remaining === "number") {
          if (remaining > 1) setErr(`${baseMsg}. Intentos restantes antes del bloqueo: ${remaining}.`);
          else if (remaining === 1) setErr(`${baseMsg}. Te queda 1 intento antes del bloqueo.`);
          else setErr(`${baseMsg}. Estás al límite de intentos.`);
        } else {
          setErr(baseMsg);
        }
      } 
      // Otros errores
      else {
        const message = getFriendlyErrorMessage(error, "No se pudo iniciar sesión. Por favor intenta nuevamente");
        setErr(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md glass-light rounded-2xl p-8 border border-dark-700">
        <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
          Ingresar
        </h1>

      {info && (
        <div className="mb-4 rounded-lg glass border border-neon-yellow/50 p-3 text-white flex items-start gap-2">
          <div className="flex-1">{info}</div>
          <button
            type="button"
            className="ml-2 text-white/70 hover:text-white"
            onClick={() => setInfo(null)}
            aria-label="Cerrar aviso"
            title="Cerrar"
          >
            ×
          </button>
        </div>
      )}

      {err && (
        <div className="mb-4 rounded-lg glass border border-red-500/50 text-white p-3">
          {err}
          {isLocked ? (
            <div className="mt-1 text-sm">
              Podrás reintentar en <strong>{formatMMSS(remainingMs)}</strong>.
            </div>
          ) : null}
        </div>
      )}

      {isLocked && !err && (
        <div className="mb-4 rounded-lg glass border border-red-500/50 p-3 text-white">
          La cuenta está temporalmente bloqueada. Reintenta en{" "}
          <strong>{formatMMSS(remainingMs)}</strong>.
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-1 text-dark-100">RUT o correo</label>
          <input
            type="text"
            className="input-modern w-full"
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
          <label className="block text-sm mb-1 text-dark-100">Contraseña</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="input-modern w-full pr-10"
              value={password}
              onChange={(e) => handlePasswordChange(e.target.value)}
              autoComplete="current-password"
              maxLength={LIMITS.PASSWORD}
              required
              disabled={isLocked || loading}
              placeholder="Tu contraseña"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLocked || loading}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-300 hover:text-dark-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {/* ← sin mensaje de mínimo en login */}
        </div>

        <button
          type="submit"
          disabled={loading || isLocked}
          className="btn-primary w-full disabled:opacity-60"
        >
          {loading ? "Ingresando..." : isLocked ? `Espera ${formatMMSS(remainingMs)}` : "Entrar"}
        </button>
      </form>

      <p className="text-sm text-dark-200 mt-6 text-center">
        ¿No tienes cuenta?{" "}
        <Link to="/registro" className="text-neon-cyan hover:text-neon-cyan/80 underline">
          Registrarme
        </Link>
      </p>
      </div>
    </div>
  );
}








