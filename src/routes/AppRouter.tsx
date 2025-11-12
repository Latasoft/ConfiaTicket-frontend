// src/routes/AppRouter.tsx
import { createBrowserRouter } from "react-router-dom";

// Layout
import AppLayout from "@/layout/AppLayout";

// Páginas públicas
import HomeModern from "@/pages/HomeModern"; // ← NUEVO diseño moderno
import Eventos from "@/pages/Eventos";
import EventoDetalle from "@/pages/EventoDetalle";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import About from "@/pages/About"; // ← NUEVO
import Help from "@/pages/Help"; // ← NUEVO
// Resultado Webpay
import PaymentResult from "@/pages/PaymentResult";

// Validación de tickets RESALE
import ResaleTicketValidation from "@/pages/ResaleTicketValidation";

// Flujo organizador
import OrganizerApply from "@/pages/OrganizerApply";
import OrganizerPending from "@/pages/OrganizerPending";
import OrganizerDashboard from "@/pages/OrganizerDashboard";
import OrganizerEventForm from "@/pages/OrganizerEventForm";
import OrganizerPayoutSettings from "@/pages/OrganizerPayoutSettings";
import OrganizerPayouts from "@/pages/OrganizerPayouts";
import OrganizerTicketValidator from "@/pages/OrganizerTicketValidator";

// Mis entradas (comprador)
import MyTickets from "@/pages/MyTickets";
import ReservationDetail from "@/pages/ReservationDetail"; // ← NUEVO
import MyClaims from "@/pages/MyClaims"; // ← NUEVO
import ClaimDetail from "@/pages/ClaimDetail"; // ← NUEVO

// Guards
import RequireAuth from "@/routes/RequireAuth";
import RequireVerifiedOrganizer from "@/routes/RequireVerifiedOrganizer";
import RequireSuperadmin from "@/routes/RequireSuperadmin";

// Admin
import AdminEvents from "@/pages/AdminEvents";
import AdminEventDetail from "@/pages/AdminEventDetail";
import AdminUsers from "@/pages/AdminUsers";
import AdminUserDetail from "@/pages/AdminUserDetail";
import AdminOrganizerApps from "@/pages/AdminOrganizerApps";
import AdminTickets from "@/pages/AdminTickets";
import AdminPayouts from "@/pages/AdminPayouts"; // ← NUEVO
import AdminConfig from "@/pages/AdminConfig"; // ← NUEVO
import AdminClaims from "@/pages/AdminClaims"; // ← NUEVO
import AdminClaimDetail from "@/pages/AdminClaimDetail"; // ← NUEVO
import AdminPurchases from "@/pages/AdminPurchases"; // ← NUEVO
import AdminPurchaseDetail from "@/pages/AdminPurchaseDetail"; // ← NUEVO

// Seguridad de cuenta
import ChangePassword from "@/pages/ChangePassword";

