import { accentColors, statusColors } from "../../packages/shared/tailwind.status.js";

export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
    "../../packages/shared/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        headline: ["Braise", "serif"],
        script: ["Hallrack", "cursive"],
        editorial: ["TheFabricant", "sans-serif"],
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Manrope", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ...statusColors,
        brand: {
          gold: "#cab170",
          "gold-dim": "#a8925a",
        },
        aurum: {
          bg: "rgb(var(--bg) / <alpha-value>)",
          surface: "rgb(var(--surface) / <alpha-value>)",
          "surface-raised": "rgb(var(--surface-raised) / <alpha-value>)",
          border: "rgb(var(--border) / <alpha-value>)",
          "border-strong": "rgb(var(--border-strong) / <alpha-value>)",
          text: "rgb(var(--text) / <alpha-value>)",
          "text-muted": "rgb(var(--text-muted) / <alpha-value>)",
          accent: "rgb(var(--accent) / <alpha-value>)",
          "accent-hover": "rgb(var(--accent-hover) / <alpha-value>)",
          "accent-soft": "var(--accent-soft)",
          "on-accent": "rgb(var(--on-accent) / <alpha-value>)",
          success: "rgb(var(--success) / <alpha-value>)",
          "success-soft": "var(--success-soft)",
          danger: "rgb(var(--danger) / <alpha-value>)",
          "danger-soft": "var(--danger-soft)",
          warning: "rgb(var(--warning) / <alpha-value>)",
          "warning-soft": "var(--warning-soft)",
        },
        skin: {
          page: "var(--skin-page)",
          card: "var(--skin-card)",
          raised: "var(--skin-raised)",
          input: "var(--skin-input)",
          gold: "var(--skin-gold)",
          "gold-deep": "var(--skin-gold-deep)",
          bdr: "var(--skin-bdr)",
          "bdr-lt": "var(--skin-bdr-lt)",
          "bdr-gold": "var(--skin-bdr-gold)",
          text: "var(--skin-text)",
          text2: "var(--skin-text2)",
          text3: "var(--skin-text3)",
          text4: "var(--skin-text4)",
          "hover-gold": "var(--skin-hover-gold)",
          "active-gold": "var(--skin-active-gold)",
          divider: "var(--skin-divider)",
          ...accentColors,
        },
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
