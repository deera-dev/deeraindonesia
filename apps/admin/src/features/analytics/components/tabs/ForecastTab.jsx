/**
 * ForecastTab.jsx — halaman "Prediksi Penjualan" (dulu "Forecast"):
 * Prediksi Penjualan (Rupiah), Prediksi Keuntungan dibuka langsung
 * (paling sering dicari), lalu Prediksi Jumlah Terjual, Prediksi Jumlah
 * Pelanggan, Prediksi Permintaan per Produk sebagai detail pendukung
 * (<details> collapsed by default), dan Saran Restock Berdasarkan
 * Prediksi dibuka langsung lagi (paling actionable — "apa yang perlu
 * dibeli"). SELURUH angka berasal langsung dari RPC `analytics_forecast`
 * (lewat ../../hooks → useAnalyticsForecast). TIDAK ADA kalkulasi
 * MA/WMA/ES di komponen ini — komponen ini murni reshape (rename field) +
 * format untuk render, pola SAMA dengan seluruh tab lain
 * (Advanced/Inventory). TIDAK ADA perubahan pada hook/RPC/urutan data di
 * redesign ini — HANYA label teks, istilah, dan pengelompokan tampilan.
 *
 * ── Metode (WAJIB explainable, TANPA AI/ML — lihat migration SQL) ───────
 * Setiap series forecast menampilkan 3 angka sekaligus (bukan 1 angka
 * "black box"): Moving Average (MA), Weighted Moving Average (WMA — bobot
 * linear, periode terbaru lebih berat), Exponential Smoothing (ES —
 * level = alpha × nilai terbaru + (1-alpha) × level sebelumnya). Ketiganya
 * reuse `useAnalyticsForecast()`, tidak ada duplikasi hitung di frontend.
 * Istilah statistik ini SENGAJA disembunyikan dari tampilan utama (terlalu
 * teknis untuk owner toko non-teknis) — direlabel jadi "Perkiraan
 * Stabil"/"Perkiraan Menyesuaikan"/"Perkiraan Tren Terbaru" dengan hint
 * penjelasan, angka MA/WMA/ES/alpha/lookback mentah tetap tersedia via
 * <details> "Detail Teknis" (tidak dihapus, hanya disembunyikan default).
 *
 * ── Keterbatasan data (WAJIB dibaca, detail lengkap di migration SQL) ───
 * `ma`/`wma`/`es` pada setiap *Forecast bisa `null` APA ADANYA dari RPC
 * kalau histori < 2 titik data — komponen ini menampilkan "Data belum
 * cukup" secara eksplisit, BUKAN 0 atau angka karangan. `productDemandForecast`
 * bisa berisi produk dengan forecast `null` (histori kurang) — dipisah
 * dari daftar yang punya forecast valid. `restockForecast` SUDAH difilter
 * oleh RPC (hanya produk dengan forecast valid) — SENGAJA TIDAK memakai
 * `expected_stok`, murni dari kecepatan jual (ES) + stok saat ini.
 *
 * Urutan `productDemandForecast`/`restockForecast` dari RPC adalah
 * ALFABETIS per kode (BUKAN ranking by value) — makanya dirender via
 * <BarList/> (urutan apa adanya, tanpa rank badge), bukan <Leaderboard/>.
 */
import { useAnalyticsForecast } from "../../hooks";
import { fmtRp, fmtNumber, fmtPeriode, fmtDate } from "../../utils";
import { TREND_GRANULARITIES, FORECAST_RESTOCK_HORIZON_PERIODS_DEFAULT } from "../../constants";
import KpiCard from "../shared/KpiCard";
import TrendChart from "../shared/TrendChart";
import BarList from "../shared/BarList";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { sectionTitleCls, subTitleCls } from "../shared/classNames";

function granularityLabel(value) {
  return TREND_GRANULARITIES.find((g) => g.value === value)?.label ?? value;
}

function SectionDescription({ children }) {
  return <p className="text-xs text-skin-text4 -mt-1.5 mb-3">{children}</p>;
}

