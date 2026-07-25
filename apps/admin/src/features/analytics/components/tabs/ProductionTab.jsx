/**
 * ProductionTab.jsx — halaman "Ringkasan Produksi" (Analytics).
 *
 * Pindahan dari /produksi/laporan (apps/admin/src/features/produksi-laporan,
 * folder tsb DIHAPUS — lihat App.jsx & ProduksiLayout.jsx), sesuai
 * keputusan eksplisit Denny (2026-07-19): "akan lebih sesuai menurut saya
 * dibandingkan disini". Mengikuti Global Filter Bar Analytics sepenuhnya
 * (fromDate/toDate dari date-range preset 7 Hari/30 Hari/1 Tahun/Custom) —
 * TIDAK ADA month picker terpisah lagi (keputusan eksplisit Denny, override
 * rekomendasi awal untuk mempertahankan month picker).
 *
 * SELURUH angka di sini berasal dari RPC `analytics_production` (lewat
 * ../../hooks → useAnalyticsProduction) DAN `fetchTagihanJatuhTempo` (lewat
 * useTagihanJatuhTempo) — TIDAK ADA sort/filter/reduce/business logic di
 * komponen ini, hanya `.map()` murni untuk render (lihat migration SQL
 * 20260719_analytics_phase9_production_rpc.sql untuk seluruh business
 * logic).
 *
 * ── Ide baru (system analyst brief, per instruksi eksplisit Denny) ──────
 * 1. Pemakaian Bahan Motif vs Tambahan — PAKAI FIELD `jenis` YANG SUDAH ADA
 *    di bahan_items (21/21 batch sudah terisi, TIDAK ADA data hilang) —
 *    BUKAN kategori baru. Koreksi final Denny 2026-07-19 atas keputusan
 *    sebelumnya ("tambah field kategori baru"): "pakai motif dan tambahan
 *    saja soalnya udah dipakai 21 batches already, no missing data, zero
 *    new tables needed."
 * 2. Cost Breakdown per batch (bahan/jahit/bordir/studio/lainnya) — supaya
 *    Denny bisa lihat KOMPONEN modal, bukan cuma angka HPP tunggal.
 * 3. Sell-Through & Margin Realized per batch — menjawab pertanyaan "hasil
 *    produksi ini sebenarnya LAKU atau tidak, dan untungnya berapa di
 *    harga jual SESUNGGUHNYA (bukan harga katalog)".
 * 4. Data Quality (Batch Belum Ada HPP) — sinyal data yang perlu
 *    dilengkapi, bukan disembunyikan sbg 0 begitu saja.
 */
import { useState } from "react";
import { useAnalyticsProduction, useTagihanJatuhTempo } from "../../hooks";
import { fmtRp, fmtRpShort, fmtDate, fmtPercent, fmtDecimal, daysUntil } from "../../utils";
import { PRODUCTION_LOW_SELL_THROUGH_PCT } from "../../constants";
import KpiCard from "../shared/KpiCard";
import ErrorState from "../shared/ErrorState";
import LoadingState from "../shared/LoadingState";
import { sectionTitleCls, subTitleCls } from "../shared/classNames";

const JENIS_LABELS = { motif: "Bahan Motif", tambahan: "Bahan Tambahan" };

function SectionDescription({ children }) {
  return <p className="text-xs text-skin-text4 -mt-1.5 mb-3">{children}</p>;
}

function JatuhTempoBadge({ jatuh_tempo, status_bayar }) {
  if (status_bayar === "lunas") {
    return <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Lunas</span>;
  }
  const d = daysUntil(jatuh_tempo);
  if (d < 0) {
    return <span className="text-[10px] font-semibold uppercase text-red-600">Lewat {Math.abs(d)}h</span>;
  }
  if (d <= 30) {
    return <span className="text-[10px] font-semibold uppercase text-amber-600">{d}h lagi</span>;
  }
  return <span className="text-[10px] text-skin-text3">{d}h lagi</span>;
}

