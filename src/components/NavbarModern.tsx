// src/components/NavbarModern.tsx
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useRef, useState } from "react";

export default function NavbarModern() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Admin dropdown
  const [adminOpen, setAdminOpen] = useState(false);
  const adminBtnRef = useRef<HTMLButtonElement | null>(null);
  const adminMenuRef = useRef<HTMLDivElement | null>(null);

  // Organizer dropdown
  const [orgOpen, setOrgOpen] = useState(false);
  const orgBtnRef = useRef<HTMLButtonElement | null>(null);
  const orgMenuRef = useRef<HTMLDivElement | null>(null);

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);

  const [emailOverride, setEmailOverride] = useState<string | null>(null);

  // Link styles with modern dark theme
  const baseLink =
    "px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-all whitespace-nowrap font-medium";
  const active = ({ isActive }: { isActive: boolean }) =>
    `${baseLink} ${isActive ? "bg-dark-700 text-white font-bold" : ""}`;

  // Cerrar menús al click fuera / Escape
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;

      if (adminOpen) {
        if (
          adminMenuRef.current &&
          !adminMenuRef.current.contains(t) &&
          adminBtnRef.current &&
          !adminBtnRef.current.contains(t)
        ) {
          setAdminOpen(false);
        }
      }
      if (orgOpen) {
        if (
          orgMenuRef.current &&
          !orgMenuRef.current.contains(t) &&
          orgBtnRef.current &&
          !orgBtnRef.current.contains(t)
        ) {
          setOrgOpen(false);
        }
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setAdminOpen(false);
        setOrgOpen(false);
        setMobileOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [adminOpen, orgOpen]);

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setAdminOpen(false);
    setOrgOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  // Mostrar email desde localStorage si cambió
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.email && parsed.email !== user?.email) {
          setEmailOverride(String(parsed.email));
        }
      }
    } catch {
      // Ignore localStorage errors
    }
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

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const isSuperadmin = user?.role === "superadmin";
  const isOrganizer = user?.role === "organizer" && (user as { verified?: boolean }).verified;

  return (
    <nav className="bg-dark-800/95 backdrop-blur-md border-b border-dark-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link
            to="/"
            className="flex items-center gap-3 font-display text-2xl font-bold text-white hover:text-neon-cyan transition-colors"
          >
            <img 
              src="/logo_confiaticket_claro.jpeg" 
              alt="ConfíaTicket Logo" 
              className="h-12 w-auto"
            />
            <span>ConfiaTicket</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-2">
            <NavLink to="/eventos" className={active}>
              Eventos
            </NavLink>

            {user && (
              <NavLink to="/my-tickets" className={active}>
                Mis Tickets
              </NavLink>
            )}

            {/* Organizer Dropdown */}
            {isOrganizer && (
              <div className="relative">
                <button
                  ref={orgBtnRef}
                  onClick={() => setOrgOpen(!orgOpen)}
                  className={`${baseLink} flex items-center gap-1`}
                  aria-expanded={orgOpen}
                >
                  Organizador
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {orgOpen && (
                  <div
                    ref={orgMenuRef}
                    className="absolute right-0 mt-2 w-56 rounded-xl glass border border-dark-600 shadow-2xl"
                  >
                    <div className="p-2 space-y-1">
                      <Link
                        to="/organizer/dashboard"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Dashboard
                      </Link>
                      <Link
                        to="/organizer/events/new"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Crear Evento
                      </Link>
                      <Link
                        to="/organizer/payouts"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Pagos
                      </Link>
                      <Link
                        to="/organizer/validate-ticket"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Validar Tickets
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Admin Dropdown */}
            {isSuperadmin && (
              <div className="relative">
                <button
                  ref={adminBtnRef}
                  onClick={() => setAdminOpen(!adminOpen)}
                  className={`${baseLink} flex items-center gap-1 text-neon-pink`}
                  aria-expanded={adminOpen}
                >
                  Admin
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {adminOpen && (
                  <div
                    ref={adminMenuRef}
                    className="absolute right-0 mt-2 w-56 rounded-xl glass border border-dark-600 shadow-2xl"
                  >
                    <div className="p-2 space-y-1">
                      <Link
                        to="/admin/events"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Eventos
                      </Link>
                      <Link
                        to="/admin/users"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Usuarios
                      </Link>
                      <Link
                        to="/admin/organizer-applications"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Solicitudes
                      </Link>
                      <Link
                        to="/admin/tickets"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Tickets
                      </Link>
                      <Link
                        to="/admin/purchases"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Compras
                      </Link>
                      <Link
                        to="/admin/claims"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Reclamos
                      </Link>
                      <Link
                        to="/admin/payouts"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Pagos
                      </Link>
                      <Link
                        to="/admin/config"
                        className="block px-4 py-2 rounded-lg text-dark-100 hover:bg-dark-700/50 hover:text-white transition-colors"
                      >
                        Config
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* User Menu */}
            {loading ? (
              <div className="w-8 h-8 rounded-full bg-dark-700 animate-pulse" />
            ) : user ? (
              <div className="flex items-center gap-3 ml-2">
                <div className="text-right hidden lg:block">
                  {displayName && <p className="text-sm font-semibold text-white">{displayName}</p>}
                  {emailToShow && <p className="text-xs text-dark-300">{emailToShow}</p>}
                </div>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 transition-all"
                >
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost">
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="btn-primary">
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-lg text-dark-100 hover:bg-dark-700/50 transition-colors"
            aria-label="Menú"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-dark-700">
            <NavLink to="/eventos" className={active}>
              Eventos
            </NavLink>

            {user && (
              <NavLink to="/my-tickets" className={active}>
                Mis Tickets
              </NavLink>
            )}

            {isOrganizer && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-dark-300 uppercase">Organizador</div>
                <NavLink to="/organizer/dashboard" className={active}>
                  Dashboard
                </NavLink>
                <NavLink to="/organizer/events/new" className={active}>
                  Crear Evento
                </NavLink>
              </>
            )}

            {isSuperadmin && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-neon-pink uppercase">Admin</div>
                <NavLink to="/admin/events" className={active}>
                  Eventos
                </NavLink>
                <NavLink to="/admin/users" className={active}>
                  Usuarios
                </NavLink>
              </>
            )}

            {!user && (
              <div className="flex flex-col gap-2 pt-2">
                <Link to="/login" className="btn-secondary w-full text-center">
                  Iniciar sesión
                </Link>
                <Link to="/registro" className="btn-primary w-full text-center">
                  Registrarse
                </Link>
              </div>
            )}

            {user && (
              <button onClick={handleLogout} className="w-full text-left px-4 py-2 text-red-400 font-semibold">
                Cerrar sesión
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
