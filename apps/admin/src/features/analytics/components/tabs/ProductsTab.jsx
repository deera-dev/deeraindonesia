/**
 * ProductsTab.jsx — halaman "Produk" (dulu "Products"): Produk Terbaik,
 * Harga, Kecepatan Terjual, Stok.
 *
 * SELURUH angka di sini berasal langsung dari RPC `analytics_products`
 * (lewat ../../hooks → useAnalyticsProducts) — TIDAK ADA sort/filter/
 * reduce/business logic di komponen ini, hanya `.map()` murni untuk RENDER
 * lewat komponen reusable <Leaderboard/>. TIDAK ADA perubahan pada hook/
 * RPC di redesign ini — HANYA label teks, istilah, deskripsi section, dan
 * 2 section (Harga/Kecepatan Terjual) sekarang <details> collapsed by
 * default (progressive disclosure — instruksi eksplisit redesign poin 6/14:
 * halaman ini paling padat setelah Analisis Lanjutan, "Produk Terbaik" &
 * "Stok" TETAP terbuka karena paling sering dicari, 2 lainnya detail
 * pendukung).
 *
 * Setiap entri leaderboard HANYA {kode, value} — SENGAJA TIDAK menampilkan
 * nama produk (instruksi eksplisit lama: tab Products cukup kode).
 *
 * ══════════════════════════════════════════════════════════════════════
 * REDESIGN UI/UX (2026-07) — istilah disederhanakan untuk owner toko:
 * "Omset Tertinggi"→"Penjualan Tertinggi", "Margin"→"Persentase
 * Keuntungan", "HPP"→"Modal", "Fast/Slow Moving"→"Paling Cepat/Lambat
 * Terjual". Setiap section punya deskripsi 1 kalimat.
 */
import { useAnalyticsProducts } from "../../hooks";
import { fmtRpShort, fmtNumber, fmtPercent, fmtDecimal } from "../../utils";
import Leaderboard from "../shared/Leaderboard";
import LoadingState from "../shared/LoadingState";
import ErrorState from "../shared/ErrorState";
import { sectionTitleCls, subTitleCls } from "../shared/classNames";

const fmtQtyPcs = (v) => `${fmtNumber(v)} pcs`;
const fmtQtyPerHari = (v) => `${fmtDecimal(v, 2)} pcs/hari`;
const fmtHariCover = (v) => `${fmtDecimal(v, 1)} hari`;
const marginColor = (v) => (Number(v) < 0 ? "text-red-500" : "text-[#CAB170]");

function SectionDescription({ children }) {
  return <p className="text-xs text-skin-text4 -mt-1.5 mb-3">{children}</p>;
}

