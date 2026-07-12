/**
 * TrendsTab.jsx — halaman "Tren Penjualan" (dulu "Trends"), pusat seluruh
 * visualisasi grafik Analytics. SATU chart multi-series (Penjualan +
 * Keuntungan di sumbu-Y kiri skala Rupiah, Jumlah Terjual di sumbu-Y
 * kanan skala angka) — toggle per garis lewat klik Legend (lihat
 * TrendChart.jsx). Ini SATU-SATUNYA tempat trend divisualisasikan di
 * seluruh Analytics (Ringkasan Penjualan sejak requirement change 2026-07
 * sudah tidak punya chart sendiri, lihat OverviewTab.jsx).
 *
 * SELURUH angka berasal dari RPC `analytics_trend` (lewat ../../hooks →
 * useAnalyticsTrend) — granularity disimpan di Global Filter store
 * (Zustand). Komponen ini TIDAK melakukan bucketing/agregasi apa pun,
 * hanya memilih granularity dan membentuk shape `data`/`series` untuk
 * TrendChart (murni reshape untuk render, bukan business logic). TIDAK
 * ADA perubahan pada hook/RPC/urutan data di redesign ini — HANYA label
 * teks & deskripsi.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REDESIGN UI/UX (2026-07) — "Revenue"→"Penjualan", "Profit"→
 * "Keuntungan" pada judul & legend chart. Section punya deskripsi 1
 * kalimat.
 */
import { useAnalyticsFilter, useAnalyticsTrend } from "../../hooks";
import { fmtPeriode, fmtRp, fmtNumber } from "../../utils";
import { TREND_GRANULARITIES } from "../../constants";
import TrendChart from "../shared/TrendChart";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { sectionTitleCls } from "../shared/classNames";

export default function TrendsTab() {
  const { granularity, setGranularity } = useAnalyticsFilter();
  const { buckets, loading, error, refetch } = useAnalyticsTrend();

  const data = buckets.map((b) => ({
    label: fmtPeriode(b.periode, granularity),
    revenue: b.revenue,
    profit: b.profit,
    qty: b.qty,
  }));

  const series = [
    { dataKey: "revenue", label: "Penjualan", color: "#CAB170", yAxisId: "left", formatter: fmtRp },
    { dataKey: "profit", label: "Keuntungan", color: "#4C9A6A", yAxisId: "left", formatter: fmtRp },
    { dataKey: "qty", label: "Jumlah Terjual", color: "#5B8DEF", yAxisId: "right", formatter: fmtNumber },
  ];

  return (
    <div className="space-y-6">
      {/* ── Granularity switcher ── */}
      <div className="flex border border-skin-bdr">
        {TREND_GRANULARITIES.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setGranularity(value)}
            aria-pressed={granularity === value}
            className={`flex-1 py-2 sm:py-2.5 font-editorial text-[11px] sm:text-xs tracking-[0.1em] sm:tracking-[0.15em] uppercase transition border-r last:border-r-0 border-skin-bdr ${
              granularity === value
                ? "bg-[#CAB170] text-white"
                : "text-skin-text3 hover:text-skin-text bg-skin-card"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {error ? (
        <ErrorState message="Gagal memuat Tren Penjualan." onRetry={refetch} />
      ) : loading ? (
        <section>
          <h2 className={sectionTitleCls}>Penjualan · Keuntungan · Jumlah Terjual</h2>
          <LoadingState variant="chart" />
        </section>
      ) : (
        <section>
          <h2 className={sectionTitleCls}>Penjualan · Keuntungan · Jumlah Terjual</h2>
          <p className="text-xs text-skin-text4 -mt-1.5 mb-3">Grafik naik-turun penjualan dari waktu ke waktu.</p>
          <p className="text-[11px] text-skin-text4 mb-3">
            Klik label pada legend untuk menampilkan/menyembunyikan satu garis.
          </p>
          <TrendChart data={data} series={series} height={280} />
        </section>
      )}
    </div>
  );
}
