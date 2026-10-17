import { useAnalyticsMarketDetail } from "../../hooks";
import { fmtRp, fmtRpShort, fmtNumber, fmtPeriode } from "../../utils";
import Leaderboard from "../shared/Leaderboard";
import TrendChart from "../shared/TrendChart";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { statLabelCls, statValueCls } from "../shared/classNames";
import { THEME } from "@deera/shared/lib/themeColors";

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
  const trendSeries = [{ dataKey: "revenue", label: "Penjualan", color: THEME.accent, formatter: fmtRp }];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="min-w-0">
          <p className={statLabelCls}>Penjualan</p>
          <p className="text-sm font-semibold text-skin-text2 mt-1 break-words">{fmtRpShort(revenue)}</p>
        </div>
        <div className="min-w-0">
          <p className={statLabelCls}>Keuntungan</p>
          <p className="text-sm font-bold text-skin-accent-text mt-1 break-words">{fmtRpShort(profit)}</p>
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

      <div>
        <h3 className="text-xs font-semibold text-skin-text2 mb-2">Produk Terlaris</h3>
        <Leaderboard
          items={produkTerlaris}
          valueFormatter={fmtQtyPcs}
          emptyMessage="Belum ada penjualan di cabang ini pada periode filter."
        />
      </div>

      <div>
        <h3 className="text-xs font-semibold text-skin-text2 mb-2">Tren Penjualan</h3>
        <TrendChart data={trendData} series={trendSeries} height={200} />
      </div>
    </div>
  );
}
