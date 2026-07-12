/**
 * GlobalFilterBar.jsx — filter global Analytics (Date Range + preset,
 * Market, Product), mempengaruhi SELURUH tab (kecuali Markets, lihat
 * catatan di api.js/fetchAnalyticsMarkets soal filter Market yang sengaja
 * tidak berlaku di tab itu).
 *
 * Category filter SENGAJA belum ada (instruksi eksplisit: "Jangan
 * implement: Category Filter" — lihat ANALYTICS_ARCHITECTURE_PLAN.md §12
 * untuk keputusan `bahan` sebagai proxy Category, ditunda ke Phase
 * berikutnya).
 *
 * Data layer HANYA lewat ../hooks.js (useAnalyticsFilter) — komponen tidak
 * pernah menyentuh store.js langsung.
 *
 * ── Date preset (requirement change 2026-07) ────────────────────────────
 * Baris pertama sekarang berupa 4 tombol preset (7 Hari/30 Hari/1 Tahun/
 * Custom, dari DATE_PRESETS di constants.js) alih-alih langsung
 * menampilkan 2 date picker. Memilih preset selain "Custom" LANGSUNG
 * mengisi fromDate/toDate (lewat setDatePreset di store — lihat
 * store.js), TIDAK ADA perubahan business logic, murni mempercepat UX.
 * Date picker manual HANYA muncul saat preset "Custom" aktif — baik dari
 * klik eksplisit maupun (secara alami) tetap Custom di render berikutnya
 * sampai user pilih preset lain.
 *
 * ── Phase 5 (Dashboard Polish) ───────────────────────────────────────────
 * Tombol preset tanggal sekarang punya `aria-pressed` (accessibility —
 * menandai preset yang sedang aktif untuk assistive tech).
 *
 * ── Redesign mobile-first (2026-07, sesi sebelumnya) ────────────────────
 * (Market + Product) tetap di baris terpisah dari Date Range — di layar
 * ≤430px, elemen dalam 1 baris gampang terasa sesak/berantakan urutan
 * wrap-nya. Dengan baris terpisah, masing-masing elemen dapat `min-w`
 * yang cukup lega dan urutan wrap lebih terprediksi.
 */
import { useProducts } from "@deera/shared/features/products/hooks";
import { LOCATIONS, LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { useAnalyticsFilter } from "../hooks";
import { DATE_PRESETS } from "../constants";

export default function GlobalFilterBar() {
  const { filter, datePreset, setDateRange, setLocation, setKode, setDatePreset } = useAnalyticsFilter();
  const { products } = useProducts();

  return (
    <div className="border-t border-skin-bdr-lt px-4 py-2.5 flex flex-col gap-2 md:px-8">
      {/* Baris 1: Preset rentang tanggal */}
      <div className="flex border border-skin-bdr">
        {DATE_PRESETS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setDatePreset(key)}
            aria-pressed={datePreset === key}
            className={`flex-1 py-1.5 font-editorial text-[10px] sm:text-xs tracking-[0.1em] uppercase transition border-r last:border-r-0 border-skin-bdr ${
              datePreset === key
                ? "bg-[#CAB170] text-white"
                : "text-skin-text3 hover:text-skin-text bg-skin-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Baris 1b: Date picker manual — HANYA saat preset "Custom" aktif */}
      {datePreset === "custom" && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <input
            type="date"
            value={filter.fromDate}
            max={filter.toDate}
            onChange={(e) => setDateRange(e.target.value, filter.toDate)}
            className="flex-1 min-w-[132px] bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-[#CAB170] transition"
          />
          <span className="text-skin-text4 text-xs flex-shrink-0">—</span>
          <input
            type="date"
            value={filter.toDate}
            min={filter.fromDate}
            onChange={(e) => setDateRange(filter.fromDate, e.target.value)}
            className="flex-1 min-w-[132px] bg-skin-page border border-skin-bdr px-2 py-1.5 text-xs text-skin-text focus:outline-none focus:border-[#CAB170] transition"
          />
        </div>
      )}

      {/* Baris 2: Market + Product */}
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filter.location ?? ""}
          onChange={(e) => setLocation(e.target.value || null)}
          className="flex-1 min-w-[130px] px-3 py-1.5 text-xs font-semibold tracking-wide border border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-[#CAB170] transition cursor-pointer"
        >
          <option value="">Semua Market</option>
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {LOCATION_LABELS[loc] ?? loc}
            </option>
          ))}
        </select>

        <select
          value={filter.kode ?? ""}
          onChange={(e) => setKode(e.target.value || null)}
          className="flex-1 min-w-[130px] px-3 py-1.5 text-xs font-semibold tracking-wide border border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-[#CAB170] transition cursor-pointer"
        >
          <option value="">Semua Produk</option>
          {(products ?? []).map((p) => (
            <option key={p.kode} value={p.kode}>
              {p.kode} — {p.nama}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
