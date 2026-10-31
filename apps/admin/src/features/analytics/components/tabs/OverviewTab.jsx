import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
import { useAnalyticsOverview } from "../../hooks";
import { fmtNumber, fmtRp, fmtRpShort } from "../../utils";
import { sectionTitleCls, statLabelCls, statValueCls } from "../shared/classNames";
import ErrorState from "../shared/ErrorState";
import InsightCard from "../shared/InsightCard";
import KpiCard from "../shared/KpiCard";
import LoadingState from "../shared/LoadingState";

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
      <section>
        <h2 className={sectionTitleCls}>Angka Penting</h2>
        <SectionDescription>
          Ringkasan penjualan pada periode yang Anda pilih di filter atas.
        </SectionDescription>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
          <KpiCard
            label="Total Penjualan"
            value={fmtRpShort(kpi.totalRevenue)}
            hint="Total nilai seluruh penjualan."
            accent
          />
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

      <section>
        <h2 className={sectionTitleCls}>Sorotan</h2>
        <SectionDescription>
          Produk, cabang, dan pelanggan dengan performa terbaik pada periode ini.
        </SectionDescription>
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

      <section>
        <h2 className={sectionTitleCls}>Ringkasan per Cabang</h2>
        <SectionDescription>
          Perbandingan penjualan tiap cabang/lokasi pada periode yang Anda pilih di filter atas.
          Untuk detail lengkap semua cabang tanpa filter, buka halaman Pasar.
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
                    <p className="text-sm sm:text-base font-bold text-skin-accent-text mt-1 break-words">
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
