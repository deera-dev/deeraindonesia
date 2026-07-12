/**
 * InventoryTab.jsx — halaman "Persediaan" (dulu "Inventory"): Ringkasan
 * Persediaan, Kesehatan Stok, Saran Tambah Stok (semua terbuka/visible),
 * lalu Stok Tidak Bergerak, Stok Berlebih & Kurang, Indikator Risiko Stok
 * (detail pendukung, <details> collapsed by default — progressive
 * disclosure, instruksi redesign poin 6/14: tab ini termasuk paling
 * padat dengan 6 section, 3 paling actionable ditaruh terbuka).
 *
 * SELURUH angka berasal langsung dari RPC `analytics_inventory` (lewat
 * ../../hooks → useAnalyticsInventory) — TIDAK ADA sort/filter/reduce/
 * agregasi bisnis di komponen ini. Reshape yang dilakukan di sini murni
 * RENAME/FORMAT field (mis. `stockRiskIndicator[].category` digabung jadi
 * 1 string tampilan) — pola sama dengan AdvancedTab.jsx, BUKAN kalkulasi
 * baru. TIDAK ADA perubahan pada hook/RPC/urutan data di redesign ini —
 * HANYA label teks, istilah, dan deskripsi section.
 *
 * ── Keterbatasan data (WAJIB dibaca, detail lengkap di migration SQL) ───
 * Saran Restock/Stok Berlebih/Stok Kurang/Prioritas Restock SENGAJA TIDAK
 * memakai tabel `expected_stok` — tabel itu adalah baseline rekonsiliasi
 * produksi ("Buku Potongan"), BUKAN target restock, memakainya di sini
 * akan mengarang hubungan yang tidak ada. Seluruh metric restock di sini
 * murni dari kecepatan jual aktual + stok saat ini. `inventoryTurnover`/
 * `daysOfInventory` memakai metode "stok saat ini ÷ rata-rata COGS
 * harian" (BUKAN average-inventory) karena tidak ada snapshot stok
 * historis — lebih sederhana tapi kurang presisi, dijelaskan apa adanya
 * lewat hint KPI.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REDESIGN UI/UX (2026-07) — istilah disederhanakan untuk owner toko:
 * "Inventory"→"Persediaan", "Inventory Turnover"→"Kecepatan Perputaran
 * Stok", "Days of Inventory"→"Kecukupan Stok", "Dead Stock"→"Stok Tidak
 * Bergerak", "Overstock"→"Stok Berlebih", "Understock"→"Stok Kurang".
 * Setiap section punya deskripsi 1 kalimat; KPI punya hint penjelasan.
 */
import { useAnalyticsInventory } from "../../hooks";
import { fmtRp, fmtRpShort, fmtNumber, fmtDecimal } from "../../utils";
import KpiCard from "../shared/KpiCard";
import Leaderboard from "../shared/Leaderboard";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { sectionTitleCls, subTitleCls, statLabelCls, statValueCls } from "../shared/classNames";

function fmtDays(v) {
  return v == null ? "Belum pernah terjual" : `${fmtNumber(v)} hari`;
}

function fmtCoverDays(v) {
  return `${fmtDecimal(v)} hari cover`;
}

function SectionDescription({ children }) {
  return <p className="text-xs text-skin-text4 -mt-1.5 mb-3">{children}</p>;
}

function DetailsHeader({ children }) {
  return (
    <summary className="cursor-pointer select-none list-none">
      <h2 className={`${sectionTitleCls} inline-flex items-center gap-1.5`}>
        <span className="inline-block transition-transform group-open:rotate-90">›</span>
        {children}
      </h2>
    </summary>
  );
}

