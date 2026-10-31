import { useAnalyticsCustomers } from "../../hooks";
import { fmtNumber, fmtRp, fmtRpShort } from "../../utils";
import { sectionTitleCls, statLabelCls, statValueCls, subTitleCls } from "../shared/classNames";
import ErrorState from "../shared/ErrorState";
import KpiCard from "../shared/KpiCard";
import Leaderboard from "../shared/Leaderboard";
import LoadingState from "../shared/LoadingState";

function SectionDescription({ children }) {
  return <p className="text-xs text-skin-text4 -mt-1.5 mb-3">{children}</p>;
}

export default function CustomersTab() {
  const { leaderboard, insight, ranking, loading, error, refetch } = useAnalyticsCustomers();

  if (error) {
    return <ErrorState message="Gagal memuat Pelanggan." onRetry={refetch} />;
  }

  if (loading) {
    return (
      <div className="space-y-7 sm:space-y-8">
        <section>
          <h2 className={sectionTitleCls}>Ringkasan Pelanggan</h2>
          <LoadingState variant="kpi" />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Pelanggan Terbaik</h2>
          <LoadingState variant="list" rows={3} />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Ranking Pelanggan</h2>
          <LoadingState variant="list" rows={3} />
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-7 sm:space-y-8">
      <section>
        <h2 className={sectionTitleCls}>Ringkasan Pelanggan</h2>
        <SectionDescription>
          Gambaran singkat pelanggan Anda: yang baru belanja, yang sering kembali, dan rata-rata
          belanja mereka.
        </SectionDescription>
        <p className="text-xs text-skin-text4 -mt-1.5 mb-3">
          Pelanggan Baru dan Rata-rata Nilai Transaksi mengikuti periode yang dipilih di filter
          atas. Pelanggan Kembali dan Nilai Pelanggan dihitung dari seluruh riwayat transaksi.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <KpiCard
            label="Pelanggan Baru"
            value={fmtNumber(insight.customerBaru)}
            sub="pelanggan periode ini"
            hint="Pelanggan yang baru pertama kali belanja pada periode ini."
          />
          <KpiCard
            label="Pelanggan Kembali"
            value={fmtNumber(insight.repeatCustomer)}
            sub="sepanjang waktu"
            hint="Pelanggan yang sudah belanja lebih dari sekali."
          />
          <KpiCard
            label="Rata-rata Nilai Transaksi"
            value={fmtRpShort(insight.avgOrder)}
            sub="per transaksi bernama"
            hint="Rata-rata besar belanja pelanggan setiap kali transaksi."
          />
          <KpiCard
            label="Nilai Pelanggan"
            value={fmtRpShort(insight.ltv)}
            sub="rata-rata, sepanjang waktu"
            hint="Perkiraan total belanja 1 pelanggan sepanjang waktu."
            accent
          />
        </div>
        {(insight.anonymousTransactionCount > 0 || insight.anonymousRevenue > 0) && (
          <p className="text-xs text-skin-text4 mt-3">
            {fmtNumber(insight.anonymousTransactionCount)} transaksi tanpa nama pembeli (
            {fmtRp(insight.anonymousRevenue)}) pada periode ini tidak dihitung di daftar pelanggan
            di bawah.
          </p>
        )}
      </section>

      <section>
        <h2 className={sectionTitleCls}>Pelanggan Terbaik</h2>
        <SectionDescription>
          Pelanggan dengan penjualan, keuntungan, dan pembelian terbanyak pada periode ini.
        </SectionDescription>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <h3 className={subTitleCls}>Penjualan Tertinggi</h3>
            <Leaderboard
              items={leaderboard.revenueTertinggi}
              labelKey="nama"
              mono={false}
              valueFormatter={fmtRpShort}
              emptyMessage="Belum ada transaksi bernama pada periode ini."
            />
          </div>
          <div>
            <h3 className={subTitleCls}>Keuntungan Tertinggi</h3>
            <Leaderboard
              items={leaderboard.profitTertinggi}
              labelKey="nama"
              mono={false}
              valueFormatter={fmtRpShort}
              emptyMessage="Belum ada transaksi bernama pada periode ini."
            />
          </div>
          <div>
            <h3 className={subTitleCls}>Pembelian Terbanyak</h3>
            <Leaderboard
              items={leaderboard.qtyTerbanyak}
              labelKey="nama"
              mono={false}
              valueFormatter={(v) => `${fmtNumber(v)} pcs`}
              emptyMessage="Belum ada transaksi bernama pada periode ini."
            />
          </div>
        </div>
      </section>

      <details className="group">
        <summary className="cursor-pointer select-none list-none">
          <h2 className={`${sectionTitleCls} inline-flex items-center gap-1.5`}>
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Ranking Pelanggan
          </h2>
        </summary>
        <SectionDescription>
          Daftar lengkap seluruh pelanggan pada periode ini, diurutkan dari yang paling
          berkontribusi.
        </SectionDescription>
        {ranking.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-6">
            Belum ada transaksi bernama pada periode ini.
          </p>
        ) : (
          <div className="space-y-2.5">
            {ranking.map((c, i) => (
              <div key={c.pelangganId} className="bg-skin-card border border-skin-bdr p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-skin-page text-skin-text3 text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="font-semibold text-skin-text text-sm sm:text-base break-words">
                    {c.nama}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="min-w-0">
                    <p className={statLabelCls}>Penjualan</p>
                    <p className={statValueCls}>{fmtRpShort(c.revenue)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className={statLabelCls}>Keuntungan</p>
                    <p className="text-sm font-bold text-skin-accent-text mt-1 break-words">
                      {fmtRpShort(c.profit)}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className={statLabelCls}>Jumlah Beli</p>
                    <p className={statValueCls}>{fmtNumber(c.qty)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className={statLabelCls}>Transaksi</p>
                    <p className={statValueCls}>{fmtNumber(c.jumlahTransaksi)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </details>
    </div>
  );
}
