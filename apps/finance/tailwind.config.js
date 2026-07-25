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
        // Redesign 2026-07 (v2 — pendekatan diganti dari unicode-range
        // override ke class terpisah): dulu dicoba "font-headline"/
        // "font-editorial" tetap dipakai tapi dengan @font-face
        // unicode-range override untuk digit 0-9 saja. Browser LOAD
        // font itu dengan benar (terverifikasi via document.fonts), tapi
        // hasil visualnya di production tidak berubah untuk user — jadi
        // didekati ulang dengan cara paling eksplisit: class font
        // TERPISAH ("font-numeric") yang dipasang langsung ke elemen
        // yang menampilkan angka (fmtRp, dst), bukan bergantung pada
        // resolusi per-karakter otomatis dari browser.
        numeric: ['"Hantepy Qablema"', "sans-serif"],
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
    },
  },
  plugins: [],
};
