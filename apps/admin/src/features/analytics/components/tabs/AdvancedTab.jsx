/**
 * AdvancedTab.jsx — halaman "Analisis Lanjutan" (dulu "Advanced"): insight
 * bisnis tingkat lanjut di atas data yang SUDAH ada (Tingkat Retur,
 * Persentase Keuntungan Keseluruhan, Produk Naik & Turun, Kontribusi
 * Penjualan, Kombinasi Produk, Produk Paling Berpengaruh (Pareto),
 * Kelompok Produk Penting (ABC), Pelanggan Baru vs Lama, Waktu Penjualan,
 * Perbandingan Periode, Penyumbang Penjualan Terbesar, Risiko Keuntungan,
 * Sebaran Penjualan Hari Kerja vs Akhir Pekan).
 *
 * ══════════════════════════════════════════════════════════════════════
 * REDESIGN UI/UX (2026-07) — halaman ini PALING PADAT di seluruh
 * Analytics (12 section flat sebelumnya). Direstrukturisasi jadi 1
 * section terbuka ("Angka Penting", paling sering dilihat) + 7 accordion
 * (<details> collapsed by default) yang mengelompokkan section-section
 * lama berdasarkan tema, supaya halaman ini terasa seperti "menu
 * eksplorasi lanjutan" untuk yang mau menggali lebih jauh — BUKAN
 * dashboard yang harus dibaca semua sekaligus (instruksi redesign poin
 * 6/14). TIDAK ADA section yang dihapus — seluruh data lama tetap ada,
 * hanya dikelompokkan ulang + istilah disederhanakan (Pareto→"Produk
 * Paling Berpengaruh", ABC Classification→"Kelompok Produk Penting",
 * Revenue Concentration→"Penyumbang Penjualan Terbesar", Customer
 * Concentration→"Pelanggan Paling Berkontribusi", Market Concentration→
 * "Cabang Penyumbang Penjualan Terbesar", Contribution→"Kontribusi
 * Penjualan").
 *
 * SELURUH angka berasal langsung dari RPC `analytics_advanced` (lewat
 * ../../hooks → useAnalyticsAdvanced) — TIDAK ADA sort/filter/reduce/
 * agregasi bisnis di komponen ini. Satu-satunya reshape yang dilakukan di
 * sini adalah RENAME field murni (mis. `growthPct`/`cumulativePct` →
 * `value` supaya cocok dengan kontrak <Leaderboard/>) — pola yang SAMA
 * dengan reshape `buckets` di TrendsTab.jsx, BUKAN kalkulasi baru. TIDAK
 * ADA perubahan pada hook/RPC/urutan data di redesign ini.
 *
 * ── "Revenue vs Profit Comparison" & "Monthly Comparison" (deret waktu) ──
 * SENGAJA TIDAK dibuat ulang di sini — sudah tercakup oleh tab Tren
 * Penjualan (chart gabungan Penjualan/Keuntungan/Jumlah Terjual, toggle
 * granularity Bulanan). Yang ada DI SINI untuk perbandingan periode adalah
 * ringkasan Minggu/Bulan/Tahun ke Minggu/Bulan/Tahun sebelumnya (delta %
 * 2 periode kalender PENUH terakhir), lihat migration SQL Phase 6.
 *
 * ── Keterbatasan data (WAJIB dibaca, lihat juga migration SQL) ──────────
 * `periodComparison.mom`/`.yoy`/`.wow` bisa `null` kalau histori toko
 * belum mencakup 2 periode kalender penuh — komponen ini menampilkan
 * pesan eksplisit "Data belum cukup", BUKAN 0 atau angka yang dikira-kira.
 * `hourlyPerformance` mengasumsikan zona waktu Asia/Jakarta (WIB).
 */
import { useAnalyticsAdvanced } from "../../hooks";
import { fmtRp, fmtRpShort, fmtNumber, fmtPercent, fmtDecimal } from "../../utils";
import KpiCard from "../shared/KpiCard";
import Leaderboard from "../shared/Leaderboard";
import BarList from "../shared/BarList";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { sectionTitleCls, subTitleCls } from "../shared/classNames";

