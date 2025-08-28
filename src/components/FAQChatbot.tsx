// src/components/FAQChatbot.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import Fuse from "fuse.js";
import { faqs } from "../data/faqs";
import type { FAQ } from "../data/faqs";

type Msg = { role: "user" | "bot"; text: string; ts: number };

type ThemeName = "blue" | "indigo" | "emerald" | "violet" | "rose" | "amber";
const THEMES: Record<
  ThemeName,
  {
    btn: string; // botones primarios
    btnHover: string;
    link: string; // links/acciones
    ring: string; // focus ring
    userBubble: string; // burbuja del usuario
  }
> = {
  blue: {
    btn: "bg-blue-600",
    btnHover: "hover:bg-blue-700",
    link: "text-blue-600",
    ring: "focus:ring-blue-200",
    userBubble: "bg-blue-600 text-white"
  },
  indigo: {
    btn: "bg-indigo-600",
    btnHover: "hover:bg-indigo-700",
    link: "text-indigo-600",
    ring: "focus:ring-indigo-200",
    userBubble: "bg-indigo-600 text-white"
  },
  emerald: {
    btn: "bg-emerald-600",
    btnHover: "hover:bg-emerald-700",
    link: "text-emerald-600",
    ring: "focus:ring-emerald-200",
    userBubble: "bg-emerald-600 text-white"
  },
  violet: {
    btn: "bg-violet-600",
    btnHover: "hover:bg-violet-700",
    link: "text-violet-600",
    ring: "focus:ring-violet-200",
    userBubble: "bg-violet-600 text-white"
  },
  rose: {
    btn: "bg-rose-600",
    btnHover: "hover:bg-rose-700",
    link: "text-rose-600",
    ring: "focus:ring-rose-200",
    userBubble: "bg-rose-600 text-white"
  },
  amber: {
    btn: "bg-amber-500",
    btnHover: "hover:bg-amber-600",
    link: "text-amber-600",
    ring: "focus:ring-amber-200",
    userBubble: "bg-amber-500 text-white"
  }
};

const STORAGE_KEY = "faq_chat_history_v1";
const DEFAULT_THEME: ThemeName = "blue";

function useFuse(data: FAQ[]) {
  return useMemo(
    () =>
      new Fuse<FAQ>(data, {
        includeScore: true,
        minMatchCharLength: 2,
        ignoreLocation: true,
        threshold: 0.4, // 0 exacto, 1 muy difuso
        keys: ["q", "a", "tags"]
      }),
    [data]
  );
}

