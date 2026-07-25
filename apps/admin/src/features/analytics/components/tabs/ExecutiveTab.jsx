/**
 * ExecutiveTab.jsx — halaman "Ringkasan Bisnis" (dulu "Executive
 * Dashboard"/tab Executive). AGREGATOR MURNI dari 5 hook yang SUDAH ADA
 * (Overview/Advanced/Customers/Inventory/Forecast) lewat
 * `useAnalyticsExecutive()` (../../hooks). TIDAK ADA RPC baru
 * (`analytics_executive()` SENGAJA TIDAK dibuat — instruksi eksplisit
 * Denny, lihat komentar panjang di hooks.js). Komponen ini TIDAK melakukan
 * sort/filter/reduce/agregasi bisnis apa pun — seluruh angka SUDAH final.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REDESIGN UI/UX TOTAL (2026-07) — perubahan requirement eksplisit Denny
 * ══════════════════════════════════════════════════════════════════════
 * Halaman ini SEKARANG jadi BERANDA Analytics (default saat dibuka, lihat
 * DEFAULT_ANALYTICS_SECTION di ../../constants.js + AnalyticsPage.jsx) —
 * evaluasi ulang eksplisit Denny: ini halaman yang PALING SERING dibuka
 * owner toko, jadi dijadikan titik masuk utama, bukan dipertahankan di
 * urutan lama (dulu paling akhir).
 *
 * Prinsip desain (instruksi eksplisit): dashboard ini BUKAN tempat melihat
 * SEMUA KPI — fokus menjawab 4 pertanyaan: (1) Bagaimana kondisi bisnis
 * saat ini? (2) Apa masalah terbesar? (3) Apa peluang terbesar? (4) Apa
 * yang harus dilakukan sekarang? Konsekuensinya:
 *   - Urutan section MENGIKUTI 4 pertanyaan itu (bukan lagi urutan
 *     "KPI → Best Performance → Opportunity → Risk → Insight → ...").
 *   - KPI utama dipangkas dari 7 kartu jadi 4 kartu (Total Penjualan/
 *     Keuntungan/Persentase Keuntungan/Pertumbuhan) — 3 angka lain
 *     (Pelanggan/Transaksi/Pelanggan Kembali) dipindah ke <details>
 *     collapsed "Lihat Detail Angka Lainnya" (progressive disclosure,
 *     BUKAN dihapus — masih bisa dilihat kalau owner memang butuh).
 *   - Forecast Summary & Inventory Summary (dulu masing-masing 3-4
 *     KpiCard) diringkas jadi 1 kalimat naratif per section (InsightCard),
 *     BUKAN grid angka — angka dead/critical stock TIDAK diulang di sini
 *     karena SUDAH tercakup di Tindakan Prioritas & Risiko Terbesar
 *     (instruksi eksplisit: hindari representasi ganda utk angka yang
 *     sama).
 *   - Quick Action (sekarang "Tindakan Prioritas") diurutkan Tinggi/
 *     Sedang/Rendah — lihat buildPrioritizedQuickActions() di utils.js.
 *   - SETIAP section punya deskripsi 1 kalimat (instruksi eksplisit poin
 *     3 redesign) — owner toko belum tentu paham arti tiap bagian tanpa
 *     penjelasan.
 *
 * Istilah teknis disederhanakan (instruksi eksplisit poin 10 redesign):
 * "Executive KPI" → "Kondisi Bisnis Hari Ini", "Margin" → "Persentase
 * Keuntungan", "Revenue" → "Total Penjualan", dst — lihat label per kartu
 * di bawah.
 *
 * ── UX Audit lanjutan (2026-07, hilangkan duplikasi lintas-halaman) ────
 * Section "Performa Terbaik" (Produk/Pelanggan/Cabang Terbaik) DIHAPUS
 * dari halaman ini — datanya (bestProduct/bestCustomer/bestMarket dari
 * hooks.js) adalah OBJEK YANG SAMA PERSIS dengan
 * overview.quickInsight.produkTerlaris/customerTerbaik/pasarTerbaik yang
 * SUDAH ditampilkan penuh di section "Sorotan" pada Ringkasan Penjualan
 * (OverviewTab.jsx) — duplikasi murni tanpa memberi informasi baru atau
 * membantu keputusan apa pun, jadi dihapus (bukan disembunyikan) sesuai
 * prinsip "tampilkan versi lengkap hanya di halaman yang paling tepat".
 * `bestProduct`/`bestCustomer`/`bestMarket` TETAP dikembalikan oleh
 * useAnalyticsExecutive() (hooks.js/hooks.test.js TIDAK diubah) — hanya
 * TIDAK dikonsumsi lagi oleh komponen ini.
 *
 * Reuse penuh KpiCard/InsightCard/LoadingState/ErrorState — TIDAK ADA
 * komponen shared baru dibuat untuk isi halaman ini (SectionPicker adalah
 * komponen navigasi terpisah, bukan bagian isi tab).
 *
 * ── Keterbatasan Data (lihat juga utils.js & hooks.js) ────────────────────
 * "2 pelanggan VIP belum transaksi" dan "cabang berkembang" (contoh
 * roadmap) TIDAK diimplementasikan — tidak ada field tanggal transaksi
 * terakhir per pelanggan, dan tidak ada field growth/trend PER CABANG di
 * RPC manapun saat ini. Lihat laporan implementasi untuk detail.
 */