export default function InventoryTab() {
  const {
    summary,
    stockHealth,
    deadStock,
    agingStock,
    overstock,
    understock,
    suggestedRestock,
    restockPriority,
    stockRiskIndicator,
    loading,
    error,
    refetch,
  } = useAnalyticsInventory();

  if (error) {
    return <ErrorState message="Gagal memuat Persediaan." onRetry={refetch} />;
  }

  if (loading) {
    return (
      <div className="space-y-7 sm:space-y-8">
        <section>
          <h2 className={sectionTitleCls}>Ringkasan Persediaan</h2>
          <LoadingState variant="kpi" />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Kesehatan Stok</h2>
          <LoadingState variant="list" rows={3} />
        </section>
        <section>
          <h2 className={sectionTitleCls}>Saran Tambah Stok</h2>
          <LoadingState variant="list" rows={4} />
        </section>
      </div>
    );
  }

  const riskItems = stockRiskIndicator.map((r) => ({
    kode: r.kode,
    value: r.category === "dead" ? "Tidak bergerak (belum pernah terjual)" : `Kritis · ${fmtDecimal(r.value)} hari cover`,
  }));

  return (
    <div className="space-y-7 sm:space-y-8">
      {/* ── Ringkasan Persediaan ── */}
      <section>
        <h2 className={sectionTitleCls}>Ringkasan Persediaan</h2>
        <SectionDescription>Nilai dan kecepatan perputaran seluruh stok yang Anda miliki saat ini.</SectionDescription>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
          <KpiCard
            label="Nilai Persediaan"
            value={fmtRpShort(summary.totalInventoryValue)}
            hint="Total nilai seluruh stok yang Anda miliki, dihitung dari harga modal."
            accent
          />
          <KpiCard label="Jenis Produk Berstok" value={fmtNumber(summary.totalSkuWithStock)} />
          <KpiCard
            label="Kecukupan Stok"
            value={`${fmtDecimal(summary.daysOfInventory)} hari`}
            hint="Perkiraan berapa hari stok masih cukup jika penjualan tetap seperti sekarang."
          />
          <KpiCard
            label="Kecepatan Perputaran Stok"
            value={`${fmtDecimal(summary.inventoryTurnover)}x`}
            sub="periode filter"
            hint="Seberapa sering stok terjual habis dan diisi ulang pada periode ini."
          />
        </div>
      </section>

      {/* ── Kesehatan Stok ── */}
      <section>
        <h2 className={sectionTitleCls}>Kesehatan Stok</h2>
        <SectionDescription>Sebaran kondisi stok Anda berdasarkan kecepatan terjual dan usia stok.</SectionDescription>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3 text-center">
          <div className="min-w-0">
            <p className={statLabelCls}>Tidak Bergerak</p>
            <p className={statValueCls}>{fmtNumber(stockHealth.dead)}</p>
          </div>
          <div className="min-w-0">
            <p className={statLabelCls}>Kritis</p>
            <p className={statValueCls}>{fmtNumber(stockHealth.critical)}</p>
          </div>
          <div className="min-w-0">
            <p className={statLabelCls}>Menipis</p>
            <p className={statValueCls}>{fmtNumber(stockHealth.low)}</p>
          </div>
          <div className="min-w-0">
            <p className={statLabelCls}>Sehat</p>
            <p className={statValueCls}>{fmtNumber(stockHealth.healthy)}</p>
          </div>
          <div className="min-w-0">
            <p className={statLabelCls}>Stok Berlebih</p>
            <p className={statValueCls}>{fmtNumber(stockHealth.overstock)}</p>
          </div>
          <div className="min-w-0">
            <p className={statLabelCls}>Tanpa Gerak (Periode Ini)</p>
            <p className={statValueCls}>{fmtNumber(stockHealth.noMovementPeriod)}</p>
          </div>
        </div>
      </section>

      {/* ── Saran Tambah Stok ── */}
      <section>
        <h2 className={sectionTitleCls}>Saran Tambah Stok</h2>
        <SectionDescription>
          Produk yang sebaiknya segera ditambah stoknya, dihitung dari kecepatan jual aktual (bukan dari Buku
          Potongan).
        </SectionDescription>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <h3 className={subTitleCls}>Saran Restock</h3>
            <Leaderboard
              items={suggestedRestock}
              valueFormatter={(v) => `${fmtNumber(v)} pcs`}
              emptyMessage="Tidak ada saran restock saat ini."
            />
          </div>
          <div>
            <h3 className={subTitleCls}>Prioritas Restock</h3>
            <Leaderboard
              items={restockPriority}
              valueFormatter={(v) => `${fmtRpShort(v)} /hari`}
              emptyMessage="Tidak ada produk prioritas restock saat ini."
            />
          </div>
        </div>
      </section>

      {/* ── Stok Tidak Bergerak (dulu "Dead & Aging Stock") — detail pendukung ── */}
      <details className="group">
        <DetailsHeader>Stok Tidak Bergerak</DetailsHeader>
        <SectionDescription>Produk yang belum pernah terjual, atau sudah lama sekali tidak terjual.</SectionDescription>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <h3 className={subTitleCls}>Belum Pernah Terjual</h3>
            <Leaderboard items={deadStock} valueFormatter={fmtDays} emptyMessage="Tidak ada produk yang belum pernah terjual." />
          </div>
          <div>
            <h3 className={subTitleCls}>Sudah Lama Tidak Terjual</h3>
            <Leaderboard items={agingStock} valueFormatter={fmtDays} emptyMessage="Belum ada data usia stok." />
          </div>
        </div>
      </details>

      {/* ── Stok Berlebih & Kurang (dulu "Overstock & Understock") — detail pendukung ── */}
      <details className="group">
        <DetailsHeader>Stok Berlebih &amp; Kurang</DetailsHeader>
        <SectionDescription>Produk dengan stok jauh lebih banyak atau lebih sedikit dari kebutuhan penjualan.</SectionDescription>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <h3 className={subTitleCls}>Stok Berlebih</h3>
            <Leaderboard items={overstock} valueFormatter={fmtCoverDays} emptyMessage="Tidak ada produk dengan stok berlebih." />
          </div>
          <div>
            <h3 className={subTitleCls}>Stok Kurang</h3>
            <Leaderboard items={understock} valueFormatter={fmtCoverDays} valueClassName={() => "text-amber-500"} emptyMessage="Tidak ada produk dengan stok kurang." />
          </div>
        </div>
      </details>

      {/* ── Indikator Risiko Stok (dulu "Stock Risk Indicator") — detail pendukung ── */}
      <details className="group">
        <DetailsHeader>Indikator Risiko Stok</DetailsHeader>
        <SectionDescription>Produk yang perlu perhatian karena tidak bergerak atau stoknya hampir habis.</SectionDescription>
        <Leaderboard
          items={riskItems}
          valueFormatter={(v) => v}
          valueClassName={(v) => (typeof v === "string" && v.startsWith("Tidak bergerak") ? "text-red-600 dark:text-red-400" : "text-amber-500")}
          emptyMessage="Tidak ada produk berisiko saat ini."
        />
      </details>
    </div>
  );
}
