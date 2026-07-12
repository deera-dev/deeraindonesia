/**
 * features/analytics/store.js
 * Zustand store untuk Global Filter Analytics (Date Range + preset, Market,
 * Product) — dibagi ke SEMUA tab (Overview, Products, Markets, Trends,
 * Customers), sesuai CLAUDE.md §7 ("state yang dibagi antar komponen dalam
 * satu fitur → Zustand").
 *
 * SENGAJA TIDAK memakai middleware `persist` (instruksi eksplisit) — setiap
 * kali halaman Analytics dibuka, filter selalu mulai dari default (preset
 * "30 Hari", semua market, semua produk), bukan melanjutkan filter sesi
 * sebelumnya.
 *
 * ── Date preset (requirement change 2026-07) ────────────────────────────
 * `datePreset` menyimpan preset AKTIF ("7d"/"30d"/"1y"/"custom", lihat
 * DATE_PRESETS di constants.js). Memilih preset selain "custom" LANGSUNG
 * menghitung ulang fromDate/toDate lewat dateRangeForDays() (utils.js) —
 * TIDAK ADA business logic baru, murni kalkulasi tanggal yang sama seperti
 * defaultDateRange() sebelumnya. Memilih "custom" HANYA mengubah
 * `datePreset` (fromDate/toDate TIDAK disentuh, tetap nilai preset
 * terakhir sebagai titik awal) — date picker manual baru muncul di UI saat
 * ini (lihat GlobalFilterBar.jsx), lalu `setDateRange` (sudah ada
 * sebelumnya, TIDAK diubah) dipakai seperti biasa untuk mengedit tanggal
 * manual.
 *
 * Komponen TIDAK PERNAH import store ini langsung — selalu lewat hooks.js
 * (Dependency Inversion, lihat CLAUDE.md §4/§7).
 */
import { create } from "zustand";
import { defaultDateRange, dateRangeForDays } from "./utils";
import { TREND_GRANULARITIES, DATE_PRESETS, DEFAULT_DATE_PRESET } from "./constants";

const DEFAULT_GRANULARITY = TREND_GRANULARITIES[0].value; // "day"

function initialFilter() {
  const { fromDate, toDate } = defaultDateRange();
  return {
    fromDate,
    toDate,
    location: null, // null = semua market
    kode: null, // null = semua produk
  };
}

export const useAnalyticsFilterStore = create((set) => ({
  filter: initialFilter(),
  granularity: DEFAULT_GRANULARITY,
  datePreset: DEFAULT_DATE_PRESET,

  setDateRange: (fromDate, toDate) =>
    set((s) => ({ filter: { ...s.filter, fromDate, toDate } })),
  setLocation: (location) => set((s) => ({ filter: { ...s.filter, location } })),
  setKode: (kode) => set((s) => ({ filter: { ...s.filter, kode } })),
  setGranularity: (granularity) => set({ granularity }),

  // Ganti preset rentang tanggal. "custom" hanya mengganti mode tampilan
  // (munculkan date picker di GlobalFilterBar) tanpa mengubah fromDate/
  // toDate yang sedang aktif. Preset lain ("7d"/"30d"/"1y") langsung
  // menghitung ulang fromDate/toDate dari hari ini.
  setDatePreset: (presetKey) =>
    set((s) => {
      const preset = DATE_PRESETS.find((p) => p.key === presetKey);
      if (!preset || preset.key === "custom") {
        return { datePreset: presetKey };
      }
      const { fromDate, toDate } = dateRangeForDays(preset.days);
      return { datePreset: presetKey, filter: { ...s.filter, fromDate, toDate } };
    }),

  resetFilter: () =>
    set({ filter: initialFilter(), granularity: DEFAULT_GRANULARITY, datePreset: DEFAULT_DATE_PRESET }),
}));
