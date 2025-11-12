// src/pages/Help.tsx
import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";

export default function Help() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Construir mensaje de WhatsApp
    const whatsappNumber = "56912345678"; // ⚠️ CAMBIAR POR TU NÚMERO
    const message = `*Consulta desde ConfíaTicket*\n\n` +
      `*Nombre:* ${formData.name}\n` +
      `*Email:* ${formData.email}\n` +
      `*Teléfono:* ${formData.phone}\n\n` +
      `*Mensaje:*\n${formData.message}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
    
    // Abrir WhatsApp
    window.open(whatsappUrl, "_blank");
    
    // Limpiar formulario
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-dark-900 py-16 px-6">
      <div className="max-w-5xl mx-auto space-y-12">
        {/* Hero */}
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-display font-bold text-white">
            Centro de <span className="text-gradient-cyan">Ayuda</span>
          </h1>
          <p className="text-xl text-dark-200 max-w-2xl mx-auto">
            ¿Tienes dudas? Estamos aquí para ayudarte 24/7
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a
            href="https://wa.me/56912345678"
            target="_blank"
            rel="noopener noreferrer"
            className="card-modern hover-lift group"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-neon-green/20 flex items-center justify-center group-hover:bg-neon-green/30 transition-colors">
                <svg className="w-8 h-8 text-neon-green" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">WhatsApp</h3>
                <p className="text-dark-200 text-sm">Respuesta inmediata</p>
              </div>
            </div>
          </a>

          <a
            href="mailto:soporte@confiaticket.cl"
            className="card-modern hover-lift group"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-neon-pink/20 flex items-center justify-center group-hover:bg-neon-pink/30 transition-colors">
                <svg className="w-8 h-8 text-neon-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Email</h3>
                <p className="text-dark-200 text-sm">soporte@confiaticket.cl</p>
              </div>
            </div>
          </a>

          <div className="card-modern">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-neon-cyan/20 flex items-center justify-center">
                <svg className="w-8 h-8 text-neon-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Horario</h3>
                <p className="text-dark-200 text-sm">24/7 disponible</p>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <GlassCard className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-display font-bold text-white mb-2">
                Contáctanos por WhatsApp
              </h2>
              <p className="text-dark-200">
                Completa el formulario y te redirigiremos a WhatsApp para una respuesta inmediata
              </p>
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-white mb-2">
                Nombre completo *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                className="input-modern"
                placeholder="Tu nombre"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white mb-2">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="input-modern"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-white mb-2">
                Teléfono *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                required
                value={formData.phone}
                onChange={handleChange}
                className="input-modern"
                placeholder="+56 9 1234 5678"
              />
            </div>

            <div>
              <label htmlFor="message" className="block text-sm font-medium text-white mb-2">
                Mensaje *
              </label>
              <textarea
                id="message"
                name="message"
                required
                value={formData.message}
                onChange={handleChange}
                rows={5}
                className="input-modern resize-none"
                placeholder="Describe tu consulta o problema..."
              />
            </div>

            <button type="submit" className="btn-primary w-full text-lg flex items-center justify-center gap-2">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Enviar por WhatsApp
            </button>
          </form>
        </GlassCard>

        {/* FAQ Quick Links */}
        <div className="space-y-6">
          <h2 className="text-3xl font-display font-bold text-white text-center">
            Preguntas Frecuentes
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassCard className="space-y-2">
              <h3 className="text-lg font-bold text-white">¿Cómo compro una entrada?</h3>
              <p className="text-dark-200 text-sm">
                Busca el evento, selecciona tus entradas, paga con Webpay y recibirás el QR por email.
              </p>
            </GlassCard>

            <GlassCard className="space-y-2">
              <h3 className="text-lg font-bold text-white">¿Puedo revender mi entrada?</h3>
              <p className="text-dark-200 text-sm">
                Sí, ingresa a "Mis Tickets" y marca la entrada como "En venta". Otros usuarios podrán comprarla.
              </p>
            </GlassCard>

            <GlassCard className="space-y-2">
              <h3 className="text-lg font-bold text-white">¿Es seguro?</h3>
              <p className="text-dark-200 text-sm">
                100% seguro. Usamos Webpay para pagos y validamos cada entrada con códigos QR únicos.
              </p>
            </GlassCard>

            <GlassCard className="space-y-2">
              <h3 className="text-lg font-bold text-white">¿Qué pasa si hay un problema?</h3>
              <p className="text-dark-200 text-sm">
                Contáctanos por WhatsApp o email. Nuestro equipo responde en menos de 1 hora.
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
