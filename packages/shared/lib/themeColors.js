/**
 * themeColors.js — warna theme untuk nilai JS (style inline, atribut SVG/chart).
 * Mengacu ke CSS variable di styles/index.css sehingga otomatis ikut light/dark.
 * JANGAN dipakai untuk canvas/ikon Google Maps atau dokumen cetak/PNG (kertas
 * putih tetap) — di sana warna harus literal.
 */
export const THEME = {
  accent: "rgb(var(--skin-accent))",
  accentText: "rgb(var(--skin-accent-text))",
  success: "rgb(var(--st-success))",
  warning: "rgb(var(--st-warning))",
  danger: "rgb(var(--st-danger))",
  info: "rgb(var(--st-info))",
  muted: "var(--skin-text3)",
};
