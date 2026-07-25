/**
 * OverviewTab.jsx — halaman "Ringkasan Penjualan" (dulu "Overview").
 *
 * SELURUH angka di sini berasal langsung dari RPC `analytics_overview`
 * (lewat ../../hooks → useAnalyticsOverview) — TIDAK ADA reduce()/
 * groupBy()/map() untuk business logic di komponen ini, hanya `.map()`
 * murni untuk RENDER (mis. daftar KPI Cards, kartu Ringkasan per Cabang).
 * TIDAK ADA perubahan pada hook/RPC di redesign ini — HANYA label teks,
 * istilah, dan deskripsi section.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REDESIGN UI/UX (2026-07) — perubahan requirement eksplisit Denny
 * ══════════════════════════════════════════════════════════════════════
 * - Nama halaman → "Ringkasan Penjualan" (ANALYTICS_SECTION_GROUPS di
 *   constants.js), bukan lagi "Overview".
 * - Istilah disederhanakan: "Total Revenue"→"Total Penjualan",
 *   "Total Profit"→"Keuntungan", "Average Order Value"→"Rata-rata Nilai
 *   Transaksi", "Pasar Terbaik"→"Cabang Terbaik", dst — target owner toko
 *   yang bukan orang teknis.
 * - Setiap KPI utama SEKARANG punya `hint` (KpiCard prop BARU, additive —
 *   lihat shared/KpiCard.jsx) berisi 1 kalimat penjelasan istilah, SELALU
 *   tampil (bukan tooltip — tidak ramah sentuh di mobile).
 * - Setiap section SEKARANG punya deskripsi 1 kalimat di bawah judul.
 *
 * ── Keputusan final Denny (2026-07, requirement change sebelum Phase 4) ──
 * 1. Quick Insight Produk Terlaris/Produk Profit Tertinggi menampilkan
 *    KODE PRODUK (mis. "D-91-SWI"), BUKAN nama ("Swifa Series"). Customer
 *    Terbaik TETAP pakai nama (pelanggan tidak punya kode).
 * 2. Trend/chart DIHAPUS dari tab ini sepenuhnya — seluruh visualisasi
 *    trend dipusatkan di halaman Tren Penjualan (lihat TrendsTab.jsx).
 *
 * ── UX Audit lanjutan (2026-07, hilangkan duplikasi lintas-halaman) ────
 * "Ringkasan per Cabang" DIPERTAHANKAN di sini (bukan dihapus) meski
 * MarketsTab.jsx (halaman "Pasar") punya section dengan JUDUL SAMA —
 * ALASAN: keduanya menampilkan data BERBEDA, bukan duplikat murni. Versi
 * di sini MENGIKUTI Global Filter Bar (tanggal/lokasi aktif), sedangkan
 * MarketsTab SENGAJA mengabaikan filter (selalu tampilkan seluruh cabang
 * apa adanya — lihat komentar di MarketsTab.jsx). Karena judulnya identik
 * padahal angkanya bisa berbeda (rawan bikin owner bingung "kok beda?"),
 * ditambahkan 1 baris penjelas di bawah supaya perbedaan tsb eksplisit,
 * bukan cuma diasumsikan owner akan sadar sendiri.
 */
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { useAnalyticsOverview } from "../../hooks";
import { fmtRp, fmtRpShort, fmtNumber } from "../../utils";
import KpiCard from "../shared/KpiCard";
import InsightCard from "../shared/InsightCard";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { sectionTitleCls, statLabelCls, statValueCls } from "../shared/classNames";

function SectionDescription({ children }) {
  return <p className="text-xs text-skin-text4 -mt-1.5 mb-3">{children}</p>;
}