import { useAnalyticsExecutive } from "../../hooks";
import { fmtRpShort, fmtNumber, fmtPercent } from "../../utils";
import KpiCard from "../shared/KpiCard";
import InsightCard from "../shared/InsightCard";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { sectionTitleCls } from "../shared/classNames";

const STATUS_DOT = {
  green: "bg-emerald-500",
  yellow: "bg-amber-500",
  red: "bg-red-500",
};

const PRIORITY_META = {
  tinggi: { title: "Prioritas Tinggi", dot: "bg-red-500", border: "border-red-300 dark:border-red-900" },
  sedang: { title: "Prioritas Sedang", dot: "bg-amber-500", border: "border-amber-300 dark:border-amber-900" },
  rendah: { title: "Prioritas Rendah", dot: "bg-emerald-500", border: "border-emerald-300 dark:border-emerald-900" },
};

function fmtSignedPct(v) {
  if (v == null) return "Data belum cukup";
  const n = Number(v) || 0;
  return `${n > 0 ? "+" : ""}${n}%`;
}

function SectionDescription({ children }) {
  return <p className="text-xs text-skin-text4 -mt-1.5 mb-3">{children}</p>;
}

function ListRow({ title, detail, dotClassName }) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-2.5">
      {dotClassName && <span className={`flex-shrink-0 w-2.5 h-2.5 rounded-full mt-1 ${dotClassName}`} />}
      <div className="min-w-0">
        <p className="text-sm font-semibold text-skin-text break-words">{title}</p>
        {detail && <p className="text-xs text-skin-text3 break-words mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

function TextList({ items, emptyMessage, bulletClassName = "bg-[#CAB170]" }) {
  if (!items.length) {
    return <p className="text-sm text-skin-text3 text-center py-5">{emptyMessage}</p>;
  }
  return (
    <ul className="space-y-2.5">
      {items.map((text, i) => (
        <li key={i} className="flex items-start gap-2.5 text-sm text-skin-text2 break-words">
          <span className={`flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full ${bulletClassName}`} />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

function PriorityGroup({ priorityKey, items }) {
  if (!items.length) return null;
  const meta = PRIORITY_META[priorityKey];
  return (
    <div className={`border ${meta.border} p-3`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
        <p className="text-[11px] font-editorial tracking-[0.15em] uppercase text-skin-text3">{meta.title}</p>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-skin-text2 break-words">
            {it.label}
            {it.detail && <span className="block text-xs text-skin-text3 mt-0.5">{it.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ExecutiveTab() {
  const {
    kpi,
    businessHealth,
    biggestOpportunity,
    biggestRisk,
    insights,
    recommendations,
    forecastSummary,
    inventorySummary,
    quickActionsPrioritized,
    loading,
    error,
    refetch,
  } = useAnalyticsExecutive();

  if (error) {
    return <ErrorState message="Gagal memuat Ringkasan Bisnis." onRetry={refetch} />;
  }

  if (loading) {
    return (
      <div className="space-y-7 sm:space-y-8">
        <section>
          <h2 className={sectionTitleCls}>Kondisi Bisnis Hari Ini</h2>
          <LoadingState variant="kpi" />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Kesehatan Bisnis</h2>
          <LoadingState variant="list" rows={3} />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Tindakan Prioritas</h2>
          <LoadingState variant="list" rows={3} />
        </section>
      </div>
    );
  }

  const hasQuickActions =
    quickActionsPrioritized.tinggi.length > 0 ||
    quickActionsPrioritized.sedang.length > 0 ||
    quickActionsPrioritized.rendah.length > 0;

  const hasForecast = forecastSummary.revenue.es != null || forecastSummary.sales.es != null;

  return (
    <div className="space-y-7 sm:space-y-8">
      {/* ── 1. Kondisi Bisnis Hari Ini (dulu "Executive KPI") ── */}
      <section>
        <h2 className={sectionTitleCls}>Kondisi Bisnis Hari Ini</h2>
        <SectionDescription>Angka paling penting pada periode yang Anda pilih di filter atas.</SectionDescription>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
          <KpiCard label="Total Penjualan" value={fmtRpShort(kpi.revenue)} hint="Total nilai seluruh penjualan." accent />
          <KpiCard label="Keuntungan" value={fmtRpShort(kpi.profit)} hint="Total keuntungan setelah dikurangi modal." warn={kpi.profit > 0} />
          <KpiCard label="Persentase Keuntungan" value={fmtPercent(kpi.marginPct)} hint="Berapa persen dari penjualan yang menjadi keuntungan." />
          <KpiCard label="Pertumbuhan Bulanan" value={fmtSignedPct(kpi.growthMomPct)} hint="Perbandingan penjualan bulan ini vs bulan lalu." />
        </div>
        <details className="mt-3 group">
          <summary className="cursor-pointer select-none text-xs font-editorial tracking-[0.12em] uppercase text-skin-text3 hover:text-skin-text transition list-none flex items-center gap-1.5">
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Lihat Detail Angka Lainnya
          </summary>
          <div className="grid grid-cols-3 gap-2.5 sm:gap-3 mt-3">
            <KpiCard label="Pelanggan" value={fmtNumber(kpi.customer)} sub="pelanggan" />
            <KpiCard label="Transaksi" value={fmtNumber(kpi.transaksi)} sub="transaksi" />
            <KpiCard label="Pelanggan Kembali" value={fmtNumber(kpi.repeatCustomer)} sub="belanja lagi" />
          </div>
        </details>
      </section>

      {/* ── 2. Kesehatan Bisnis (dulu "Business Health") ── */}
      <section>
        <h2 className={sectionTitleCls}>Kesehatan Bisnis</h2>
        <SectionDescription>Status singkat tiap aspek bisnis — hijau berarti sehat, kuning perlu diperhatikan, merah perlu tindakan.</SectionDescription>
        <div className="border border-skin-bdr divide-y divide-skin-bdr-lt">
          {businessHealth.map((h, i) => (
            <ListRow key={i} title={h.label} detail={h.detail} dotClassName={STATUS_DOT[h.status] ?? "bg-skin-text3"} />
          ))}
        </div>
      </section>

      {/* ── 3. Tindakan Prioritas (dulu "Quick Action", diurutkan urgensi) ── */}
      <section>
        <h2 className={sectionTitleCls}>Tindakan Prioritas</h2>
        <SectionDescription>Apa yang sebaiknya Anda lakukan sekarang, diurutkan dari yang paling mendesak.</SectionDescription>
        {!hasQuickActions ? (
          <div className="border border-emerald-300 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-6 text-center">
            <p className="text-sm text-emerald-700 dark:text-emerald-400 font-semibold">Kondisi bisnis Anda sedang baik.</p>
            <p className="text-xs text-skin-text3 mt-1">Tidak ada tindakan mendesak yang perlu dilakukan saat ini.</p>
          </div>
        ) : (
          <div className="space-y-3">
            <PriorityGroup priorityKey="tinggi" items={quickActionsPrioritized.tinggi} />
            <PriorityGroup priorityKey="sedang" items={quickActionsPrioritized.sedang} />
            <PriorityGroup priorityKey="rendah" items={quickActionsPrioritized.rendah} />
          </div>
        )}
      </section>

      {/* ── 4. Risiko Terbesar ── */}
      <section>
        <h2 className={sectionTitleCls}>Risiko Terbesar</h2>
        <SectionDescription>Produk yang berpotensi merugikan bisnis Anda kalau dibiarkan.</SectionDescription>
        {biggestRisk.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-5">Tidak ada risiko signifikan terdeteksi.</p>
        ) : (
          <div className="border border-skin-bdr divide-y divide-skin-bdr-lt">
            {biggestRisk.map((r, i) => (
              <ListRow key={i} title={`${r.kode} — ${r.category}`} detail={r.detail} dotClassName="bg-red-500" />
            ))}
          </div>
        )}
      </section>

      {/* ── 5. Peluang Terbesar ── */}
      <section>
        <h2 className={sectionTitleCls}>Peluang Terbesar</h2>
        <SectionDescription>Produk yang layak Anda siapkan lebih banyak karena permintaannya tinggi.</SectionDescription>
        {biggestOpportunity.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-5">
            Belum ada rekomendasi restock dari perkiraan penjualan pada periode ini.
          </p>
        ) : (
          <div className="border border-skin-bdr divide-y divide-skin-bdr-lt">
            {biggestOpportunity.map((o, i) => (
              <ListRow key={i} title={o.kode} detail={o.detail} dotClassName="bg-emerald-500" />
            ))}
          </div>
        )}
      </section>

      {/* ── 6. Insight Bisnis ── */}
      <section>
        <h2 className={sectionTitleCls}>Insight Bisnis</h2>
        <SectionDescription>Hal-hal penting yang perlu Anda ketahui, disimpulkan langsung dari data penjualan.</SectionDescription>
        <TextList
          items={insights}
          emptyMessage="Belum ada insight yang bisa disimpulkan dari data periode ini."
          bulletClassName="bg-[#CAB170]"
        />
      </section>

      {/* ── 7. Rekomendasi ── */}
      <section>
        <h2 className={sectionTitleCls}>Rekomendasi</h2>
        <SectionDescription>Saran langkah selanjutnya berdasarkan kondisi bisnis Anda saat ini.</SectionDescription>
        <TextList
          items={recommendations}
          emptyMessage="Belum ada rekomendasi untuk periode ini."
          bulletClassName="bg-emerald-500"
        />
      </section>

      {/* ── 8. Prediksi Singkat (dulu "Forecast Summary", diringkas jadi kalimat) ── */}
      <section>
        <h2 className={sectionTitleCls}>Prediksi Singkat</h2>
        <SectionDescription>Perkiraan penjualan periode berikutnya, berdasarkan pola penjualan sebelumnya — bukan jaminan.</SectionDescription>
        {!hasForecast ? (
          <p className="text-sm text-skin-text3 text-center py-5">
            Riwayat penjualan belum cukup panjang untuk membuat perkiraan.
          </p>
        ) : (
          <InsightCard
            label="Perkiraan Penjualan Berikutnya"
            primary={forecastSummary.revenue.es != null ? fmtRpShort(forecastSummary.revenue.es) : "Data belum cukup"}
            metric={
              forecastSummary.profit.es != null && forecastSummary.sales.es != null
                ? `Keuntungan sekitar ${fmtRpShort(forecastSummary.profit.es)} · ${fmtNumber(forecastSummary.sales.es)} pcs terjual`
                : "Lihat halaman Prediksi Penjualan untuk detail lengkap."
            }
            accent
          />
        )}
      </section>

      {/* ── 9. Ringkasan Persediaan (dulu "Inventory Summary", diringkas —
          jumlah stok mati/kritis TIDAK diulang, sudah tercakup di Tindakan
          Prioritas & Risiko Terbesar di atas) ── */}
      <section>
        <h2 className={sectionTitleCls}>Ringkasan Persediaan</h2>
        <SectionDescription>Perkiraan nilai dan daya tahan stok Anda saat ini.</SectionDescription>
        <InsightCard
          label="Nilai & Ketahanan Stok"
          primary={fmtRpShort(inventorySummary.totalInventoryValue)}
          metric={`Cukup untuk sekitar ${fmtNumber(inventorySummary.daysOfInventory)} hari penjualan, jika penjualan tetap seperti sekarang.`}
        />
      </section>
    </div>
  );
}
