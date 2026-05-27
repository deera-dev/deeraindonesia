/**
 * ProduksiLaporan.jsx
 * Laporan produksi bulanan:
 *   - Ringkasan: batch, total baju, total modal, HPP rata-rata
 *   - Daftar batch (expandable: sizes + bahan dipakai)
 *   - Pemakaian bahan bulan ini
 *   - Tagihan jatuh tempo
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import BackToTop from "@deera/shared/components/BackToTop";
import ProduksiLayout from "../components/produksi/ProduksiLayout";

function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}
function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
}
function monthLabel(yyyy, mm) {
  return new Date(yyyy, mm - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0,0,0,0);
  return Math.round((new Date(dateStr) - today) / 86400000);
}

function MonthPicker({ value, onChange }) {
  const now = new Date();
  const options = [];
  for (let i = -11; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    options.push({ value: `${yyyy}-${mm}`, label: monthLabel(yyyy, d.getMonth() + 1) });
  }
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition">
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function StatCard({ label, value, sub, accent, warn }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-4">
      <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? "text-[#CAB170]" : warn ? "text-amber-500" : "text-skin-text"}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-skin-text3 mt-0.5">{sub}</p>}
    </div>
  );
}

function JtBadge({ jatuh_tempo, status_bayar }) {
  if (status_bayar === "lunas")
    return <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Lunas</span>;
  const d = daysUntil(jatuh_tempo);
  if (d < 0) return <span className="text-[10px] font-semibold uppercase text-red-600">Lewat {Math.abs(d)}h</span>;
  if (d <= 30) return <span className="text-[10px] font-semibold uppercase text-amber-600">{d}h lagi</span>;
  return <span className="text-[10px] text-skin-text3">{d}h lagi</span>;
}

// Expand satu batch: tampilkan ukuran + warna + bahan dipakai
function BatchDetail({ batch }) {
  const sizes = batch.sizes ?? [];
  const bahan = batch.bahan_dipakai ?? [];
  const totalModal = (batch.hpp_per_item || 0) * (batch.total_kain || 0);

  return (
    <div className="px-3 pb-3 pt-2 border-t border-skin-bdr-lt space-y-3">
      {/* Total modal batch ini */}
      {totalModal > 0 && (
        <div className="flex justify-between text-xs">
          <span className="text-skin-text3">Total Modal Batch</span>
          <span className="font-semibold text-[#CAB170]">{fmtRp(totalModal)}</span>
        </div>
      )}

      {/* Breakdown ukuran × warna */}
      {sizes.length > 0 && (
        <div>
          <p className="text-[10px] font-editorial tracking-[0.12em] uppercase text-skin-text3 mb-1.5">Ukuran & Warna</p>
          <div className="space-y-1">
            {sizes.map((sz, i) => (
              <div key={i} className="text-xs">
                <span className="text-skin-text2 font-medium">{sz.size}</span>
                <span className="text-skin-text3 ml-2">
                  {(sz.warna ?? []).map((w) => `${w.warna === "_" ? "—" : w.warna}: ${w.qty}`).join(" · ")}
                </span>
                <span className="text-skin-text3 ml-2">
                  = {(sz.warna ?? []).reduce((s, w) => s + (w.qty || 0), 0)} baju
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bahan dipakai */}
      {bahan.length > 0 && (
        <div>
          <p className="text-[10px] font-editorial tracking-[0.12em] uppercase text-skin-text3 mb-1.5">Bahan Dipakai</p>
          <div className="space-y-0.5">
            {bahan.map((bh, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-skin-text3 truncate max-w-[60%]">{bh.nama_bahan}</span>
                <span className="text-skin-text font-medium">
                  {Number(bh.jumlah).toFixed(2)} <span className="text-skin-text3">{bh.satuan}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {bahan.length === 0 && (
        <p className="text-xs text-amber-600">Bahan dipakai belum tercatat — jalankan migration backfill atau edit ulang batch.</p>
      )}

      {batch.catatan && (
        <p className="text-xs text-skin-text3 italic border-t border-skin-bdr-lt pt-2">{batch.catatan}</p>
      )}
    </div>
  );
}

export default function ProduksiLaporan() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [batches, setBatches] = useState([]);
  const [tagihan, setTagihan] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBatch, setExpandedBatch] = useState(null);

  const [yyyy, mm] = selectedMonth.split("-").map(Number);
  const fromDate = `${selectedMonth}-01`;
  const lastDay = new Date(yyyy, mm, 0).getDate();
  const toDate = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;

  const loadData = useCallback(async () => {
    setLoading(true);

    const { data: batchData } = await supabase
      .from("produksi_batch")
      .select("*")
      .gte("tanggal_produksi", fromDate)
      .lte("tanggal_produksi", toDate)
      .order("tanggal_produksi");

    const [{ data: beli }, { data: pinjam }] = await Promise.all([
      supabase.from("bahan_pembelian").select("*").eq("status_bayar", "belum")
        .gte("jatuh_tempo", fromDate).lte("jatuh_tempo", toDate).order("jatuh_tempo"),
      supabase.from("bahan_pinjam").select("*").eq("status_bayar", "belum")
        .gte("jatuh_tempo", fromDate).lte("jatuh_tempo", toDate).order("jatuh_tempo"),
    ]);

    // Enrichment: isi hpp_per_item & bahan_dipakai dari template untuk batch lama
    const rawBatches = batchData ?? [];
    const needTpl = rawBatches.filter((b) => !b.hpp_per_item || (b.bahan_dipakai ?? []).length === 0);
    const kodes = [...new Set(needTpl.map((b) => b.kode_produk).filter(Boolean))];

    let templateMap = {};
    if (kodes.length > 0) {
      const { data: tplData } = await supabase
        .from("hpp_template").select("kode_produk,total_hpp,bahan_items").in("kode_produk", kodes);
      for (const t of tplData ?? []) templateMap[t.kode_produk] = t;
    }

    const enriched = rawBatches.map((b) => {
      const tpl = templateMap[b.kode_produk];
      const hpp = b.hpp_per_item || tpl?.total_hpp || 0;
      const bahanDipakai = (b.bahan_dipakai ?? []).length > 0
        ? b.bahan_dipakai
        : tpl?.bahan_items?.map((bi) => ({
            nama_bahan: bi.nama_bahan,
            kode_bahan: bi.kode_bahan ?? "",
            satuan: bi.satuan,
            jumlah: Math.round((Number(bi.qty_per_baju) || 0) * (b.total_kain || 0) * 100) / 100,
          })) ?? [];
      return { ...b, hpp_per_item: hpp, bahan_dipakai: bahanDipakai };
    });

    setBatches(enriched);
    setTagihan(
      [...(beli ?? []).map((r) => ({ ...r, _type: "beli" })),
       ...(pinjam ?? []).map((r) => ({ ...r, _type: "pinjam" }))]
        .sort((a, b) => new Date(a.jatuh_tempo) - new Date(b.jatuh_tempo)),
    );
    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Kalkulasi ringkasan ────────────────────────────────────
  const totalBaju = batches.reduce((s, b) => s + (b.total_kain ?? 0), 0);
  const totalTagihan = tagihan.reduce((s, t) => s + (t.total_harga ?? 0), 0);
  const totalModal = batches.reduce((s, b) => s + (b.hpp_per_item || 0) * (b.total_kain || 0), 0);
  const hppBatches = batches.filter((b) => b.hpp_per_item > 0);
  const hppAvg = hppBatches.length > 0
    ? Math.round(hppBatches.reduce((s, b) => s + b.hpp_per_item, 0) / hppBatches.length)
    : 0;

  // Pemakaian bahan agregasi
  const bahanUsage = {};
  for (const b of batches) {
    for (const bh of b.bahan_dipakai ?? []) {
      const key = `${bh.nama_bahan}||${bh.satuan}`;
      bahanUsage[key] = (bahanUsage[key] ?? 0) + (Number(bh.jumlah) || 0);
    }
  }
  const bahanRows = Object.entries(bahanUsage)
    .map(([key, jml]) => { const [nama, satuan] = key.split("||"); return { nama, satuan, jumlah: jml }; })
    .sort((a, b) => a.nama.localeCompare(b.nama));

  return (
    <ProduksiLayout title="Laporan Produksi">
      {/* Pilih bulan */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 shrink-0">Bulan</label>
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
              <StatCard label="Total Batch" value={batches.length} sub={batches.length > 0 ? `${batches.length} produk` : "bulan ini"} />
              <StatCard label="Total Baju" value={`${totalBaju}`} sub="potong diproduksi" accent />
              <StatCard label="Total Modal" value={totalModal > 0 ? fmtRp(totalModal) : "—"}
                sub={totalModal > 0 ? `${totalBaju} baju × HPP` : "belum ada HPP"} warn={totalModal > 0} />
              <StatCard label="HPP Rata-rata" value={hppAvg > 0 ? fmtRp(hppAvg) : "—"}
                sub={hppAvg > 0 ? "per baju" : "belum ada template HPP"} />
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
                              <p className="text-sm font-semibold text-[#CAB170]">{fmtRp(b.hpp_per_item)}<span className="text-[10px] font-normal text-skin-text3">/baju</span></p>
                              {modalBatch > 0 && <p className="text-[10px] text-skin-text3">{fmtRp(modalBatch)}</p>}
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
                  <span className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">Total Modal Bulan Ini</span>
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
              {totalTagihan > 0 && <span className="text-amber-600 font-bold text-sm">{fmtRp(totalTagihan)}</span>}
            </h2>
            {tagihan.length === 0 ? (
              <p className="text-sm text-skin-text3 py-3">Tidak ada tagihan jatuh tempo bulan ini.</p>
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
