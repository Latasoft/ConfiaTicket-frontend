// src/pages/About.tsx
import { Link } from "react-router-dom";
import GlassCard from "@/components/ui/GlassCard";

export default function About() {
  return (
    <div className="min-h-screen bg-dark-900 py-16 px-6">
      <div className="max-w-4xl mx-auto space-y-16">
        {/* Hero Section */}
        <div className="text-center space-y-6 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-display font-bold text-white">
            Sobre <span className="text-gradient-cyan">ConfíaTicket</span>
          </h1>
          <p className="text-xl text-dark-200 max-w-2xl mx-auto leading-relaxed">
            La plataforma más confiable para comprar, vender y revender entradas a eventos en Chile.
          </p>
        </div>

        {/* Mission */}
        <GlassCard className="space-y-4">
          <h2 className="text-3xl font-display font-bold text-white">Nuestra Misión</h2>
          <p className="text-lg text-dark-200 leading-relaxed">
            Conectar a las personas con las experiencias que aman de forma segura, transparente y accesible.
            Creemos que cada evento merece ser vivido sin complicaciones, y que cada entrada debe llegar
            a manos de quien realmente quiere asistir.
          </p>
        </GlassCard>

        {/* How it works */}
        <div className="space-y-8">
          <h2 className="text-4xl font-display font-bold text-white text-center">
            ¿Cómo funciona ConfíaTicket?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <GlassCard className="space-y-4 hover-lift">
              <div className="w-12 h-12 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">1. Compra en línea</h3>
              <p className="text-dark-200">
                Explora eventos, selecciona tus entradas y paga de forma segura con Webpay.
                Todo el proceso es rápido y protegido.
              </p>
            </GlassCard>

            <GlassCard className="space-y-4 hover-lift">
              <div className="w-12 h-12 rounded-full bg-neon-pink/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">2. Descarga tus entradas</h3>
              <p className="text-dark-200">
                Accede a "Mis Entradas" en tu cuenta y descarga tus tickets en PDF con códigos QR únicos y verificados.
                Guárdalos en tu móvil o imprímelos.
              </p>
            </GlassCard>

            <GlassCard className="space-y-4 hover-lift">
              <div className="w-12 h-12 rounded-full bg-neon-purple/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">3. Accede sin filas</h3>
              <p className="text-dark-200">
                Presenta tu QR en la entrada del evento. Validación instantánea, sin papeles ni esperas.
                Entra directo a disfrutar.
              </p>
            </GlassCard>

            <GlassCard className="space-y-4 hover-lift">
              <div className="w-12 h-12 rounded-full bg-neon-green/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-neon-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">4. Revende de forma segura</h3>
              <p className="text-dark-200">
                Los organizadores pueden crear reventas de entradas en la plataforma de forma segura y transparente.
                Sistema verificado para compradores y vendedores.
              </p>
            </GlassCard>
          </div>
        </div>

        {/* Why choose us */}
        <div className="space-y-8">
          <h2 className="text-4xl font-display font-bold text-white text-center">
            ¿Por qué elegir ConfíaTicket?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">100% Seguro</h3>
              <p className="text-dark-200">
                Todas las transacciones están protegidas. Verificación de entradas y garantía de reembolso.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-neon-pink/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Súper rápido</h3>
              <p className="text-dark-200">
                Compra en segundos, recibe tus entradas al instante. Sin complicaciones ni demoras.
              </p>
            </div>

            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-neon-purple/20 flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-neon-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white">Soporte 24/7</h3>
              <p className="text-dark-200">
                Nuestro equipo está disponible todo el día para ayudarte con cualquier duda o problema.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center space-y-6 pt-8">
          <h2 className="text-3xl font-display font-bold text-white">
            ¿Listo para comenzar?
          </h2>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/eventos" className="btn-primary text-lg px-8 py-4">
              Ver eventos
            </Link>
            <Link to="/registro" className="btn-secondary text-lg px-8 py-4">
              Crear cuenta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
