/**
 * format.js — Helper format & style yang dipakai lintas fitur apps/finance.
 * Pure functions/constants, tidak ada React, tidak ada Supabase.
 * Dipindahkan dari lib/financeUtils.js lama (Vertical Slice Architecture).
 */

// ── Format ────────────────────────────────────────────────────────────────────

/** Format angka ke Rp xx.xxx */
export function fmtRp(value) {
  if (value === null || value === "") return "—";
  return "Rp " + Number(value).toLocaleString("id-ID");
}

/** Format tanggal ke "Senin, 26 Mei 2025" */
export function fmtTanggal(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/** Format tanggal pendek ke "26 Mei 2025" */
export function fmtTanggalPendek(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Ambil Sabtu dari sembarang tanggal dalam minggu itu (ISO week ending Saturday) */
export function getSabtu(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun, 6=Sat
  const diff = (6 - day + 7) % 7;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/** Ambil Senin dari sembarang tanggal dalam minggu itu */
export function getSenin(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

// ── CSS class helpers (konsisten dengan admin) ────────────────────────────────

export const inputCls =
  "w-full bg-skin-input border border-skin-bdr text-skin-text px-3 py-2.5 font-editorial text-sm rounded-none outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4";

export const labelCls = "font-editorial text-xs tracking-[0.15em] uppercase text-skin-text3";

// NOTE: tidak dipakai di manapun saat migrasi ini dilakukan (dead code),
// dipertahankan apa adanya dari lib/financeUtils.js lama.
export const sectionTitleCls =
  "font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3 mb-3";