export default function FAQChatbot({ theme = DEFAULT_THEME }: { theme?: ThemeName }) {
  const T = THEMES[theme];
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const fuse = useFuse(faqs);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Cargar historial
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setMsgs(JSON.parse(raw));
      } catch {
        setMsgs([
          {
            role: "bot",
            text:
              "¡Hola! Soy el asistente de ayuda. Pregúntame sobre compras, reembolsos, pagos o cómo crear eventos. También puedes tocar una sugerencia 👇",
            ts: Date.now()
          }
        ]);
      }
    } else {
      setMsgs([
        {
          role: "bot",
          text:
            "¡Hola! Soy el asistente de ayuda. Pregúntame sobre compras, reembolsos, pagos o cómo crear eventos. También puedes tocar una sugerencia 👇",
          ts: Date.now()
        }
      ]);
    }
  }, []);

  // Guardar historial y hacer autoscroll
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs));
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs]);

  // Atajos de teclado: ? abre/cierra, Esc cierra
  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      const editable = target.getAttribute("contenteditable");
      return tag === "input" || tag === "textarea" || editable === "true";
    }

    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      // "?" en la mayoría de layouts es Shift + "/"
      const pressedQuestion =
        e.key === "?" || (e.key === "/" && e.shiftKey === true);

      if (pressedQuestion) {
        e.preventDefault();
        setOpen(o => !o);
        return;
      }
      if (e.key === "Escape" && open) {
        e.preventDefault();
        setOpen(false);
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const suggestions = useMemo(
    () => [
      "¿Cómo compro entradas?",
      "¿Puedo pedir reembolso?",
      "¿Qué métodos de pago aceptan?",
      "¿Cómo creo un evento?"
    ],
    []
  );

  function answer(query: string) {
    const results = fuse.search(query);

    if (!results.length) {
      return {
        text:
          "No encontré una respuesta exacta 🤔. Intenta con otras palabras o cuéntanos tu caso en detalle. " +
          "Si quieres, deja un mensaje para soporte y te contactamos.",
        isFallback: true
      };
    }

    const top = results[0];
    const related = results.slice(1, 3);

    let text = `**${top.item.q}**\n${top.item.a}`;
    if (related.length) {
      text +=
        "\n\nTambién te puede servir:\n" +
        related.map(r => `• ${r.item.q}`).join("\n");
    }

    return { text, isFallback: false };
  }

  async function onSend(queryRaw?: string) {
    const query = (queryRaw ?? input).trim();
    if (!query || busy) return;

    setBusy(true);
    setMsgs(m => [...m, { role: "user", text: query, ts: Date.now() }]);

    const { text } = answer(query);

    // Pequeña latencia para UX
    await new Promise(r => setTimeout(r, 250));

    setMsgs(m => [...m, { role: "bot", text, ts: Date.now() }]);
    setInput("");
    setBusy(false);
  }

  function clearChat() {
    setMsgs([
      {
        role: "bot",
        text:
          "Historial borrado. ¿En qué te ayudo? Puedes preguntar por compras, reembolsos, pagos o gestión de eventos.",
        ts: Date.now()
      }
    ]);
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        aria-label="Abrir chat de ayuda"
        title="Abrir chat de ayuda (atajo: ?)"
        className={`fixed bottom-4 right-4 z-50 rounded-full shadow-lg px-4 py-3 text-white transition ${T.btn} ${T.btnHover}`}
        onClick={() => setOpen(o => !o)}
      >
        {open ? "Cerrar" : "Ayuda"}
      </button>

      {/* Ventana del chat */}
      {open && (
        <div className="fixed bottom-20 right-4 z-50 w-96 max-w-[95vw] h-[520px] bg-white border rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center justify-between bg-gray-50">
            <div className="font-semibold">Asistente – Preguntas frecuentes</div>
            <div className="flex items-center gap-2">
              <button
                className={`text-sm hover:underline ${T.link}`}
                onClick={clearChat}
              >
                Borrar
              </button>
              <button
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>
          </div>

          <div
            ref={listRef}
            className="flex-1 overflow-y-auto p-3 space-y-3 bg-white"
          >
            {msgs.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] whitespace-pre-wrap text-sm rounded-2xl px-3 py-2 ${
                    m.role === "user"
                      ? `${T.userBubble} rounded-br-sm`
                      : "bg-gray-100 text-gray-900 rounded-bl-sm"
                  }`}
                >
                  {/* Render simple de negritas **...** */}
                  {m.text.split("**").map((chunk, idx) =>
                    idx % 2 === 1 ? (
                      <strong key={idx}>{chunk}</strong>
                    ) : (
                      <span key={idx}>{chunk}</span>
                    )
                  )}
                </div>
              </div>
            ))}

            {/* Sugerencias rápidas */}
            {msgs.length < 4 && (
              <div className="mt-2">
                <div className="text-xs text-gray-500 mb-2">Sugerencias rápidas:</div>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map(s => (
                    <button
                      key={s}
                      onClick={() => onSend(s)}
                      className="text-xs border rounded-full px-2 py-1 hover:bg-gray-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={e => {
              e.preventDefault();
              onSend();
            }}
            className="p-3 border-t bg-white"
          >
            <div className="flex gap-2">
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Escribe tu pregunta…"
                className={`flex-1 border rounded-xl px-3 py-2 text-sm focus:outline-none ${T.ring}`}
              />
              <button
                disabled={busy || !input.trim()}
                className={`px-4 py-2 rounded-xl text-white disabled:opacity-50 ${T.btn} ${T.btnHover}`}
              >
                Enviar
              </button>
            </div>
            <div className="mt-2 text-[11px] text-gray-400">
              Respuestas basadas en las FAQ del sitio. Sin IA ni envío de datos. (Atajo: <strong>?</strong>)
            </div>
          </form>
        </div>
      )}
    </>
  );
}


