// src/pages/MyTickets.tsx
import { Link } from 'react-router-dom';
import MyTicketsList from '@/components/MyTicketsList';

export default function MyTickets() {
  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Mis Entradas</h1>
            <p className="text-gray-600 mt-2">
              Gestiona y descarga tus entradas compradas (eventos propios y de reventa)
            </p>
          </div>
          <Link
            to="/mis-reclamos"
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Mis Reclamos
          </Link>
        </div>

        <MyTicketsList />
      </div>
    </div>
  );
}
