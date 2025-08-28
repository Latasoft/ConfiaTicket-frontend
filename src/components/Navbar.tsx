// src/components/Navbar.tsx
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useRef, useState } from "react";

export default function Navbar() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [adminOpen, setAdminOpen] = useState(false);
  const adminBtnRef = useRef<HTMLButtonElement | null>(null);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);

  const [emailOverride, setEmailOverride] = useState<string | null>(null);

  const link = "px-3 py-2 rounded-md hover:bg-black/10";
  const active = ({ isActive }: { isActive: boolean }) =>
    `${link} ${isActive ? "font-semibold underline" : ""}`;

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!adminOpen) return;
      const target = e.target as Node;
      if (
        adminMenuRef.current &&
        !adminMenuRef.current.contains(target) &&
        adminBtnRef.current &&
        !adminBtnRef.current.contains(target)
      ) {
        setAdminOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setAdminOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [adminOpen]);

  useEffect(() => {
    if (adminOpen) setAdminOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.email && parsed.email !== user?.email) {
          setEmailOverride(String(parsed.email));
        }
      }
    } catch {}
    function onUserUpdated(ev: Event) {
      const ce = ev as CustomEvent<{ email?: string }>;
      if (ce?.detail?.email) setEmailOverride(ce.detail.email);
    }
    window.addEventListener("auth:user-updated", onUserUpdated as EventListener);
    return () => {
      window.removeEventListener("auth:user-updated", onUserUpdated as EventListener);
    };
  }, [user?.email]);

  const emailToShow = emailOverride ?? user?.email ?? null;
  const displayName = user?.name ? String(user.name).trim() : null;

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setAdminOpen(false);
      setEmailOverride(null);
      navigate("/login", { replace: true, state: undefined });
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-white backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link to="/" className="font-extrabold text-lg">
          Portal Entradas
        </Link>

        <nav className="flex items-center gap-2 relative">
          <NavLink to="/" className={active}>Inicio</NavLink>
          <NavLink to="/eventos" className={active}>Eventos</NavLink>

          {loading ? (
            <span className="px-3 py-2 text-sm text-gray-500 select-none">Cargando…</span>
          ) : user ? (
            <>
              {/* Mis entradas para cualquier autenticado */}
              <NavLink to="/mis-entradas" className={active}>Mis entradas</NavLink>

              {user.role === "superadmin" && (
                <div className="relative">
                  <button
                    ref={adminBtnRef}
                    type="button"
                    onClick={() => setAdminOpen((o) => !o)}
                    onMouseEnter={() => setAdminOpen(true)}
                    onMouseLeave={() => setAdminOpen(false)}
                    aria-haspopup="menu"
                    aria-expanded={adminOpen}
                    className={`${link} flex items-center gap-1`}
                  >
                    Admin
                    <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${adminOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>
                  <div
                    ref={adminMenuRef}
                    onMouseEnter={() => setAdminOpen(true)}
                    onMouseLeave={() => setAdminOpen(false)}
                    className={`absolute right-0 mt-1 min-w-[220px] border rounded-md bg-white shadow transition-opacity ${adminOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
                    role="menu"
                    aria-label="Admin"
                  >
                    <NavLink
                      to="/admin/eventos"
                      className={({ isActive }) => `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline" : ""}`}
                      onClick={() => setAdminOpen(false)}
                      role="menuitem"
                    >
                      Eventos
                    </NavLink>
                    <NavLink
                      to="/admin/usuarios"
                      className={({ isActive }) => `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline" : ""}`}
                      onClick={() => setAdminOpen(false)}
                      role="menuitem"
                    >
                      Usuarios
                    </NavLink>
                    <NavLink
                      to="/admin/solicitudes-organizador"
                      className={({ isActive }) => `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline" : ""}`}
                      onClick={() => setAdminOpen(false)}
                      role="menuitem"
                    >
                      Solicitudes de organizador
                    </NavLink>
                    <NavLink
                      to="/admin/tickets"
                      className={({ isActive }) => `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline" : ""}`}
                      onClick={() => setAdminOpen(false)}
                      role="menuitem"
                    >
                      Tickets (revisión)
                    </NavLink>
                  </div>
                </div>
              )}

              {user.role === "organizer" && user.verifiedOrganizer && (
                <>
                  <NavLink to="/organizador" className={active}>Organizador</NavLink>
                  <NavLink to="/organizador/entradas" className={active}>Subir entradas</NavLink>
                </>
              )}
              {user.role === "organizer" && !user.verifiedOrganizer && (
                <NavLink to="/organizador/pendiente" className={active}>Pendiente</NavLink>
              )}

              {user.role === "buyer" && (
                <NavLink to="/solicitar-organizador" className={active}>Ser organizador</NavLink>
              )}

              <NavLink to="/cuenta/seguridad" className={active}>Seguridad</NavLink>

              {displayName && (
                <span className="hidden sm:inline-flex items-center text-xs px-2 py-1 rounded-md bg-black/5 text-gray-700" title={displayName}>
                  {displayName}
                </span>
              )}
              {emailToShow && (
                <span className="hidden sm:inline-flex items-center text-xs px-2 py-1 rounded-md bg-black/5 text-gray-700" title={emailToShow}>
                  {emailToShow}
                </span>
              )}

              <button type="button" onClick={handleLogout} className={link}>
                Salir
              </button>
            </>
          ) : (
            <>
              <NavLink to="/registro" className={active}>Registrarme</NavLink>
              <NavLink to="/login" className={active}>Ingresar</NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}