export default function ProductsTab() {
  const { leaderboard, harga, movement, inventory, loading, error, refetch } = useAnalyticsProducts();

  if (error) {
    return <ErrorState message="Gagal memuat Produk." onRetry={refetch} />;
  }

  if (loading) {
    return (
      <div className="space-y-7 sm:space-y-8">
        {["Produk Terbaik", "Harga", "Kecepatan Terjual", "Stok"].map((title) => (
          <section key={title}>
            <h2 className={sectionTitleCls}>{title}</h2>
            <LoadingState variant="list" rows={3} />
          </section>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-7 sm:space-y-8">
      {/* ── Produk Terbaik (dulu "Leaderboard") ── */}
      <section>
        <h2 className={sectionTitleCls}>Produk Terbaik</h2>
        <SectionDescription>Produk dengan penjualan, keuntungan, dan persentase keuntungan terbaik pada periode ini.</SectionDescription>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <h3 className={subTitleCls}>Produk Terlaris</h3>
            <Leaderboard items={leaderboard.terlaris} valueFormatter={fmtQtyPcs} emptyMessage="Belum ada penjualan pada periode ini." />
          </div>
          <div>
            <h3 className={subTitleCls}>Penjualan Tertinggi</h3>
            <Leaderboard items={leaderboard.omsetTertinggi} valueFormatter={fmtRpShort} emptyMessage="Belum ada penjualan pada periode ini." />
          </div>
          <div>
            <h3 className={subTitleCls}>Keuntungan Tertinggi</h3>
            <Leaderboard items={leaderboard.profitTertinggi} valueFormatter={fmtRpShort} emptyMessage="Belum ada keuntungan pada periode ini." />
          </div>
          <div>
            <h3 className={subTitleCls}>Persentase Keuntungan Tertinggi</h3>
            <Leaderboard items={leaderboard.marginTertinggi} valueFormatter={fmtPercent} valueClassName={marginColor} emptyMessage="Belum ada data." />
          </div>
          <div>
            <h3 className={subTitleCls}>Persentase Keuntungan Terendah</h3>
            <Leaderboard items={leaderboard.marginTerendah} valueFormatter={fmtPercent} valueClassName={marginColor} emptyMessage="Belum ada data." />
          </div>
        </div>
      </section>

      {/* ── Harga (dari transaksi aktual, ikut Global Filter) — detail
          pendukung, collapsed by default ── */}
      <details className="group">
        <summary className="cursor-pointer select-none list-none">
          <h2 className={`${sectionTitleCls} inline-flex items-center gap-1.5`}>
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Harga
          </h2>
        </summary>
        <SectionDescription>Harga jual dan modal dari transaksi aktual pada periode ini, bukan harga katalog.</SectionDescription>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <h3 className={subTitleCls}>Harga Jual Tertinggi</h3>
            <Leaderboard items={harga.hargaJualTertinggi} valueFormatter={fmtRpShort} emptyMessage="Belum ada transaksi pada periode ini." />
          </div>
          <div>
            <h3 className={subTitleCls}>Harga Jual Terendah</h3>
            <Leaderboard items={harga.hargaJualTerendah} valueFormatter={fmtRpShort} emptyMessage="Belum ada transaksi pada periode ini." />
          </div>
          <div>
            <h3 className={subTitleCls}>Modal Tertinggi</h3>
            <Leaderboard items={harga.hppTertinggi} valueFormatter={fmtRpShort} emptyMessage="Belum ada transaksi pada periode ini." />
          </div>
          <div>
            <h3 className={subTitleCls}>Modal Terendah</h3>
            <Leaderboard items={harga.hppTerendah} valueFormatter={fmtRpShort} emptyMessage="Belum ada transaksi pada periode ini." />
          </div>
        </div>
      </details>

      {/* ── Kecepatan Terjual (dulu "Movement") — detail pendukung, collapsed by default ── */}
      <details className="group">
        <summary className="cursor-pointer select-none list-none">
          <h2 className={`${sectionTitleCls} inline-flex items-center gap-1.5`}>
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Kecepatan Terjual
          </h2>
        </summary>
        <SectionDescription>Rata-rata jumlah produk terjual per hari pada periode ini.</SectionDescription>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <h3 className={subTitleCls}>Paling Cepat Terjual</h3>
            <Leaderboard items={movement.fastMoving} valueFormatter={fmtQtyPerHari} emptyMessage="Belum ada penjualan pada periode ini." />
          </div>
          <div>
            <h3 className={subTitleCls}>Paling Lambat Terjual</h3>
            <Leaderboard items={movement.slowMoving} valueFormatter={fmtQtyPerHari} emptyMessage="Belum ada penjualan pada periode ini." />
          </div>
        </div>
      </details>

      {/* ── Stok (dulu "Inventory") ── */}
      <section>
        <h2 className={sectionTitleCls}>Stok</h2>
        <SectionDescription>Kondisi stok produk Anda saat ini.</SectionDescription>
        <div className="space-y-4 sm:space-y-5">
          <div>
            <h3 className={subTitleCls}>Stok Terbanyak</h3>
            <Leaderboard items={inventory.stokTerbanyak} valueFormatter={fmtQtyPcs} emptyMessage="Belum ada data stok." />
          </div>
          <div>
            <h3 className={subTitleCls}>Hampir Habis</h3>
            <Leaderboard items={inventory.stokHampirHabis} valueFormatter={fmtHariCover} valueClassName={() => "text-amber-500"} emptyMessage="Tidak ada produk hampir habis." />
          </div>
          <div>
            <h3 className={subTitleCls}>Tidak Ada Penjualan (Periode Ini)</h3>
            <Leaderboard items={inventory.tidakAdaPenjualanPeriode} valueFormatter={fmtQtyPcs} emptyMessage="Semua produk berstok terjual pada periode ini." />
          </div>
          <div>
            <h3 className={subTitleCls}>Tidak Pernah Terjual (Sepanjang Waktu)</h3>
            <Leaderboard items={inventory.tidakPernahTerjual} valueFormatter={fmtQtyPcs} emptyMessage="Semua produk pernah terjual." />
          </div>
        </div>
      </section>
    </div>
  );
}
