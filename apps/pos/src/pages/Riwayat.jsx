/**
 * Riwayat.jsx — Halaman riwayat aktivitas POS.
 *
 * Menampilkan feed terpadu:
 *   - Transaksi penjualan & retur (dari IndexedDB)
 *   - Perubahan pelanggan (add/edit/delete)
 *   - Audit produk, stok opname, transfer
 *   - Produksi (batch, HPP, bahan)
 *
 * Filter: rentang waktu × kategori aktivitas
 */
import { useState } from "react";
import { useRiwayat } from "../hooks/useRiwayat";
import RiwayatCard from "../components/riwayat/RiwayatCard";
import { DATE_PRESETS, CATEGORY_FILTERS, groupByDate } from "../components/riwayat/riwayatUtils";

export default function Riwayat() {
  const [preset, setPreset] = useState("week");
  const [category, setCategory] = useState("semua");

  const { items, loading, error, reload } = useRiwayat({ preset, category });
  const groups = groupByDate(items);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Filter bar ── */}
      <div className="flex-shrink-0 px-4 pt-4 pb-3 space-y-3 border-b border-skin-bdr bg-skin-card">
        {/* Rentang waktu */}
        <div className="flex gap-2">
          {DATE_PRESETS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setPreset(p.value)}
              className={`flex-1 py-2 text-xs tracking-[0.1em] uppercase font-semibold border-2 transition ${
                preset === p.value
                  ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                  : "border-skin-bdr text-skin-text3 hover:border-[#CAB170]/50"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Kategori */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none">
          {CATEGORY_FILTERS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`flex-shrink-0 px-3 py-1.5 text-xs tracking-[0.08em] uppercase font-semibold border transition ${
                category === c.value
                  ? "border-[#CAB170] text-[#CAB170] bg-skin-gold"
                  : "border-skin-bdr text-skin-text3 hover:text-skin-text2"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Daftar riwayat ── */}
      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-32">
            <p className="text-skin-text3 text-sm tracking-[0.15em]">Memuat...</p>
          </div>
        )}

        {!loading && error && (
          <div className="m-4 px-4 py-3 bg-red-50 border border-red-200 text-sm text-red-600">
            {error}
            <button type="button" onClick={reload} className="ml-3 underline">
              Coba lagi
            </button>
          </div>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-skin-text3 space-y-1">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="w-10 h-10 opacity-30"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z"
              />
            </svg>
            <p className="text-sm tracking-[0.1em]">Belum ada aktivitas</p>
          </div>
        )}

        {!loading &&
          !error &&
          groups.map((group) => (
            <div key={group.key}>
              {/* Tanggal header */}
              <div className="sticky top-0 z-10 px-4 py-2 bg-skin-page/90 backdrop-blur-sm border-b border-skin-bdr">
                <p className="text-xs font-semibold tracking-[0.15em] uppercase text-skin-text3">
                  {group.label}
                  <span className="ml-2 text-skin-text4 normal-case tracking-normal font-normal">
                    ({group.items.length} aktivitas)
                  </span>
                </p>
              </div>

              {/* Item-item */}
              <div className="divide-y divide-skin-bdr/50">
                {group.items.map((item) => (
                  <RiwayatCard key={item._id} item={item} />
                ))}
              </div>
            </div>
          ))}

        {/* Spacer bawah agar konten tidak ketutupan bottom nav */}
        <div className="h-4" />
      </div>
    </div>
  );
}
