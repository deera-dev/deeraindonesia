/**
 * ProduksiLaporanPage.jsx — /produksi/laporan
 * Laporan produksi bulanan: ringkasan, daftar batch (expandable), pemakaian
 * bahan, tagihan jatuh tempo.
 */
import { useState } from "react";
import BackToTop from "@deera/shared/components/BackToTop";
import ProduksiLayout from "../../../shared/components/ProduksiLayout";
import { useProduksiBatches, useTagihanJatuhTempo } from "../hooks";
import {
  fmtRp,
  fmtDate,
  monthLabel,
  getMonthRange,
  calcRingkasan,
  calcBahanUsage,
} from "../utils";
import MonthPicker from "./MonthPicker";
import StatCard from "./StatCard";
import BatchDetail from "./BatchDetail";
import JtBadge from "./JtBadge";

export default function ProduksiLaporanPage() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [expandedBatch, setExpandedBatch] = useState(null);

  const { yyyy, mm, fromDate, toDate } = getMonthRange(selectedMonth);
  const { batches, loading: loadingBatches } = useProduksiBatches({ fromDate, toDate });
  const { tagihan, loading: loadingTagihan } = useTagihanJatuhTempo({ fromDate, toDate });
  const loading = loadingBatches || loadingTagihan;

  const { totalBaju, totalTagihan, totalModal, hppAvg } = calcRingkasan(batches, tagihan);
  const bahanRows = calcBahanUsage(batches);

  return (
    <ProduksiLayout title="Laporan Produksi">
      {/* Pilih bulan */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 shrink-0">
          Bulan
        </label>
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat laporan...</p>
      ) : (
        <div className="space-y-8">
          {/* ── Ringkasan ── */}
          <section>
            <h2 className="font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3 mb-3 border-b border-skin-bdr-lt pb-2">
              Ringkasan Produksi
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Total Batch"
                value={batches.length}
                sub={batches.length > 0 ? `${batches.length} produk` : "bulan ini"}
              />
              <StatCard label="Total Baju" value={`${totalBaju}`} sub="potong diproduksi" accent />
              <StatCard
                label="Total Modal"
                value={totalModal > 0 ? fmtRp(totalModal) : "—"}
                sub={totalModal > 0 ? `${totalBaju} baju × HPP` : "belum ada HPP"}
                warn={totalModal > 0}
              />
              <StatCard
                label="HPP Rata-rata"
                value={hppAvg > 0 ? fmtRp(hppAvg) : "—"}
                sub={hppAvg > 0 ? "per baju" : "belum ada template HPP"}
              />
            </div>
          </section>

          {/* ── Daftar Batch ── */}
          {batches.length > 0 && (
            <section>
              <h2 className="font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3 mb-3 border-b border-skin-bdr-lt pb-2">
                Batch Produksi
              </h2>
              <div className="space-y-2">
                {batches.map((b) => {
                  const isOpen = expandedBatch === b.id;
                  const modalBatch = (b.hpp_per_item || 0) * (b.total_kain || 0);
                  return (
                    <div key={b.id} className="bg-skin-card border border-skin-bdr">
                      <div
                        className="p-3 flex items-center justify-between gap-3 cursor-pointer"
                        onClick={() => setExpandedBatch(isOpen ? null : b.id)}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm text-skin-text">{b.kode_produk}</p>
                          <p className="text-xs text-skin-text3">
                            {b.batch_no} · {fmtDate(b.tanggal_produksi)} · {b.total_kain} baju
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          {b.hpp_per_item > 0 ? (
                            <>
                              <p className="text-sm font-semibold text-[#CAB170]">
                                {fmtRp(b.hpp_per_item)}
                                <span className="text-[10px] font-normal text-skin-text3">/baju</span>
                              </p>
                              {modalBatch > 0 && (
                                <p className="text-[10px] text-skin-text3">{fmtRp(modalBatch)}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-skin-text4">no HPP</p>
                          )}
                        </div>
                        <span className="text-skin-text3 text-xs ml-1">{isOpen ? "▴" : "▾"}</span>
                      </div>
                      {isOpen && <BatchDetail batch={b} />}
                    </div>
                  );
                })}
              </div>
              {totalModal > 0 && (
                <div className="flex justify-between items-center px-3 py-2.5 border border-[#CAB170] mt-2">
                  <span className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">
                    Total Modal Bulan Ini
                  </span>
                  <span className="font-bold text-[#CAB170]">{fmtRp(totalModal)}</span>
                </div>
              )}
            </section>
          )}

          {/* ── Pemakaian Bahan ── */}
          {bahanRows.length > 0 && (
            <section>
              <h2 className="font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3 mb-3 border-b border-skin-bdr-lt pb-2">
                Pemakaian Bahan Bulan Ini
              </h2>
              <div className="border border-skin-bdr divide-y divide-skin-bdr-lt">
                {bahanRows.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5">
                    <p className="text-sm text-skin-text2">{r.nama}</p>
                    <p className="text-sm font-semibold text-skin-text">
                      {r.jumlah.toFixed(2)} <span className="text-skin-text3 font-normal">{r.satuan}</span>
                    </p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Tagihan Jatuh Tempo ── */}
          <section>
            <h2 className="font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3 mb-3 border-b border-skin-bdr-lt pb-2 flex items-center justify-between">
              <span>Tagihan Jatuh Tempo Bulan Ini</span>
              {totalTagihan > 0 && (
                <span className="text-amber-600 font-bold text-sm">{fmtRp(totalTagihan)}</span>
              )}
            </h2>
            {tagihan.length === 0 ? (
              <p className="text-sm text-skin-text3 py-3">Tidak ada tagihan jatuh tempo bulan ini.</p>
            ) : (
              <div className="space-y-2">
                {tagihan.map((t) => (
                  <div
                    key={t.id}
                    className="bg-skin-card border border-skin-bdr p-3 flex items-start justify-between gap-3"
                  >
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
                        <span className="ml-2">
                          {Number(t.jumlah)} {t.satuan}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0 space-y-1">
                      <p className="font-bold text-[#CAB170]">{fmtRp(t.total_harga)}</p>
                      <JtBadge jatuh_tempo={t.jatuh_tempo} status_bayar={t.status_bayar} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {batches.length === 0 && tagihan.length === 0 && (
            <div className="text-center py-12 text-skin-text3">
              <p className="text-sm">Tidak ada data produksi untuk {monthLabel(yyyy, mm)}.</p>
            </div>
          )}
        </div>
      )}

      <BackToTop bottomClass="bottom-24" />
    </ProduksiLayout>
  );
}
