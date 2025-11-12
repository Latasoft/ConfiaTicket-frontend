/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Dark theme base colors
        dark: {
          900: "#0a0a0a", // Negro profundo
          800: "#1a1a1a", // Gris muy oscuro
          700: "#2a2a2a", // Gris oscuro
          600: "#3a3a3a", // Gris medio-oscuro
          500: "#4a4a4a", // Gris medio
          400: "#666666", // Gris
          300: "#888888", // Gris claro
          200: "#aaaaaa", // Gris muy claro
          100: "#e0e0e0", // Casi blanco
        },
        // Vibrant accent colors (Lollapalooza-inspired)
        neon: {
          cyan: "#00d9ff",
          pink: "#ff006e",
          purple: "#8338ec",
          green: "#06ffa5",
          yellow: "#ffbe0b",
          orange: "#fb5607",
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
        "gradient-neon-cyan": "linear-gradient(135deg, #00d9ff 0%, #0099cc 100%)",
        "gradient-neon-pink": "linear-gradient(135deg, #ff006e 0%, #cc0055 100%)",
        "gradient-neon-purple": "linear-gradient(135deg, #8338ec 0%, #6528d7 100%)",
        "gradient-neon-green": "linear-gradient(135deg, #06ffa5 0%, #05cc84 100%)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["Montserrat", "Inter", "sans-serif"],
      },
      backdropBlur: {
        xs: "2px",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-in-out",
        "slide-up": "slideUp 0.6s ease-out",
        "slide-down": "slideDown 0.6s ease-out",
        "scale-in": "scaleIn 0.4s ease-out",
        "glow": "glow 2s ease-in-out infinite alternate",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(0, 217, 255, 0.5)" },
          "100%": { boxShadow: "0 0 20px rgba(0, 217, 255, 0.8)" },
        },
      },
    },
  },
  plugins: [],
};