export default function ProductionTab() {
  const [expandedBatch, setExpandedBatch] = useState(null);

  const {
    batches,
    ringkasan,
    totalAllTime,
    bahanUsage,
    bahanUsageByJenis,
    dataQuality,
    loading: loadingProduction,
    error: errorProduction,
    refetch: refetchProduction,
  } = useAnalyticsProduction();
  const { tagihan, loading: loadingTagihan, error: errorTagihan, refetch: refetchTagihan } = useTagihanJatuhTempo();

  const error = errorProduction || errorTagihan;
  const loading = loadingProduction || loadingTagihan;

  if (error) {
    return <ErrorState message="Gagal memuat Ringkasan Produksi." onRetry={() => { refetchProduction(); refetchTagihan(); }} />;
  }

  if (loading) {
    return (
      <div className="space-y-7 sm:space-y-8">
        {["Ringkasan Produksi", "Batch Produksi", "Pemakaian Bahan", "Tagihan Jatuh Tempo"].map((title) => (
          <section key={title}>
            <h2 className={sectionTitleCls}>{title}</h2>
            <LoadingState variant="list" rows={3} />
          </section>
        ))}
      </div>
    );
  }

  const totalTagihan = tagihan.reduce((s, t) => s + (t.total_harga ?? 0), 0);
  const sellThroughWarn = ringkasan.avgSellThroughPct > 0 && ringkasan.avgSellThroughPct < PRODUCTION_LOW_SELL_THROUGH_PCT;

  return (
    <div className="space-y-7 sm:space-y-8">
      {/* ── Ringkasan Produksi (periode filter aktif) ── */}
      <section>
        <h2 className={sectionTitleCls}>Ringkasan Produksi</h2>
        <SectionDescription>Biaya dan hasil produksi pada periode yang dipilih di filter atas.</SectionDescription>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          <KpiCard label="Total Batch" value={ringkasan.totalBatch} sub="batch produksi" />
          <KpiCard label="Total Baju" value={ringkasan.totalBaju} sub="potong diproduksi" accent />
          <KpiCard
            label="Total Modal"
            value={ringkasan.totalModal > 0 ? fmtRpShort(ringkasan.totalModal) : "—"}
            sub={ringkasan.totalModal > 0 ? "seluruh batch periode ini" : "belum ada HPP"}
          />
          <KpiCard
            label="Modal Rata-rata"
            value={ringkasan.hppAvg > 0 ? fmtRp(ringkasan.hppAvg) : "—"}
            sub={ringkasan.hppAvg > 0 ? "per baju" : "belum ada template HPP"}
          />
          <KpiCard
            label="Harga Jual Rata-rata"
            value={ringkasan.hargaJualAvg > 0 ? fmtRp(ringkasan.hargaJualAvg) : "—"}
            sub="harga katalog, per baju"
            accent
          />
          <KpiCard
            label="Sell-Through Rata-rata"
            value={`${fmtDecimal(ringkasan.avgSellThroughPct, 1)}%`}
            sub="terjual sejak diproduksi"
            hint="Persentase hasil produksi periode ini yang sudah laku terjual."
            warn={sellThroughWarn}
          />
        </div>
        {dataQuality.batchesMissingHpp > 0 && (
          <div className="mt-2 sm:mt-3 border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              {dataQuality.batchesMissingHpp} dari {dataQuality.batchesTotal} batch pada periode ini belum punya Template HPP
              maupun modal manual — modal batch tsb tercatat Rp 0 dan TIDAK ikut menghitung Modal Rata-rata di atas.
            </p>
          </div>
        )}
      </section>

      {/* ── Batch Produksi ── */}
      <section>
        <h2 className={sectionTitleCls}>Batch Produksi</h2>
        <SectionDescription>Rincian per batch — ketuk untuk lihat komponen biaya dan performa penjualan.</SectionDescription>
        {batches.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-5">Tidak ada batch produksi pada periode ini.</p>
        ) : (
          <>
            <div className="space-y-2">
              {batches.map((b) => {
                const isOpen = expandedBatch === b.id;
                const lowSellThrough = b.sellThroughPct > 0 && b.sellThroughPct < PRODUCTION_LOW_SELL_THROUGH_PCT;
                return (
                  <div key={b.id} className="bg-skin-card border border-skin-bdr">
                    <div
                      className="p-3 flex items-center justify-between gap-3 cursor-pointer"
                      onClick={() => setExpandedBatch(isOpen ? null : b.id)}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm text-skin-text">{b.kodeProduk}</p>
                        <p className="text-xs text-skin-text3">
                          {b.batchNo} · {fmtDate(b.tanggalProduksi)} · {b.totalKain} baju
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {b.hppPerItem > 0 ? (
                          <>
                            <p className="text-sm font-semibold text-[#CAB170]">
                              {fmtRp(b.hppPerItem)}
                              <span className="text-[10px] font-normal text-skin-text3">/baju</span>
                            </p>
                            <p className={`text-[10px] ${lowSellThrough ? "text-amber-600" : "text-skin-text3"}`}>
                              {fmtDecimal(b.sellThroughPct, 1)}% terjual
                            </p>
                          </>
                        ) : (
                          <p className="text-xs text-skin-text4">belum ada HPP</p>
                        )}
                      </div>
                      <span className="text-skin-text3 text-xs ml-1">{isOpen ? "▴" : "▾"}</span>
                    </div>
                    {isOpen && (
                      <div className="border-t border-skin-bdr-lt px-3 py-3 space-y-3">
                        <div>
                          <h3 className={subTitleCls}>Komponen Biaya</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                            <div className="bg-skin-page px-2 py-1.5">
                              <p className="text-skin-text3 uppercase text-[10px] tracking-wide">Bahan</p>
                              <p className="font-semibold text-skin-text">{fmtRp(b.costBreakdown.bahan)}</p>
                            </div>
                            <div className="bg-skin-page px-2 py-1.5">
                              <p className="text-skin-text3 uppercase text-[10px] tracking-wide">Jahit</p>
                              <p className="font-semibold text-skin-text">{fmtRp(b.costBreakdown.jahit)}</p>
                            </div>
                            <div className="bg-skin-page px-2 py-1.5">
                              <p className="text-skin-text3 uppercase text-[10px] tracking-wide">Bordir</p>
                              <p className="font-semibold text-skin-text">{fmtRp(b.costBreakdown.bordir)}</p>
                            </div>
                            <div className="bg-skin-page px-2 py-1.5">
                              <p className="text-skin-text3 uppercase text-[10px] tracking-wide">Studio</p>
                              <p className="font-semibold text-skin-text">{fmtRp(b.costBreakdown.studio)}</p>
                            </div>
                            <div className="bg-skin-page px-2 py-1.5">
                              <p className="text-skin-text3 uppercase text-[10px] tracking-wide">Lainnya</p>
                              <p className="font-semibold text-skin-text">{fmtRp(b.costBreakdown.lainnya)}</p>
                            </div>
                          </div>
                        </div>
                        <div>
                          <h3 className={subTitleCls}>Performa Penjualan</h3>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-skin-page px-2 py-1.5">
                              <p className="text-skin-text3 uppercase text-[10px] tracking-wide">Terjual Sejak Produksi</p>
                              <p className="font-semibold text-skin-text">{b.unitsSoldSinceProduksi} pcs</p>
                            </div>
                            <div className="bg-skin-page px-2 py-1.5">
                              <p className="text-skin-text3 uppercase text-[10px] tracking-wide">Harga Jual Realisasi</p>
                              <p className="font-semibold text-skin-text">
                                {b.avgHargaJualRealized > 0 ? fmtRp(b.avgHargaJualRealized) : "—"}
                              </p>
                            </div>
                            <div className="bg-skin-page px-2 py-1.5 col-span-2">
                              <p className="text-skin-text3 uppercase text-[10px] tracking-wide">Keuntungan Realisasi / Baju</p>
                              <p className={`font-semibold ${b.marginRealizedPerItem < 0 ? "text-red-500" : "text-[#CAB170]"}`}>
                                {b.unitsSoldSinceProduksi > 0 ? fmtRp(b.marginRealizedPerItem) : "Belum ada penjualan"}
                              </p>
                            </div>
                          </div>
                        </div>
                        {b.modal > 0 && (
                          <div className="flex justify-between items-center px-3 py-2 border border-[#CAB170]">
                            <span className="text-[10px] font-editorial tracking-[0.15em] uppercase text-skin-text3">
                              Modal Batch Ini
                            </span>
                            <span className="font-bold text-sm text-[#CAB170]">{fmtRp(b.modal)}</span>
                          </div>
                        )}
                        {b.catatan && <p className="text-xs text-skin-text3 italic">{b.catatan}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {ringkasan.totalModal > 0 && (
              <div className="flex justify-between items-center px-3 py-2.5 border border-[#CAB170] mt-2">
                <span className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">Total Modal Periode Ini</span>
                <span className="font-bold text-[#CAB170]">{fmtRp(ringkasan.totalModal)}</span>
              </div>
            )}
          </>
        )}
      </section>

      {/* ── Pemakaian Bahan (Motif vs Tambahan) — detail pendukung ── */}
      <details className="group" open={bahanUsage.length > 0}>
        <summary className="cursor-pointer select-none list-none">
          <h2 className={`${sectionTitleCls} inline-flex items-center gap-1.5`}>
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Pemakaian Bahan
          </h2>
        </summary>
        <SectionDescription>
          Total kain yang dipakai pada periode ini, dipecah bahan motif (kain utama bercorak) dan bahan tambahan (pelapis/kombinasi).
        </SectionDescription>
        {bahanUsage.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-5">Tidak ada pemakaian bahan pada periode ini.</p>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
              {bahanUsageByJenis.map((row) => (
                <KpiCard
                  key={`${row.jenis}-${row.satuan}`}
                  label={JENIS_LABELS[row.jenis] ?? row.jenis}
                  value={`${fmtDecimal(row.jumlah, 2)} ${row.satuan}`}
                  accent={row.jenis === "motif"}
                />
              ))}
            </div>
            <div className="border border-skin-bdr divide-y divide-skin-bdr-lt">
              {bahanUsage.map((r, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="text-sm text-skin-text2 truncate">{r.nama}</p>
                    <span
                      className={`shrink-0 text-[10px] px-1.5 py-0.5 border uppercase font-bold tracking-wide ${
                        r.jenis === "motif"
                          ? "border-[#CAB170]/40 text-[#CAB170] bg-[#CAB170]/10"
                          : "border-skin-bdr text-skin-text3"
                      }`}
                    >
                      {JENIS_LABELS[r.jenis] ?? r.jenis}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-skin-text shrink-0">
                    {fmtDecimal(r.jumlah, 2)} <span className="text-skin-text3 font-normal">{r.satuan}</span>
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </details>

      {/* ── Total Produksi (Semua Waktu) — detail pendukung, ALL-TIME ── */}
      <details className="group">
        <summary className="cursor-pointer select-none list-none">
          <h2 className={`${sectionTitleCls} inline-flex items-center gap-1.5`}>
            <span className="inline-block transition-transform group-open:rotate-90">›</span>
            Total Produksi (Semua Waktu)
          </h2>
        </summary>
        <SectionDescription>Akumulasi seluruh batch produksi sejak awal — TIDAK mengikuti filter tanggal di atas.</SectionDescription>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          <KpiCard label="Total Batch" value={totalAllTime.totalBatch} sub="batch" />
          <KpiCard label="Total Baju" value={totalAllTime.totalBaju} sub="potong" accent />
          <KpiCard
            label="Total Modal"
            value={totalAllTime.totalModal > 0 ? fmtRpShort(totalAllTime.totalModal) : "—"}
            sub={totalAllTime.totalModal > 0 ? "semua batch" : "belum ada HPP"}
          />
        </div>
      </details>

      {/* ── Tagihan Jatuh Tempo ── */}
      <section>
        <h2 className={`${sectionTitleCls} flex items-center justify-between`}>
          <span>Tagihan Jatuh Tempo</span>
          {totalTagihan > 0 && <span className="text-amber-600 font-bold text-sm normal-case tracking-normal">{fmtRp(totalTagihan)}</span>}
        </h2>
        <SectionDescription>Utang bahan (beli/pinjam) yang jatuh tempo pada periode filter di atas.</SectionDescription>
        {tagihan.length === 0 ? (
          <p className="text-sm text-skin-text3 text-center py-5">Tidak ada tagihan jatuh tempo pada periode ini.</p>
        ) : (
          <div className="space-y-2">
            {tagihan.map((t) => (
              <div key={t.id} className="bg-skin-card border border-skin-bdr p-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-skin-text">{t.nama_bahan}</p>
                    <span className="text-[10px] px-1.5 py-0.5 border border-skin-bdr text-skin-text3 uppercase">
                      {t._type === "pinjam" ? "Pinjam" : "Beli"}
                    </span>
                  </div>
                  {(t.dari_siapa || t.nama_pemberi) && (
                    <p className="text-xs text-skin-text3">dari: {t.dari_siapa ?? t.nama_pemberi}</p>
                  )}
                  <p className="text-xs text-skin-text3 mt-0.5">
                    JT: <span className="text-skin-text2">{fmtDate(t.jatuh_tempo)}</span>
                    <span className="ml-2">{Number(t.jumlah)} {t.satuan}</span>
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="font-bold text-[#CAB170]">{fmtRp(t.total_harga)}</p>
                  <JatuhTempoBadge jatuh_tempo={t.jatuh_tempo} status_bayar={t.status_bayar} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
