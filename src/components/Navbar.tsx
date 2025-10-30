import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useRef, useState } from "react";

export default function Navbar() {
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

  const [emailOverride, setEmailOverride] = useState<string | null>(null);

  // Quick-jump a reserva
  const [jumpId, setJumpId] = useState<string>("");

  const baseLink =
    "px-3 py-2 rounded-md hover:bg-black/10 transition-colors whitespace-nowrap " +
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2";
  const active = ({ isActive }: { isActive: boolean }) =>
    `${baseLink} ${isActive ? "font-semibold underline underline-offset-4" : ""}`;

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
    if (adminOpen) setAdminOpen(false);
    if (orgOpen) setOrgOpen(false);
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

  // 🔒 Normalización de flags de rol/estado
  const isAdmin = user?.role === "superadmin";
  const isOrganizer = user?.role === "organizer";
  const organizerVerified: boolean =
    (user as any)?.verifiedOrganizer ?? (user as any)?.isVerified ?? false;

  async function handleLogout() {
    try {
      await logout();
    } finally {
      setAdminOpen(false);
      setOrgOpen(false);
      setEmailOverride(null);
      navigate("/login", { replace: true, state: undefined });
    }
  }

  function goToReservation(e?: React.FormEvent) {
    e?.preventDefault();
    const id = parseInt(jumpId, 10);
    if (!Number.isFinite(id) || id <= 0) return;
    navigate(`/reservas/${id}`);
    setJumpId("");
  }

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link
          to="/"
          className="font-extrabold text-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 rounded-md"
        >
          Portal <span className="text-violet-600">Entradas</span>
        </Link>

        <nav className="flex items-center gap-2 relative" role="navigation" aria-label="Navegación principal">
          <NavLink to="/" end className={active}>
            Inicio
          </NavLink>
          <NavLink to="/eventos" className={active}>
            Eventos
          </NavLink>

          {loading ? (
            <span className="px-3 py-2 text-sm text-gray-500 select-none">Cargando…</span>
          ) : user ? (
            <>
              {/* Mis entradas para cualquier autenticado */}
              <NavLink to="/mis-entradas" className={active}>
                Mis entradas
              </NavLink>

              {/* ====== Admin ====== */}
              {isAdmin && (
                <div className="relative">
                  <button
                    ref={adminBtnRef}
                    type="button"
                    onClick={() => setAdminOpen((o) => !o)}
                    onMouseEnter={() => setAdminOpen(true)}
                    onMouseLeave={() => setAdminOpen(false)}
                    aria-haspopup="menu"
                    aria-expanded={adminOpen}
                    className={`${baseLink} flex items-center gap-1`}
                  >
                    Admin
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${adminOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <div
                    ref={adminMenuRef}
                    onMouseEnter={() => setAdminOpen(true)}
                    onMouseLeave={() => setAdminOpen(false)}
                    className={`absolute right-0 top-full min-w-[220px] border rounded-md bg-white shadow transition-opacity ${
                      adminOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                    role="menu"
                    aria-label="Admin"
                  >
                    <NavLink
                      to="/admin/eventos"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline underline-offset-4" : ""}`
                      }
                      onClick={() => setAdminOpen(false)}
                      role="menuitem"
                    >
                      Eventos
                    </NavLink>
                    <NavLink
                      to="/admin/usuarios"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline underline-offset-4" : ""}`
                      }
                      onClick={() => setAdminOpen(false)}
                      role="menuitem"
                    >
                      Usuarios
                    </NavLink>
                    <NavLink
                      to="/admin/solicitudes-organizador"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline underline-offset-4" : ""}`
                      }
                      onClick={() => setAdminOpen(false)}
                      role="menuitem"
                    >
                      Solicitudes de organizador
                    </NavLink>
                    <NavLink
                      to="/admin/tickets"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline underline-offset-4" : ""}`
                      }
                      onClick={() => setAdminOpen(false)}
                      role="menuitem"
                    >
                      Tickets (revisión)
                    </NavLink>
                    <NavLink
                      to="/admin/payouts"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline underline-offset-4" : ""}`
                      }
                      onClick={() => setAdminOpen(false)}
                      role="menuitem"
                    >
                      Mis Pagos
                    </NavLink>
                    <div className="border-t my-1"></div>
                    <NavLink
                      to="/admin/configuracion"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? 'font-semibold underline underline-offset-4' : ''}`
                      }
                      onClick={() => setAdminOpen(false)}
                      role="menuitem"
                    >
                      Configuración
                    </NavLink>
                  </div>
                </div>
              )}

              {/* ====== Organizador ====== */}
              {isOrganizer && organizerVerified && (
                <div className="relative">
                  <button
                    ref={orgBtnRef}
                    type="button"
                    onClick={() => setOrgOpen((o) => !o)}
                    onMouseEnter={() => setOrgOpen(true)}
                    onMouseLeave={() => setOrgOpen(false)}
                    aria-haspopup="menu"
                    aria-expanded={orgOpen}
                    className={`${baseLink} flex items-center gap-1`}
                  >
                    Organizador
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 transition-transform ${orgOpen ? "rotate-180" : ""}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.08 1.04l-4.25 4.25a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                  <div
                    ref={orgMenuRef}
                    onMouseEnter={() => setOrgOpen(true)}
                    onMouseLeave={() => setOrgOpen(false)}
                    className={`absolute right-0 top-full min-w-[220px] border rounded-md bg-white shadow transition-opacity ${
                      orgOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                    role="menu"
                    aria-label="Organizador"
                  >
                    <NavLink
                      to="/organizador"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline underline-offset-4" : ""}`
                      }
                      onClick={() => setOrgOpen(false)}
                      role="menuitem"
                    >
                      Panel de organizador
                    </NavLink>

                    <NavLink
                      to="/organizador/eventos/nuevo"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline underline-offset-4" : ""}`
                      }
                      onClick={() => setOrgOpen(false)}
                      role="menuitem"
                    >
                      Crear evento
                    </NavLink>

                    <NavLink
                      to="/organizador/entradas"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline underline-offset-4" : ""}`
                      }
                      onClick={() => setOrgOpen(false)}
                      role="menuitem"
                    >
                      Subir entradas
                    </NavLink>

                    <NavLink
                      to="/organizador/pagos"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline underline-offset-4" : ""}`
                      }
                      onClick={() => setOrgOpen(false)}
                      role="menuitem"
                    >
                      Mis pagos
                    </NavLink>

                    <NavLink
                      to="/organizador/cuenta-cobro"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline underline-offset-4" : ""}`
                      }
                      onClick={() => setOrgOpen(false)}
                      role="menuitem"
                    >
                      Cuenta de cobro
                    </NavLink>

                    <div className="border-t my-1"></div>

                    <NavLink
                      to="/organizador/validar-tickets"
                      className={({ isActive }) =>
                        `block px-3 py-2 hover:bg-black/5 ${isActive ? "font-semibold underline underline-offset-4" : ""}`
                      }
                      onClick={() => setOrgOpen(false)}
                      role="menuitem"
                    >
                      Validar tickets
                    </NavLink>
                  </div>
                </div>
              )}

              {isOrganizer && !organizerVerified && (
                <NavLink to="/organizador/pendiente" className={active}>
                  Pendiente
                </NavLink>
              )}

              {user.role === "buyer" && !user.applicationStatus && (
                <NavLink to="/solicitar-organizador" className={active}>
                  Ser organizador
                </NavLink>
              )}

              {user.role === "buyer" && (user.applicationStatus === "PENDING" || user.applicationStatus === "REJECTED") && (
                <NavLink to="/solicitar-organizador" className={active}>
                  Estado de Solicitud
                </NavLink>
              )}

              <NavLink to="/cuenta/seguridad" className={active}>
                Seguridad
              </NavLink>

              {/* Quick-jump a /reservas/:id */}
              <form onSubmit={goToReservation} className="hidden md:flex items-center gap-1 ml-1">
                <input
                  value={jumpId}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  onChange={(e) => setJumpId(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder="# reserva"
                  aria-label="Ir a reserva por ID"
                  className="w-24 border rounded px-2 py-1 text-sm"
                />
                <button
                  type="submit"
                  disabled={!jumpId}
                  className="px-2 py-1 rounded border text-sm hover:bg-gray-50 disabled:opacity-50"
                  title="Abrir detalle de la reserva"
                >
                  Ir
                </button>
              </form>

              {displayName && (
                <span
                  className="hidden sm:inline-flex items-center text-xs px-2 py-1 rounded-md bg-black/5 text-gray-700"
                  title={displayName}
                >
                  {displayName}
                </span>
              )}
              {emailToShow && (
                <span
                  className="hidden sm:inline-flex items-center text-xs px-2 py-1 rounded-md bg-black/5 text-gray-700"
                  title={emailToShow}
                >
                  {emailToShow}
                </span>
              )}

              <button type="button" onClick={handleLogout} className={baseLink}>
                Salir
              </button>
            </>
          ) : (
            <>
              <NavLink to="/registro" className={active}>
                Registrarme
              </NavLink>
              <NavLink to="/login" className={active}>
                Ingresar
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}























