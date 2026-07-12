/**
 * MarketDetailPanel.jsx — detail 1 cabang (statistik kecil + Produk
 * Terlaris + Tren Penjualan), ditampilkan saat user meng-expand 1 baris
 * di MarketsTab.jsx ("Pasar").
 *
 * LAZY BY DESIGN: `useAnalyticsMarketDetail(market)` (dan RPC
 * `analytics_market_detail` di baliknya) HANYA terpanggil saat komponen
 * ini benar-benar ter-mount — MarketsTab.jsx hanya me-render komponen ini
 * ketika `expandedLocation === market`, jadi TIDAK ADA request RPC yang
 * terkirim untuk cabang yang belum/tidak di-expand. Penegakan teknisnya
 * sendiri ada 2 lapis: (1) komponen ini tidak pernah mount sebelum expand
 * (React tidak memanggil hook sama sekali), (2) `enabled: !!market` di
 * useAnalyticsMarketDetailQuery (queries.js) sebagai jaring pengaman kedua.
 *
 * Reuse penuh, TIDAK ADA komponen baru yang menduplikasi:
 *   - <Leaderboard/> untuk Produk Terlaris — SAMA komponen yang dipakai
 *     tab Produk (../shared/Leaderboard.jsx).
 *   - <TrendChart/> untuk Tren Penjualan — SAMA komponen yang dipakai
 *     Tren Penjualan (../shared/TrendChart.jsx, Recharts). RPC
 *     `analytics_market_detail` memanggil `analytics_trend()` secara
 *     internal — tidak ada logika trend yang ditulis ulang di frontend
 *     maupun backend.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REDESIGN UI/UX (2026-07) — label statistik disamakan dengan MarketsTab:
 * "Revenue"→"Penjualan", "Profit"→"Keuntungan", "Qty"→"Jumlah Terjual",
 * "Customer"→"Jumlah Pelanggan", "Trend Revenue"→"Tren Penjualan". TIDAK
 * ADA perubahan pada hook/RPC/urutan data.
 */
import { useAnalyticsMarketDetail } from "../../hooks";
import { fmtRp, fmtRpShort, fmtNumber, fmtPeriode } from "../../utils";
import Leaderboard from "../shared/Leaderboard";
import TrendChart from "../shared/TrendChart";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { statLabelCls, statValueCls } from "../shared/classNames";

const fmtQtyPcs = (v) => `${fmtNumber(v)} pcs`;

export default function MarketDetailPanel({ market }) {
  const { revenue, profit, qty, customer, produkTerlaris, trend, loading, error, refetch } =
    useAnalyticsMarketDetail(market);

  if (error) {
    return <ErrorState message="Gagal memuat detail cabang." onRetry={refetch} />;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <LoadingState variant="kpi" />
        <LoadingState variant="list" rows={2} />
        <LoadingState variant="chart" />
      </div>
    );
  }

  const trendData = trend.buckets.map((b) => ({
    label: fmtPeriode(b.periode, trend.granularity),
    revenue: b.revenue,
  }));
  const trendSeries = [{ dataKey: "revenue", label: "Penjualan", color: "#CAB170", formatter: fmtRp }];

  return (
    <div className="space-y-4">
      {/* Statistik kecil */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="min-w-0">
          <p className={statLabelCls}>Penjualan</p>
          <p className="text-sm font-semibold text-skin-text2 mt-1 break-words">{fmtRpShort(revenue)}</p>
        </div>
        <div className="min-w-0">
          <p className={statLabelCls}>Keuntungan</p>
          <p className="text-sm font-bold text-[#CAB170] mt-1 break-words">{fmtRpShort(profit)}</p>
        </div>
        <div className="min-w-0">
          <p className={statLabelCls}>Jumlah Terjual</p>
          <p className="text-sm font-semibold text-skin-text2 mt-1 break-words">{fmtNumber(qty)}</p>
        </div>
        <div className="min-w-0">
          <p className={statLabelCls}>Jumlah Pelanggan</p>
          <p className="text-sm font-semibold text-skin-text2 mt-1 break-words">{fmtNumber(customer)}</p>
        </div>
      </div>

      {/* Produk Terlaris — reuse Leaderboard dari tab Produk */}
      <div>
        <h3 className="text-xs font-semibold text-skin-text2 mb-2">Produk Terlaris</h3>
        <Leaderboard
          items={produkTerlaris}
          valueFormatter={fmtQtyPcs}
          emptyMessage="Belum ada penjualan di cabang ini pada periode filter."
        />
      </div>

      {/* Tren Penjualan — reuse TrendChart (Recharts) dari Tren Penjualan */}
      <div>
        <h3 className="text-xs font-semibold text-skin-text2 mb-2">Tren Penjualan</h3>
        <TrendChart data={trendData} series={trendSeries} height={200} />
      </div>
    </div>
  );
}
