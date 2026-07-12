/**
 * MarketsTab.jsx — halaman "Pasar" (dulu "Markets"): ringkasan SELURUH
 * cabang/lokasi penjualan (Penjualan/Keuntungan/Jumlah Terjual/Jumlah
 * Pelanggan) sebagai kartu, dengan tombol "Lihat Detail" per cabang untuk
 * expand ke MarketDetailPanel.jsx (lazy).
 *
 * Ringkasan berasal dari RPC `analytics_markets` (lewat ../../hooks →
 * useAnalyticsMarkets) — SELALU dimuat begitu tab dibuka (BUKAN lazy,
 * beda dari detail). Detail 1 cabang BARU dimuat saat user menekan
 * "Lihat Detail" — lihat MarketDetailPanel.jsx untuk penegakan
 * lazy-loading yang sesungguhnya (komponen detail hanya di-mount saat
 * expanded, hook RPC baru terpanggil di titik itu). TIDAK ADA perubahan
 * pada hook/RPC/urutan data di redesign ini — HANYA label teks & deskripsi.
 *
 * `expandedLocation` adalah state UI LOKAL milik tab ini saja — `useState`
 * biasa sesuai CLAUDE.md §7, BUKAN Zustand store baru.
 *
 * CATATAN: filter "Market" di Global Filter Bar TIDAK memengaruhi tab
 * ini — RPC analytics_markets SENGAJA tidak menerima p_location. Pesan
 * kecil di bawah judul section mengomunikasikan ini ke user.
 *
 * UX Audit lanjutan (2026-07): OverviewTab.jsx juga punya section berjudul
 * sama ("Ringkasan per Cabang") tapi versi YANG MENGIKUTI filter aktif —
 * halaman ini (Pasar) TETAP dipertahankan sebagai versi lengkap/tanpa
 * filter (+ drill-down "Lihat Detail" ke MarketDetailPanel yang tidak ada
 * di Overview), bukan duplikat yang perlu dihapus. Lihat komentar di
 * OverviewTab.jsx untuk penjelasan lengkap perbedaannya.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REDESIGN UI/UX (2026-07) — "Market"→"Cabang" (istilah lebih akrab utk
 * owner toko fashion, konsisten dengan OverviewTab "Cabang Terbaik"/
 * "Ringkasan per Cabang"), "Revenue"→"Penjualan", "Profit"→"Keuntungan",
 * "Qty"→"Jumlah Terjual", "Customer"→"Jumlah Pelanggan". Section punya
 * deskripsi 1 kalimat.
 */
import { useState } from "react";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { useAnalyticsMarkets } from "../../hooks";
import { fmtRpShort, fmtNumber } from "../../utils";
import MarketDetailPanel from "./MarketDetailPanel";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { sectionTitleCls, statLabelCls, statValueCls } from "../shared/classNames";

export default function MarketsTab() {
  const { markets, loading, error, refetch } = useAnalyticsMarkets();
  const [expandedLocation, setExpandedLocation] = useState(null);

  if (error) {
    return <ErrorState message="Gagal memuat Pasar." onRetry={refetch} />;
  }

  if (loading) {
    return (
      <div className="space-y-7 sm:space-y-8">
        <section>
          <h2 className={sectionTitleCls}>Ringkasan per Cabang</h2>
          <LoadingState variant="list" rows={3} />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-7 sm:space-y-8">
      <section>
        <h2 className={sectionTitleCls}>Ringkasan per Cabang</h2>
        <p className="text-xs text-skin-text4 -mt-1.5 mb-1">
          Perbandingan penjualan tiap cabang/lokasi penjualan Anda.
        </p>
        <p className="text-xs text-skin-text4 mb-3">
          Filter Pasar pada Global Filter tidak berlaku di halaman ini — seluruh cabang selalu ditampilkan.
        </p>

        {markets.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-6">Belum ada data cabang.</p>
        ) : (
          <div className="space-y-2.5">
            {markets.map((m) => {
              const isExpanded = expandedLocation === m.location;
              return (
                <div key={m.location} className="bg-skin-card border border-skin-bdr p-3 sm:p-4">
                  <p className="font-semibold text-skin-text text-sm sm:text-base mb-2 break-words">
                    {LOCATION_LABELS[m.location] ?? m.location}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="min-w-0">
                      <p className={statLabelCls}>Penjualan</p>
                      <p className={statValueCls}>{fmtRpShort(m.revenue)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className={statLabelCls}>Keuntungan</p>
                      <p className="text-sm sm:text-base font-bold text-[#CAB170] mt-1 break-words">
                        {fmtRpShort(m.profit)}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className={statLabelCls}>Jumlah Terjual</p>
                      <p className={statValueCls}>{fmtNumber(m.qty)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className={statLabelCls}>Jumlah Pelanggan</p>
                      <p className={statValueCls}>{fmtNumber(m.customer)}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => setExpandedLocation(isExpanded ? null : m.location)}
                    aria-expanded={isExpanded}
                    className="w-full mt-3 py-2 text-xs font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text hover:border-[#CAB170] transition"
                  >
                    {isExpanded ? "Tutup Detail" : "Lihat Detail"}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-skin-bdr-lt">
                      <MarketDetailPanel market={m.location} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
