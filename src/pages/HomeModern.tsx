// src/pages/HomeModern.tsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import VideoBackground from "@/components/ui/VideoBackground";
import GradientCard from "@/components/ui/GradientCard";
import GlassCard from "@/components/ui/GlassCard";
import api from "@/services/api";

interface FeaturedEvent {
  id: number;
  title: string;
  date: string;
  imageUrl?: string;
  minPrice?: number;
}

export default function HomeModern() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [featuredEvents, setFeaturedEvents] = useState<FeaturedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedEvents();
  }, []);

  async function fetchFeaturedEvents() {
    try {
      setLoading(true);
      const { data } = await api.get("/events", {
        params: { page: 1, pageSize: 6, order: "DATE_ASC" },
      });
      setFeaturedEvents(data?.items || []);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/eventos?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/eventos");
    }
  }

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Buenos días";
    if (hour < 20) return "Buenas tardes";
    return "Buenas noches";
  };

  return (
    <div className="min-h-screen bg-dark-900">
      {/* Hero Section with Video Background */}
      <VideoBackground className="min-h-screen">
        <div className="min-h-screen flex flex-col">
          {/* Hero Content */}
          <div className="flex-1 flex items-center justify-center px-6 py-20">
            <div className="max-w-5xl mx-auto text-center space-y-8 animate-fade-in">
              {user && (
                <p className="text-neon-cyan text-xl font-semibold animate-slide-down">
                  {greeting()}, {user.name?.split(" ")[0] || "Usuario"}
                </p>
              )}

              <h1 className="font-display text-6xl md:text-8xl font-black text-white leading-tight">
                Vive la{" "}
                <span className="text-gradient-cyan">experiencia</span>
                <br />
                de cada evento
              </h1>

              <p className="text-xl md:text-2xl text-dark-100 max-w-2xl mx-auto leading-relaxed">
                Compra, vende y revende tus entradas de forma segura.
                <br />
                <span className="text-neon-green font-semibold">100% verificado y confiable</span>
              </p>

              {/* Search Bar */}
              <form onSubmit={handleSearch} className="max-w-3xl mx-auto mt-12">
                <GlassCard variant="light">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar eventos, artistas, ciudades..."
                      className="flex-1 bg-transparent text-white placeholder-dark-200 text-lg focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="btn-primary shrink-0 flex items-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <circle cx="11" cy="11" r="7" strokeWidth="2" />
                        <path d="M21 21l-4.35-4.35" strokeWidth="2" />
                      </svg>
                      Buscar
                    </button>
                  </div>
                </GlassCard>
              </form>

              {/* Quick Actions */}
              <div className="flex flex-wrap justify-center gap-4 pt-8">
                <Link to="/eventos" className="btn-secondary">
                  Ver todos los eventos
                </Link>
                {!user && (
                  <Link to="/login" className="btn-ghost">
                    Iniciar sesión
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="pb-12 flex justify-center animate-pulse-subtle">
            <svg className="w-8 h-8 text-white opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
        </div>
      </VideoBackground>

      {/* Main Features Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-dark-900 to-dark-800">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-5xl font-display font-bold text-white text-center mb-16 animate-slide-up">
            Todo lo que necesitas
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <GradientCard
              title="Eventos"
              description="Descubre los mejores conciertos, festivales y shows en todo Chile. Entradas 100% verificadas."
              gradient="cyan"
              to="/eventos"
            />

            <GradientCard
              title="Mis Entradas"
              description="Gestiona tus entradas en un solo lugar. Descárgalas, accede a toda la información de tus reservas y participa en reventas."
              gradient="pink"
              to={user ? "/mis-entradas" : "/login?redirect=/mis-entradas"}
            />

            <GradientCard
              title="Soporte"
              description="¿Tienes dudas? Nuestro equipo está listo para ayudarte 24/7. Reclamos y consultas resueltas rápido."
              gradient="purple"
              to="/help"
            />
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-24 px-6 bg-dark-900">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-4">
            <h2 className="text-5xl font-display font-bold text-white">
              ¿Cómo funciona <span className="text-gradient-cyan">ConfíaTicket</span>?
            </h2>
            <p className="text-xl text-dark-200 max-w-3xl mx-auto leading-relaxed">
              Compra tus entradas en línea, descárgalas desde "Mis Entradas" y accede sin filas.
              Los organizadores pueden crear reventas seguras. ConfíaTicket te conecta con la 
              emoción de cada evento de forma segura y verificada.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <GlassCard className="text-center space-y-4 hover-lift">
              <div className="w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">1. Compra en línea</h3>
              <p className="text-dark-200 text-sm">
                Selecciona tu evento favorito y compra de forma segura con Webpay
              </p>
            </GlassCard>

            <GlassCard className="text-center space-y-4 hover-lift">
              <div className="w-16 h-16 rounded-full bg-neon-pink/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">2. Descarga tus entradas</h3>
              <p className="text-dark-200 text-sm">
                Accede a "Mis Entradas" y descarga tus tickets con códigos QR únicos
              </p>
            </GlassCard>

            <GlassCard className="text-center space-y-4 hover-lift">
              <div className="w-16 h-16 rounded-full bg-neon-purple/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">3. Accede sin filas</h3>
              <p className="text-dark-200 text-sm">
                Presenta tu QR en la entrada. Validación instantánea, sin esperas
              </p>
            </GlassCard>

            <GlassCard className="text-center space-y-4 hover-lift">
              <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">4. Revende seguro</h3>
              <p className="text-dark-200 text-sm">
                Los organizadores pueden crear reventas de forma transparente y verificada
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      {!loading && featuredEvents.length > 0 && (
        <section className="py-24 px-6 bg-dark-800">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-12">
              <h2 className="text-5xl font-display font-bold text-white">
                Próximos eventos
              </h2>
              <Link
                to="/eventos"
                className="text-neon-cyan font-semibold hover:underline flex items-center gap-2"
              >
                Ver todos
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredEvents.slice(0, 6).map((event) => (
                <Link
                  key={event.id}
                  to={`/eventos/${event.id}`}
                  className="card-modern hover-lift group"
                >
                  {event.imageUrl && (
                    <div className="aspect-video rounded-xl overflow-hidden mb-4">
                      <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  )}
                  <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-neon-cyan transition-colors">
                    {event.title}
                  </h3>
                  <p className="text-dark-200 mb-3">
                    {new Date(event.date).toLocaleDateString("es-CL", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {event.minPrice && (
                    <p className="text-neon-green font-semibold text-lg">
                      Desde ${event.minPrice.toLocaleString("es-CL")}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-dark-800 to-dark-900">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-5xl md:text-6xl font-display font-bold text-white">
            ¿Eres organizador de eventos?
          </h2>
          <p className="text-xl text-dark-200">
            Publica tus eventos, gestiona ventas y llega a miles de personas.
            <br />
            <span className="text-neon-cyan font-semibold">Comienza gratis hoy</span>
          </p>
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link 
              to={user ? "/organizer-application" : "/login?redirect=/organizer-application"} 
              className="btn-primary text-lg px-8 py-4"
            >
              Solicitar ser organizador
            </Link>
            <Link to="/about" className="btn-secondary text-lg px-8 py-4">
              Conocer más
            </Link>
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="py-16 px-6 bg-dark-900 border-t border-dark-700">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="space-y-2">
              <p className="text-4xl font-bold text-neon-cyan">100%</p>
              <p className="text-dark-200">Seguro</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl font-bold text-neon-green">24/7</p>
              <p className="text-dark-200">Soporte</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl font-bold text-neon-pink">10k+</p>
              <p className="text-dark-200">Usuarios</p>
            </div>
            <div className="space-y-2">
              <p className="text-4xl font-bold text-neon-purple">500+</p>
              <p className="text-dark-200">Eventos</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