export default function OverviewTab() {
  const { kpi, quickInsight, marketSummary, loading, error, refetch } = useAnalyticsOverview();

  if (error) {
    return <ErrorState message="Gagal memuat Ringkasan Penjualan." onRetry={refetch} />;
  }

  if (loading) {
    return (
      <div className="space-y-7 sm:space-y-8">
        <section>
          <h2 className={sectionTitleCls}>Angka Penting</h2>
          <LoadingState variant="kpi" />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Sorotan</h2>
          <LoadingState variant="kpi" />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Ringkasan per Cabang</h2>
          <LoadingState variant="list" rows={3} />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-7 sm:space-y-8">
      {/* ── Angka Penting (dulu "KPI Utama") ── */}
      <section>
        <h2 className={sectionTitleCls}>Angka Penting</h2>
        <SectionDescription>Ringkasan penjualan pada periode yang Anda pilih di filter atas.</SectionDescription>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <KpiCard label="Total Penjualan" value={fmtRpShort(kpi.totalRevenue)} hint="Total nilai seluruh penjualan." accent />
          <KpiCard
            label="Keuntungan"
            value={fmtRpShort(kpi.totalProfit)}
            hint="Total keuntungan setelah dikurangi modal."
            warn={kpi.totalProfit > 0}
          />
          <KpiCard label="Produk Terjual" value={fmtNumber(kpi.totalQty)} sub="pcs" />
          <KpiCard label="Jumlah Transaksi" value={fmtNumber(kpi.totalTransaksi)} sub="transaksi" />
          <KpiCard label="Jumlah Pelanggan" value={fmtNumber(kpi.totalCustomer)} sub="pelanggan" />
          <KpiCard
            label="Rata-rata Nilai Transaksi"
            value={fmtRpShort(kpi.aov)}
            hint="Rata-rata besar belanja pelanggan per transaksi."
          />
        </div>
      </section>

      {/* ── Sorotan (dulu "Quick Insight") ── */}
      <section>
        <h2 className={sectionTitleCls}>Sorotan</h2>
        <SectionDescription>Produk, cabang, dan pelanggan dengan performa terbaik pada periode ini.</SectionDescription>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
          <InsightCard
            label="Produk Terlaris"
            primary={quickInsight.produkTerlaris?.kode ?? "—"}
            metric={
              quickInsight.produkTerlaris
                ? `${fmtNumber(quickInsight.produkTerlaris.value)} pcs terjual`
                : "Belum ada data"
            }
            accent
          />
          <InsightCard
            label="Produk Paling Untung"
            primary={quickInsight.produkProfitTertinggi?.kode ?? "—"}
            metric={
              quickInsight.produkProfitTertinggi
                ? fmtRp(quickInsight.produkProfitTertinggi.value)
                : "Belum ada data"
            }
          />
          <InsightCard
            label="Cabang Terbaik"
            primary={
              quickInsight.pasarTerbaik
                ? (LOCATION_LABELS[quickInsight.pasarTerbaik.location] ??
                  quickInsight.pasarTerbaik.location)
                : "—"
            }
            metric={
              quickInsight.pasarTerbaik
                ? `${fmtRp(quickInsight.pasarTerbaik.value)} keuntungan`
                : "Belum ada data"
            }
            accent
          />
          <InsightCard
            label="Pelanggan Terbaik"
            primary={quickInsight.customerTerbaik?.nama ?? "—"}
            metric={
              quickInsight.customerTerbaik
                ? fmtRp(quickInsight.customerTerbaik.value)
                : "Belum ada data"
            }
          />
        </div>
      </section>

      {/* ── Ringkasan per Cabang (dulu "Ringkasan Market") ── */}
      <section>
        <h2 className={sectionTitleCls}>Ringkasan per Cabang</h2>
        <SectionDescription>
          Perbandingan penjualan tiap cabang/lokasi pada periode yang Anda pilih di filter atas. Untuk detail
          lengkap semua cabang tanpa filter, buka halaman Pasar.
        </SectionDescription>
        {marketSummary.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-6">
            Belum ada transaksi pada periode ini.
          </p>
        ) : (
          <div className="space-y-2.5">
            {marketSummary.map((m) => (
              <div key={m.location} className="bg-skin-card border border-skin-bdr p-3 sm:p-4">
                <p className="font-semibold text-skin-text text-sm sm:text-base mb-2 break-words">
                  {LOCATION_LABELS[m.location] ?? m.location}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center">
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
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