function fmtSignedPct(v) {
  const n = Number(v) || 0;
  return `${n > 0 ? "+" : ""}${n}%`;
}

// Field pct dari Phase 6 Extension (abcClassification.revenuePct,
// revenueConcentration.*, customerConcentration.top5Pct,
// marketConcentration[].pct, marginRisk *.marginPct) SUDAH berupa angka
// persen (mis. 45.2 = 45,2%) dari SQL (ROUND(... * 100, 1)) — BUKAN
// fraksi 0..1 seperti fmtPercent (utils.js) yang dipakai kpi.returnRate
// dkk. fmtPct1 murni menambah suffix "%", TIDAK ada kalkulasi.
function fmtPct1(v) {
  return `${v}%`;
}

function SectionDescription({ children }) {
  return <p className="text-xs text-skin-text4 -mt-1.5 mb-3">{children}</p>;
}

// Label untuk sub-kelompok leaderboard DI DALAM sebuah accordion (dulu
// h3/subTitleCls saat masih section h2 sendiri) — konsisten dengan pola
// caption kecil yang sudah dipakai di MarketDetailPanel.jsx.
function InnerLabel({ children }) {
  return <h4 className="text-xs font-semibold text-skin-text2 mb-2">{children}</h4>;
}

function AccordionHeader({ children }) {
  return (
    <summary className="cursor-pointer select-none list-none">
      <h2 className={`${sectionTitleCls} inline-flex items-center gap-1.5`}>
        <span className="inline-block transition-transform group-open:rotate-90">›</span>
        {children}
      </h2>
    </summary>
  );
}

function PeriodComparisonCard({ label, comparison, insufficientSub }) {
  if (!comparison) {
    return <KpiCard label={label} value="Data belum cukup" sub={insufficientSub} />;
  }
  return (
    <KpiCard
      label={label}
      value={fmtSignedPct(comparison.pctChange ?? 0)}
      sub={`${fmtRpShort(comparison.previousRevenue)} → ${fmtRpShort(comparison.currentRevenue)}`}
      warn={comparison.pctChange != null && comparison.pctChange < 0}
      accent={comparison.pctChange != null && comparison.pctChange >= 0}
    />
  );
}

