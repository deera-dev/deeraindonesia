/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}", "../../packages/shared/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        headline: ["Braise", "serif"],
        script: ["Hallrack", "cursive"],
        editorial: ["TheFabricant", "sans-serif"],
      },
      colors: {
        brand: {
          gold: "#cab170",
          "gold-dim": "#a8925a",
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
        },
      },
      // Animasi ringan (Analytics Phase 5 — Dashboard Polish). Dipakai untuk
      // transisi fade-in halus saat konten tab berganti (lihat
      // features/analytics/components/AnalyticsPage.jsx) — durasi pendek
      // (250ms) dan HANYA opacity (tidak ada gerakan/transform besar) sesuai
      // instruksi "animation ringan", bukan animasi mencolok.
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
