// src/data/faqs.ts
export type FAQ = {
  q: string;
  a: string;
  tags?: string[];
};

export const faqs: FAQ[] = [
  // Compra y pagos
  {
    q: "¿Cómo compro entradas?",
    a: "Ve a 'Eventos', entra al evento, elige la cantidad en la caja de compra y completa el pago. Recibirás el comprobante por email y podrás ver tus tickets en 'Mis compras'.",
    tags: ["comprar", "ticket", "pagar", "checkout", "carrito"]
  },
  {
    q: "¿Qué métodos de pago aceptan?",
    a: "Tarjetas de crédito/débito y otros métodos habilitados por el organizador. Si tu método no aparece, contáctanos para revisar opciones.",
    tags: ["tarjeta", "pago", "transferencia", "webpay", "onepay"]
  },
  {
    q: "¿Puedo pagar en efectivo o transferencia?",
    a: "Depende de cada evento. Si está habilitado, verás la opción en el paso de pago con instrucciones.",
    tags: ["efectivo", "transferencia", "pago manual"]
  },
  {
    q: "¿Hay cargos o comisiones?",
    a: "Algunos eventos incluyen una comisión por servicio que se muestra antes de confirmar tu compra.",
    tags: ["comisión", "cargo", "fee", "servicio"]
  },
  {
    q: "¿Se reserva mi entrada cuando la pongo en el carrito?",
    a: "Sí, por un tiempo limitado durante el proceso de pago. Si el tiempo expira, las entradas vuelven a estar disponibles.",
    tags: ["reserva", "tiempo", "carrito", "contador"]
  },
  {
    q: "Me cobró dos veces, ¿qué hago?",
    a: "Revisa si tienes dos correos de confirmación. Si no, escríbenos con el comprobante bancario y el correo de tu cuenta para revertir el cobro duplicado.",
    tags: ["doble cobro", "duplicado", "cargo repetido", "reverso"]
  },

  // Entradas y acceso
  {
    q: "¿Dónde veo mis entradas compradas?",
    a: "En tu perfil, sección 'Mis compras'. Ahí puedes ver y descargar tus tickets con su código QR.",
    tags: ["mis compras", "historial", "descargar", "tickets", "qr"]
  },
  {
    q: "¿Cómo descargo o imprimo mi entrada?",
    a: "Desde 'Mis compras' abre el detalle del pedido y usa 'Descargar'. Puedes mostrar el QR en tu celular o imprimirlo.",
    tags: ["imprimir", "pdf", "qr", "mostrar en teléfono"]
  },
  {
    q: "Mi QR no se ve o está borroso",
    a: "Aumenta el brillo de la pantalla o descarga el PDF para mostrarlo a tamaño completo. Evita capturas de pantalla muy comprimidas.",
    tags: ["qr", "escaneo", "lector", "entrada"]
  },
  {
    q: "¿Puedo transferir mi entrada a otra persona?",
    a: "Si el organizador lo permite, verás el botón 'Transferir' en el detalle de tu compra. Ingresa el nombre y correo del nuevo titular.",
    tags: ["transferir", "cambiar titular", "cesión", "regalo", "nombre"]
  },
  {
    q: "¿Hay límite de entradas por compra?",
    a: "Sí, para evitar reventas el sistema limita la cantidad por pedido. Verás el máximo disponible al comprar.",
    tags: ["límite", "máximo", "cantidad", "compra"]
  },
  {
    q: "Las entradas están agotadas",
    a: "Cuando un evento se agota ya no hay tickets disponibles. Algunos organizadores liberan cupos extra cerca de la fecha; te sugerimos revisar el evento periódicamente.",
    tags: ["agotado", "sold out", "no hay entradas"]
  },

  // Reembolsos y cambios
  {
    q: "¿Puedo pedir reembolso?",
    a: "Depende de la política del organizador. Si está disponible, verás la opción en el detalle de tu compra o podrás solicitarlo por soporte.",
    tags: ["devolución", "reembolso", "cancelación", "política"]
  },
  {
    q: "¿Qué pasa si el evento se cancela o reprograma?",
    a: "Te informaremos por email. El organizador definirá reprogramación o reembolso y te daremos los pasos para optar.",
    tags: ["cancelado", "reprogramado", "devolución"]
  },

  // Cuenta y seguridad
  {
    q: "¿Cómo creo mi cuenta?",
    a: "Ve a 'Registrarse', completa tus datos y confirma tu correo. Podrás iniciar sesión y comprar entradas.",
    tags: ["registro", "signup", "crear cuenta"]
  },
  {
    q: "No puedo iniciar sesión",
    a: "Verifica tu email y contraseña. Si olvidaste la clave, usa 'Olvidé mi contraseña' para restablecerla.",
    tags: ["login", "iniciar sesión", "Error", "clave"]
  },
  {
    q: "¿Cómo cambio mi contraseña?",
    a: "Desde tu perfil elige 'Cambiar contraseña'. Si la olvidaste, usa la opción de recuperación en la pantalla de login.",
    tags: ["clave", "password", "restablecer", "recuperar"]
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Usamos conexiones cifradas y buenas prácticas de seguridad. No almacenamos la información completa de tus tarjetas.",
    tags: ["seguridad", "datos", "privacidad", "pago seguro"]
  },

  // Requisitos del evento
  {
    q: "¿Hay edad mínima para ingresar?",
    a: "Cada evento define sus requisitos. Revisa la ficha del evento; si es +18 o similar, se solicitará documento de identidad.",
    tags: ["edad", "+18", "menores", "ingreso"]
  },
  {
    q: "¿Se permite el reingreso?",
    a: "Depende del organizador y del recinto. Si está permitido, se indicará en la información del evento.",
    tags: ["reingreso", "sellos", "pulseras"]
  },
  {
    q: "¿El lugar es accesible para personas con movilidad reducida?",
    a: "Cuando el recinto informa accesibilidad, lo indicamos en la ficha del evento. Si tienes un requerimiento específico, contáctanos.",
    tags: ["accesibilidad", "silla de ruedas", "rampa"]
  },
  {
    q: "¿Puedo llevar alimentos o bebidas?",
    a: "Generalmente no, salvo que el organizador lo indique. Revisa la ficha del evento para ver los ítems permitidos.",
    tags: ["alimentos", "bebidas", "permitido", "prohibido"]
  },

  // Organizadores
  {
    q: "Soy organizador: ¿cómo creo un evento?",
    a: "Crea o activa tu cuenta de organizador. Luego ve a 'Mi panel' → 'Crear evento', completa el formulario y guarda. Podrás editar y publicar cuando esté listo.",
    tags: ["organizador", "crear evento", "publicar", "panel"]
  },
  {
    q: "¿Cómo veo las ventas de mi evento?",
    a: "En tu panel de organizador encontrarás el dashboard con ventas, asistentes y descargas de reportes.",
    tags: ["ventas", "dashboard", "reporte", "organizador"]
  },

  // Documentos y boletas
  {
    q: "¿Entregan boleta o factura?",
    a: "El comprobante se envía por email al completar el pago. La emisión de boleta o factura depende del organizador y el método de pago utilizado.",
    tags: ["boleta", "factura", "comprobante"]
  },

  // Soporte
  {
    q: "Necesito ayuda, ¿cómo los contacto?",
    a: "Escríbenos desde el formulario de ayuda del evento o a soporte indicando tu correo de cuenta y número de pedido.",
    tags: ["soporte", "contacto", "ayuda", "ticket de soporte"]
  }
];

