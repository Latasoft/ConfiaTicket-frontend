// src/routes/AppRouter.tsx
import { createBrowserRouter } from "react-router-dom";

// Layout
import AppLayout from "@/layout/AppLayout";

// Páginas públicas
import Home from "@/pages/Home";
import Eventos from "@/pages/Eventos";
import EventoDetalle from "@/pages/EventoDetalle";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
// Resultado Webpay
import PaymentResult from "@/pages/PaymentResult";

// Flujo organizador
import OrganizerApply from "@/pages/OrganizerApply";
import OrganizerPending from "@/pages/OrganizerPending";
import OrganizerDashboard from "@/pages/OrganizerDashboard";
import OrganizerEventForm from "@/pages/OrganizerEventForm";
import OrganizerTickets from "@/pages/OrganizerTickets";
import OrganizerPayoutSettings from "@/pages/OrganizerPayoutSettings";
import OrganizerPayouts from "@/pages/OrganizerPayouts";

// Mis entradas (comprador)
import MyTickets from "@/pages/MyTickets";
import ReservationDetail from "@/pages/ReservationDetail"; // ← NUEVO

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
      { path: "/", element: <Home /> },
      { path: "/eventos", element: <Eventos /> },
      { path: "/eventos/:id", element: <EventoDetalle /> },
      { path: "/registro", element: <Register /> },
      { path: "/login", element: <Login /> },

      // Resultado Webpay (ruta oficial)
      { path: "/pago/resultado", element: <PaymentResult /> },
      // Alias opcional para compatibilidad con enlaces antiguos
      { path: "/payment-result", element: <PaymentResult /> },

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
      {
        path: "/organizador/entradas",
        element: (
          <RequireAuth>
            <RequireVerifiedOrganizer>
              <OrganizerTickets />
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
    ],
  },
]);













