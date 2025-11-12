import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import SocialIcons from './SocialIcons';

export default function Footer() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleOrganizerClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!user) {
      navigate('/login?redirect=/organizer-application');
    } else {
      navigate('/organizer-application');
    }
  };
  return (
    <footer className="bg-dark-900 border-t border-dark-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="text-2xl font-bold">
              <span className="bg-gradient-to-r from-neon-cyan to-neon-purple bg-clip-text text-transparent">
                ConfíaTicket
              </span>
            </Link>
            <p className="text-dark-200 text-sm">
              La plataforma de confianza para comprar y vender tickets de eventos de forma segura.
            </p>
            <SocialIcons iconSize="md" className="pt-2" />
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Enlaces Rápidos</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/eventos" className="text-dark-200 hover:text-neon-cyan transition-colors text-sm">
                  Eventos
                </Link>
              </li>
              <li>
                <Link to="/about" className="text-dark-200 hover:text-neon-cyan transition-colors text-sm">
                  Nosotros
                </Link>
              </li>
              <li>
                <Link to="/help" className="text-dark-200 hover:text-neon-cyan transition-colors text-sm">
                  Ayuda
                </Link>
              </li>
              <li>
                <a 
                  href="/organizer-application" 
                  onClick={handleOrganizerClick}
                  className="text-dark-200 hover:text-neon-cyan transition-colors text-sm cursor-pointer"
                >
                  Ser Organizador
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-dark-200 hover:text-neon-cyan transition-colors text-sm">
                  Términos y Condiciones
                </a>
              </li>
              <li>
                <a href="#" className="text-dark-200 hover:text-neon-cyan transition-colors text-sm">
                  Política de Privacidad
                </a>
              </li>
              <li>
                <a href="#" className="text-dark-200 hover:text-neon-cyan transition-colors text-sm">
                  Política de Devoluciones
                </a>
              </li>
              <li>
                <a href="#" className="text-dark-200 hover:text-neon-cyan transition-colors text-sm">
                  Política de Cookies
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4">Contacto</h3>
            <ul className="space-y-2 text-sm text-dark-200">
              <li>
                <a 
                  href="mailto:contacto@confiaticket.cl" 
                  className="hover:text-neon-cyan transition-colors"
                >
                  contacto@confiaticket.cl
                </a>
              </li>
              <li>
                <a 
                  href="https://wa.me/56912345678" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="hover:text-neon-cyan transition-colors"
                >
                  +56 9 1234 5678
                </a>
              </li>
              <li className="text-dark-300">
                Soporte 24/7
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-dark-700 mt-8 pt-8 text-center">
          <p className="text-dark-300 text-sm">
            © {new Date().getFullYear()} ConfíaTicket. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
