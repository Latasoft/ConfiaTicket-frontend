// src/pages/MyTickets.tsx
import MyTicketsList from '@/components/MyTicketsList';

export default function MyTickets() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Mis Entradas</h1>
          <p className="text-gray-600 mt-2">
            Gestiona y descarga tus entradas compradas (eventos propios y de reventa)
          </p>
        </div>

        <MyTicketsList />
      </div>
    </div>
  );
}