// Pequeño error boundary para evitar la pantalla fea por defecto
function RouteError() {
  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-xl font-semibold mb-1">Ups, algo salió mal</h1>
      <p className="text-sm text-gray-600">
        La página no existe o hubo un error al cargarla. Intenta desde el menú superior.
      </p>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    errorElement: <RouteError />,
    children: [
      // Públicas
      { path: "/", element: <HomeModern /> },
      { path: "/eventos", element: <Eventos /> },
      { path: "/eventos/:id", element: <EventoDetalle /> },
      { path: "/registro", element: <Register /> },
      { path: "/login", element: <Login /> },
      { path: "/about", element: <About /> },
      { path: "/help", element: <Help /> },

      // Resultado Webpay (ruta oficial)
      { path: "/pago/resultado", element: <PaymentResult /> },
      // Alias opcional para compatibilidad con enlaces antiguos
      { path: "/payment-result", element: <PaymentResult /> },

      // Validación pública de tickets RESALE
      // Esta ruta NO requiere autenticación porque es accedida por personal de seguridad
      { path: "/resale-tickets/validate/:proxyQrCode", element: <ResaleTicketValidation /> },

      // Seguridad / cuenta
      {
        path: "/cuenta/seguridad",
        element: (
          <RequireAuth>
            <ChangePassword />
          </RequireAuth>
        ),
      },

      // Mis entradas (solo autenticado)
      {
        path: "/mis-entradas",
        element: (
          <RequireAuth>
            <MyTickets />
          </RequireAuth>
        ),
      },
      // Alias en español
      {
        path: "/mis-tickets",
        element: (
          <RequireAuth>
            <MyTickets />
          </RequireAuth>
        ),
      },

      // Mis reclamos (solo autenticado)
      {
        path: "/mis-reclamos",
        element: (
          <RequireAuth>
            <MyClaims />
          </RequireAuth>
        ),
      },
      {
        path: "/mis-reclamos/:id",
        element: (
          <RequireAuth>
            <ClaimDetail />
          </RequireAuth>
        ),
      },

      // Detalle de reserva (solo autenticado)
      {
        path: "/reservas/:id",
        element: (
          <RequireAuth>
            <ReservationDetail />
          </RequireAuth>
        ),
      },
      // Alias en inglés opcional
      {
        path: "/reservation/:id",
        element: (
          <RequireAuth>
            <ReservationDetail />
          </RequireAuth>
        ),
      },

      // Flujo “ser organizador”
      {
        path: "/solicitar-organizador",
        element: (
          <RequireAuth>
            <OrganizerApply />
          </RequireAuth>
        ),
      },
      {
        path: "/organizador/pendiente",
        element: (
          <RequireAuth>
            <OrganizerPending />
          </RequireAuth>
        ),
      },

      // Zona Organizador (verificado)
      {
        path: "/organizador",
        element: (
          <RequireAuth>
            <RequireVerifiedOrganizer>
              <OrganizerDashboard />
            </RequireVerifiedOrganizer>
          </RequireAuth>
        ),
      },
      {
        path: "/organizador/eventos",
        element: (
          <RequireAuth>
            <RequireVerifiedOrganizer>
              <OrganizerDashboard />
            </RequireVerifiedOrganizer>
          </RequireAuth>
        ),
      },
      {
        path: "/organizador/eventos/nuevo",
        element: (
          <RequireAuth>
            <RequireVerifiedOrganizer>
              <OrganizerEventForm />
            </RequireVerifiedOrganizer>
          </RequireAuth>
        ),
      },
      {
        path: "/organizador/eventos/:id/editar",
        element: (
          <RequireAuth>
            <RequireVerifiedOrganizer>
              <OrganizerEventForm />
            </RequireVerifiedOrganizer>
          </RequireAuth>
        ),
      },

      // Mis pagos (organizador)
      {
        path: "/organizador/pagos",
        element: (
          <RequireAuth>
            <RequireVerifiedOrganizer>
              <OrganizerPayouts />
            </RequireVerifiedOrganizer>
          </RequireAuth>
        ),
      },
      // Alias en inglés opcional
      {
        path: "/organizer/payouts",
        element: (
          <RequireAuth>
            <RequireVerifiedOrganizer>
              <OrganizerPayouts />
            </RequireVerifiedOrganizer>
          </RequireAuth>
        ),
      },

      // Configurar cuenta de cobro (organizador)
      {
        path: "/organizador/cuenta-cobro",
        element: (
          <RequireAuth>
            <RequireVerifiedOrganizer>
              <OrganizerPayoutSettings />
            </RequireVerifiedOrganizer>
          </RequireAuth>
        ),
      },
      // Alias en inglés
      {
        path: "/organizer/payout-settings",
        element: (
          <RequireAuth>
            <RequireVerifiedOrganizer>
              <OrganizerPayoutSettings />
            </RequireVerifiedOrganizer>
          </RequireAuth>
        ),
      },

      // Validar tickets (organizador)
      {
        path: "/organizador/validar-tickets",
        element: (
          <RequireAuth>
            <RequireVerifiedOrganizer>
              <OrganizerTicketValidator />
            </RequireVerifiedOrganizer>
          </RequireAuth>
        ),
      },

      // Zona Admin (superadmin)
      {
        path: "/admin/eventos",
        element: (
          <RequireSuperadmin>
            <AdminEvents />
          </RequireSuperadmin>
        ),
      },
      {
        path: "/admin/eventos/:id",
        element: (
          <RequireSuperadmin>
            <AdminEventDetail />
          </RequireSuperadmin>
        ),
      },
      {
        path: "/admin/usuarios",
        element: (
          <RequireSuperadmin>
            <AdminUsers />
          </RequireSuperadmin>
        ),
      },
      {
        path: "/admin/usuarios/:id",
        element: (
          <RequireSuperadmin>
            <AdminUserDetail />
          </RequireSuperadmin>
        ),
      },
      {
        path: "/admin/solicitudes-organizador",
        element: (
          <RequireSuperadmin>
            <AdminOrganizerApps />
          </RequireSuperadmin>
        ),
      },
      {
        path: "/admin/tickets",
        element: (
          <RequireSuperadmin>
            <AdminTickets />
          </RequireSuperadmin>
        ),
      },
      {
        path: "/admin/payouts", // ← NUEVO
        element: (
          <RequireSuperadmin>
            <AdminPayouts />
          </RequireSuperadmin>
        ),
      },
      {
        path: "/admin/reclamos", // ← NUEVO
        element: (
          <RequireSuperadmin>
            <AdminClaims />
          </RequireSuperadmin>
        ),
      },
      {
        path: "/admin/reclamos/:id", // ← NUEVO
        element: (
          <RequireSuperadmin>
            <AdminClaimDetail />
          </RequireSuperadmin>
        ),
      },
      {
        path: "/admin/configuracion",
        element: (
          <RequireSuperadmin>
            <AdminConfig />
          </RequireSuperadmin>
        ),
      },
      {
        path: "/admin/compras",
        element: (
          <RequireSuperadmin>
            <AdminPurchases />
          </RequireSuperadmin>
        ),
      },
      {
        path: "/admin/compras/:id",
        element: (
          <RequireSuperadmin>
            <AdminPurchaseDetail />
          </RequireSuperadmin>
        ),
      },
    ],
  },
]);













