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
                      <p className="text-sm sm:text-base font-bold text-skin-accent-text mt-1 break-words">
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
                    className="w-full mt-3 py-2 text-xs font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text hover:border-skin-accent transition"
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