// Satu kartu metode forecast — null ditampilkan sebagai "Data belum
// cukup" APA ADANYA, tidak pernah diubah jadi 0.
function MethodCard({ label, value, formatter, sub, hint }) {
  if (value == null) {
    return <KpiCard label={label} value="Data belum cukup" sub="histori masih terlalu pendek" hint={hint} />;
  }
  return <KpiCard label={label} value={formatter(value)} sub={sub} hint={hint} />;
}

// Satu blok forecast lengkap: chart histori + 3 kartu perkiraan — dipakai
// berulang untuk tiap jenis prediksi supaya tidak menulis ulang bentuk
// yang sama 4x (DRY di level komponen, BUKAN business logic).
function ForecastSeriesSection({ title, description, note, forecast, granularity, formatter, color, lookbackPeriods }) {
  const chartData = forecast.history.map((h) => ({
    label: fmtPeriode(h.periode, granularity),
    value: h.value,
  }));

  return (
    <section>
      <h2 className={sectionTitleCls}>{title}</h2>
      {description && <SectionDescription>{description}</SectionDescription>}
      {note && <p className="text-xs text-skin-text4 -mt-1.5 mb-3">{note}</p>}
      <TrendChart
        data={chartData}
        series={[{ dataKey: "value", label: title, color, formatter }]}
        height={220}
      />
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-3">
        <MethodCard
          label="Perkiraan Stabil"
          value={forecast.ma}
          formatter={formatter}
          sub={`rata-rata ${fmtNumber(lookbackPeriods)} periode terakhir`}
          hint="Rata-rata sederhana dari beberapa periode terakhir."
        />
        <MethodCard
          label="Perkiraan Menyesuaikan"
          value={forecast.wma}
          formatter={formatter}
          sub="periode terbaru lebih diutamakan"
          hint="Mirip rata-rata, tapi periode terbaru lebih berpengaruh."
        />
        <MethodCard
          label="Perkiraan Tren Terbaru"
          value={forecast.es}
          formatter={formatter}
          sub="paling mengikuti perubahan terbaru"
          hint="Prediksi yang paling cepat menyesuaikan dengan tren terbaru."
        />
      </div>
    </section>
  );
}