export default function AdvancedTab() {
  const {
    kpi,
    growth,
    contribution,
    productMix,
    pareto,
    newVsReturning,
    weekdayPerformance,
    hourlyPerformance,
    periodComparison,
    abcClassification,
    revenueConcentration,
    customerConcentration,
    marketConcentration,
    marginRisk,
    salesDistribution,
    loading,
    error,
    refetch,
  } = useAnalyticsAdvanced();

  if (error) {
    return <ErrorState message="Gagal memuat Analisis Lanjutan." onRetry={refetch} />;
  }

  if (loading) {
    return (
      <div className="space-y-7 sm:space-y-8">
        <section>
          <h2 className={sectionTitleCls}>Angka Penting</h2>
          <LoadingState variant="kpi" />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Produk Naik &amp; Turun</h2>
          <LoadingState variant="list" rows={4} />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Waktu Penjualan</h2>
          <LoadingState variant="list" rows={4} />
        </section>
      </div>
    );
  }

  const topGrowthItems = growth.topGrowth.map((g) => ({ ...g, value: g.growthPct }));
  const topDecliningItems = growth.topDeclining.map((g) => ({ ...g, value: g.growthPct }));
  const paretoItems = pareto.items.map((p) => ({ ...p, value: p.cumulativePct }));
  const weekdayBars = weekdayPerformance.map((w) => ({ label: w.label, value: w.revenue }));
  const hourlyBars = hourlyPerformance.map((h) => ({ label: `${String(h.hour).padStart(2, "0")}:00`, value: h.revenue }));
  const marketConcentrationItems = marketConcentration.map((m) => ({ location: m.location, value: m.pct }));
  const negativeMarginItems = marginRisk.negativeMarginProducts.map((m) => ({ kode: m.kode, value: m.marginPct }));
  const lowMarginItems = marginRisk.lowMarginProducts.map((m) => ({ kode: m.kode, value: m.marginPct }));

  return (
    <div className="space-y-7 sm:space-y-8">
      {/* ── Angka Penting (dulu "KPI Lanjutan") — satu-satunya section terbuka ── */}
      <section>
        <h2 className={sectionTitleCls}>Angka Penting</h2>
        <SectionDescription>Empat angka ringkas untuk memahami kesehatan bisnis secara umum.</SectionDescription>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <KpiCard
            label="Tingkat Retur"
            value={fmtPercent(kpi.returnRate)}
            sub={`${fmtRpShort(kpi.returnRevenueImpact)} penjualan hilang`}
            hint="Persentase transaksi yang dikembalikan (retur) pelanggan."
            warn={kpi.returnRate > 0}
          />
          <KpiCard
            label="Persentase Keuntungan Keseluruhan"
            value={fmtPercent(kpi.overallMarginPct)}
            hint="Rata-rata persentase keuntungan dari seluruh penjualan."
            accent
          />
          <KpiCard
            label="Rata-rata Barang per Transaksi"
            value={`${fmtDecimal(kpi.avgBasketSize)} pcs`}
            sub="per transaksi"
          />
          <KpiCard
            label="Rata-rata Jenis Produk per Transaksi"
            value={fmtDecimal(kpi.avgItemPerTransaksi)}
            sub="kode produk berbeda"
          />
        </div>
      </section>

      {/* ── Perbandingan Periode (Minggu/Bulan/Tahun ke periode sebelumnya) ── */}
      <details className="group">
        <AccordionHeader>Perbandingan Periode</AccordionHeader>
        <SectionDescription>
          Membandingkan 2 periode kalender PENUH terakhir (relatif ke hari ini, tidak mengikuti filter tanggal di
          atas).
        </SectionDescription>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <PeriodComparisonCard
            label="Minggu ke Minggu"
            comparison={periodComparison.wow}
            insufficientSub="perlu 2 minggu penuh riwayat"
          />
          <PeriodComparisonCard
            label="Bulan ke Bulan"
            comparison={periodComparison.mom}
            insufficientSub="perlu 2 bulan penuh riwayat"
          />
          <PeriodComparisonCard
            label="Tahun ke Tahun"
            comparison={periodComparison.yoy}
            insufficientSub="perlu 2 tahun penuh riwayat"
          />
        </div>
      </details>

      {/* ── Produk Naik & Turun (dulu "Growth & Declining Product") ── */}
      <details className="group">
        <AccordionHeader>Produk Naik &amp; Turun</AccordionHeader>
        <SectionDescription>Membandingkan penjualan periode aktif terhadap periode sebelumnya dengan panjang sama.</SectionDescription>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <InnerLabel>Produk Meningkat</InnerLabel>
            <Leaderboard
              items={topGrowthItems}
              valueFormatter={fmtSignedPct}
              valueClassName={() => "text-emerald-600 dark:text-emerald-400"}
              emptyMessage="Belum ada produk dengan data periode sebelumnya untuk dibandingkan."
            />
          </div>
          <div>
            <InnerLabel>Produk Menurun</InnerLabel>
            <Leaderboard
              items={topDecliningItems}
              valueFormatter={fmtSignedPct}
              valueClassName={() => "text-red-600 dark:text-red-400"}
              emptyMessage="Belum ada produk dengan data periode sebelumnya untuk dibandingkan."
            />
          </div>
        </div>
      </details>

      {/* ── Kontribusi Penjualan: Contribution + Product Mix + Pareto + ABC ── */}
      <details className="group">
        <AccordionHeader>Kontribusi Penjualan</AccordionHeader>
        <SectionDescription>Produk mana yang paling menyumbang penjualan dan keuntungan Anda.</SectionDescription>

        <div className="space-y-6">
          <div>
            <h3 className={subTitleCls}>Kontribusi Penjualan &amp; Keuntungan per Produk</h3>
            <div className="space-y-4 sm:space-y-5">
              <div>
                <InnerLabel>Top 10 Penyumbang Penjualan</InnerLabel>
                <Leaderboard
                  items={contribution.revenueByProduct}
                  valueFormatter={fmtRpShort}
                  emptyMessage="Belum ada penjualan pada periode ini."
                />
              </div>
              <div>
                <InnerLabel>Top 10 Penyumbang Keuntungan</InnerLabel>
                <Leaderboard
                  items={contribution.profitByProduct}
                  valueFormatter={fmtRpShort}
                  emptyMessage="Belum ada keuntungan pada periode ini."
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className={subTitleCls}>Penjualan per Jenis Bahan</h3>
            <SectionDescription>Dikelompokkan berdasarkan bahan produk (proxy kategori — belum ada sistem kategori tersendiri).</SectionDescription>
            <Leaderboard
              items={productMix}
              labelKey="bahan"
              mono={false}
              valueFormatter={(v) => fmtRpShort(v)}
              emptyMessage="Belum ada penjualan pada periode ini."
            />
          </div>

          <div>
            <h3 className={subTitleCls}>Produk Paling Berpengaruh</h3>
            <SectionDescription>
              {pareto.totalProducts > 0
                ? `${fmtNumber(pareto.productsFor80Pct)} dari ${fmtNumber(pareto.totalProducts)} produk menyumbang 80% total penjualan periode ini.`
                : "Belum ada penjualan pada periode ini."}
            </SectionDescription>
            <Leaderboard
              items={paretoItems}
              valueFormatter={(v) => `${v}%`}
              emptyMessage="Belum ada penjualan pada periode ini."
            />
          </div>

          <div>
            <h3 className={subTitleCls}>Kelompok Produk Penting</h3>
            <SectionDescription>
              Kelompok A = 0-{abcClassification.thresholds.aMaxCumulativePct}% penjualan kumulatif teratas (produk
              paling penting), B = sampai {abcClassification.thresholds.bMaxCumulativePct}%, C = sisanya (ekor
              panjang). Dihitung dari ranking Produk Paling Berpengaruh di atas.
            </SectionDescription>
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <KpiCard label="Kelompok A" value={fmtNumber(abcClassification.a.count)} sub={`${fmtPct1(abcClassification.a.revenuePct)} penjualan`} accent />
              <KpiCard label="Kelompok B" value={fmtNumber(abcClassification.b.count)} sub={`${fmtPct1(abcClassification.b.revenuePct)} penjualan`} />
              <KpiCard label="Kelompok C" value={fmtNumber(abcClassification.c.count)} sub={`${fmtPct1(abcClassification.c.revenuePct)} penjualan`} />
            </div>
          </div>
        </div>
      </details>

      {/* ── Penyumbang Penjualan Terbesar: Revenue/Customer/Market Concentration ── */}
      <details className="group">
        <AccordionHeader>Penyumbang Penjualan Terbesar</AccordionHeader>
        <SectionDescription>Seberapa besar penjualan Anda bergantung pada segelintir produk, pelanggan, atau cabang saja.</SectionDescription>

        <div className="space-y-6">
          <div>
            <h3 className={subTitleCls}>Penyumbang Penjualan Terbesar (Produk &amp; Pelanggan)</h3>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <KpiCard label="Top 5 Produk" value={fmtPct1(revenueConcentration.top5Pct)} sub="dari total penjualan" />
              <KpiCard label="Top 10 Produk" value={fmtPct1(revenueConcentration.top10Pct)} sub="dari total penjualan" />
              <KpiCard
                label="Pelanggan Paling Berkontribusi"
                value={fmtPct1(customerConcentration.top5Pct)}
                sub={`dari ${fmtNumber(customerConcentration.totalIdentifiedCustomers)} pelanggan bernama`}
              />
            </div>
          </div>

          <div>
            <h3 className={subTitleCls}>Cabang Penyumbang Penjualan Terbesar</h3>
            <SectionDescription>Persentase kontribusi penjualan per cabang terhadap total penjualan pada filter aktif.</SectionDescription>
            <Leaderboard
              items={marketConcentrationItems}
              labelKey="location"
              mono={false}
              valueFormatter={fmtPct1}
              emptyMessage="Belum ada penjualan pada periode ini."
            />
          </div>
        </div>
      </details>

      {/* ── Pelanggan Baru vs Lama (dulu "New vs Returning Revenue") ── */}
      <details className="group">
        <AccordionHeader>Pelanggan Baru vs Lama</AccordionHeader>
        <SectionDescription>Perbandingan penjualan dari pelanggan yang baru pertama kali belanja dan yang sudah pernah belanja sebelumnya.</SectionDescription>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <KpiCard
            label="Penjualan dari Pelanggan Baru"
            value={fmtRpShort(newVsReturning.newRevenue)}
            sub={`${fmtNumber(newVsReturning.newCustomerCount)} pelanggan baru`}
            accent
          />
          <KpiCard
            label="Penjualan dari Pelanggan Lama"
            value={fmtRpShort(newVsReturning.returningRevenue)}
            sub={`${fmtNumber(newVsReturning.returningCustomerCount)} pelanggan lama`}
          />
        </div>
        {newVsReturning.anonymousRevenue > 0 && (
          <p className="text-xs text-skin-text4 mt-3">
            {fmtRp(newVsReturning.anonymousRevenue)} dari transaksi tanpa nama pembeli tidak termasuk di atas.
          </p>
        )}
      </details>

      {/* ── Waktu Penjualan: Weekday/Hourly + Sales Distribution ── */}
      <details className="group">
        <AccordionHeader>Waktu Penjualan</AccordionHeader>
        <SectionDescription>Kapan pelanggan Anda paling banyak belanja — per hari, per jam, dan hari kerja vs akhir pekan.</SectionDescription>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <InnerLabel>Performa per Hari</InnerLabel>
            <BarList items={weekdayBars} valueFormatter={fmtRpShort} />
          </div>
          <div>
            <InnerLabel>Performa per Jam (WIB)</InnerLabel>
            <BarList items={hourlyBars} valueFormatter={fmtRpShort} />
          </div>
          <div>
            <InnerLabel>Hari Kerja vs Akhir Pekan</InnerLabel>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <KpiCard
                label="Hari Kerja (Sen-Jum)"
                value={fmtRpShort(salesDistribution.weekday.revenue)}
                sub={`${fmtNumber(salesDistribution.weekday.qty)} pcs · ${fmtNumber(salesDistribution.weekday.transaksi)} transaksi`}
              />
              <KpiCard
                label="Akhir Pekan (Sab-Min)"
                value={fmtRpShort(salesDistribution.weekend.revenue)}
                sub={`${fmtNumber(salesDistribution.weekend.qty)} pcs · ${fmtNumber(salesDistribution.weekend.transaksi)} transaksi`}
              />
            </div>
          </div>
        </div>
      </details>

      {/* ── Risiko Keuntungan (dulu "Margin Risk") ── */}
      <details className="group">
        <AccordionHeader>Risiko Keuntungan</AccordionHeader>
        <SectionDescription>
          Produk yang dijual rugi (persentase keuntungan negatif) dan produk dengan persentase keuntungan rendah (di
          bawah {fmtPct1(marginRisk.lowMarginThresholdPct)}) — beda dari Persentase Keuntungan Tertinggi/Terendah di
          halaman Produk (ranking umum), di sini fokus produk berisiko.
        </SectionDescription>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <InnerLabel>Rugi (Persentase Keuntungan Negatif)</InnerLabel>
            <Leaderboard
              items={negativeMarginItems}
              valueFormatter={fmtPct1}
              valueClassName={() => "text-red-600 dark:text-red-400"}
              emptyMessage="Tidak ada produk yang terjual rugi."
            />
          </div>
          <div>
            <InnerLabel>Persentase Keuntungan Rendah</InnerLabel>
            <Leaderboard
              items={lowMarginItems}
              valueFormatter={fmtPct1}
              valueClassName={() => "text-amber-500"}
              emptyMessage="Tidak ada produk dengan persentase keuntungan rendah."
            />
          </div>
        </div>
      </details>
    </div>
  );
}