export default function ForecastTab() {
  const {
    meta,
    revenueForecast,
    profitForecast,
    salesForecast,
    customerForecast,
    productDemandForecast,
    restockForecast,
    loading,
    error,
    refetch,
  } = useAnalyticsForecast();

  if (error) {
    return <ErrorState message="Gagal memuat Prediksi Penjualan." onRetry={refetch} />;
  }

  if (loading) {
    return (
      <div className="space-y-7 sm:space-y-8">
        <section>
          <h2 className={sectionTitleCls}>Prediksi Penjualan (Rupiah)</h2>
          <LoadingState variant="chart" />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Prediksi Keuntungan</h2>
          <LoadingState variant="chart" />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Saran Restock Berdasarkan Prediksi</h2>
          <LoadingState variant="list" rows={4} />
        </section>
      </div>
    );
  }

  const demandWithForecast = productDemandForecast
    .filter((p) => p.es != null)
    .map((p) => ({ label: `${p.kode} — ${p.nama}`, value: p.es }));
  const demandWithoutForecast = productDemandForecast.filter((p) => p.es == null);

  const restockBars = restockForecast.map((r) => ({
    label: `${r.kode} — permintaan ${fmtNumber(r.forecastedDemandNextPeriod)} pcs · stok ${fmtNumber(r.currentStock)} pcs`,
    value: r.suggestedOrderQty,
  }));

  return (
    <div className="space-y-7 sm:space-y-8">
      {/* ── Tentang Prediksi Ini ── */}
      <section>
        <h2 className={sectionTitleCls}>Tentang Prediksi Ini</h2>
        <SectionDescription>
          Perkiraan penjualan ke depan berdasarkan histori transaksi, bukan tebakan — dihitung pakai rumus
          matematika sederhana, bukan AI.
        </SectionDescription>
        {meta.nextPeriodeLabel && (
          <p className="text-xs text-skin-text4">
            Prediksi berlaku untuk periode berikutnya, mulai {fmtDate(meta.nextPeriodeLabel)}.
          </p>
        )}
        <details className="group mt-2">
          <summary className="cursor-pointer select-none list-none">
            <span className="inline-flex items-center gap-1.5 text-xs text-skin-text3 hover:text-skin-text transition">
              <span className="inline-block transition-transform group-open:rotate-90">›</span>
              Detail Teknis
            </span>
          </summary>
          <p className="text-xs text-skin-text4 mt-2">
            Granularity {granularityLabel(meta.granularity)} · {fmtNumber(meta.historyBucketCount)} periode histori ·
            alpha (Exponential Smoothing) {meta.alpha} · lookback (Moving Average) {fmtNumber(meta.lookbackPeriods)}{" "}
            periode.
          </p>
        </details>
      </section>

      {/* ── Prediksi Penjualan & Keuntungan (dibuka langsung, paling dicari) ── */}
      <ForecastSeriesSection
        title="Prediksi Penjualan (Rupiah)"
        forecast={revenueForecast}
        granularity={meta.granularity}
        formatter={fmtRp}
        color="#CAB170"
        lookbackPeriods={meta.lookbackPeriods}
      />
      <ForecastSeriesSection
        title="Prediksi Keuntungan"
        forecast={profitForecast}
        granularity={meta.granularity}
        formatter={fmtRp}
        color="#4C9A6A"
        lookbackPeriods={meta.lookbackPeriods}
      />

      {/* ── Prediksi Jumlah Terjual & Jumlah Pelanggan — detail pendukung ── */}
      <details className="group">
        <summary className="cursor-pointer select-none list-none">
          <h2 className={`${sectionTitleCls} inline-flex items-center gap-1.5`}>
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Prediksi Jumlah Terjual &amp; Pelanggan
          </h2>
        </summary>
        <div className="space-y-6 mt-1">
          <ForecastSeriesSection
            title="Prediksi Jumlah Terjual"
            note="Perkiraan jumlah produk yang akan terjual (pcs) per periode."
            forecast={salesForecast}
            granularity={meta.granularity}
            formatter={fmtNumber}
            color="#5B8DEF"
            lookbackPeriods={meta.lookbackPeriods}
          />
          <ForecastSeriesSection
            title="Prediksi Jumlah Pelanggan"
            note="Perkiraan jumlah pelanggan unik (bernama) per periode."
            forecast={customerForecast}
            granularity={meta.granularity}
            formatter={fmtNumber}
            color="#B565A7"
            lookbackPeriods={meta.lookbackPeriods}
          />
        </div>
      </details>

      {/* ── Prediksi Permintaan per Produk — detail pendukung ── */}
      <details className="group">
        <summary className="cursor-pointer select-none list-none">
          <h2 className={`${sectionTitleCls} inline-flex items-center gap-1.5`}>
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Prediksi Permintaan per Produk
          </h2>
        </summary>
        <SectionDescription>
          5 produk teratas — memakai perkiraan yang paling mengikuti tren terbaru. Urutan mengikuti kode produk,
          bukan ranking permintaan.
        </SectionDescription>
        <BarList
          items={demandWithForecast}
          valueFormatter={(v) => `${fmtNumber(v)} pcs`}
          emptyMessage="Belum ada produk dengan histori cukup untuk prediksi."
        />
        {demandWithoutForecast.length > 0 && (
          <p className="text-xs text-skin-text4 mt-3">
            Data belum cukup untuk: {demandWithoutForecast.map((p) => p.kode).join(", ")}.
          </p>
        )}
      </details>

      {/* ── Saran Restock Berdasarkan Prediksi (dibuka langsung, paling actionable) ── */}
      <section>
        <h2 className={sectionTitleCls}>Saran Restock Berdasarkan Prediksi</h2>
        <SectionDescription>
          Perkiraan kebutuhan order untuk {fmtNumber(FORECAST_RESTOCK_HORIZON_PERIODS_DEFAULT)} periode ke depan,
          dari kecepatan jual aktual + stok saat ini — bukan dari Buku Potongan. Hanya produk dengan histori cukup
          yang tampil di sini.
        </SectionDescription>
        <BarList
          items={restockBars}
          valueFormatter={(v) => `${fmtNumber(v)} pcs disarankan`}
          emptyMessage="Tidak ada saran restock saat ini."
        />
      </section>
    </div>
  );
}
