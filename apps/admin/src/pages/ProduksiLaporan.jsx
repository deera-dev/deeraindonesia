/**
 * ProduksiLaporan.jsx
 * Laporan produksi bulanan:
 *   - Ringkasan batch per bulan (total kain, HPP rata-rata)
 *   - Tagihan jatuh tempo bahan (pembelian + pinjam)
 *   - Pemakaian bahan per bulan
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
  const d = new Date(yyyy, mm - 1, 1);
  return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function daysUntil(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((new Date(dateStr) - today) / 86400000);
}

// ── Pilih bulan & tahun ─────────────────────────────────────────────────
function MonthPicker({ value, onChange }) {
  const now = new Date();
  // Generate 12 bulan ke belakang + 2 ke depan
  const options = [];
  for (let i = -11; i <= 2; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    options.push({ value: `${yyyy}-${mm}`, label: monthLabel(yyyy, d.getMonth() + 1) });
  }
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition"
    >
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

// ── Kartu ringkasan angka ─────────────────────────────────────────────────
function StatCard({ label, value, sub, accent }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-4">
      <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${accent ? "text-[#CAB170]" : "text-skin-text"}`}>{value}</p>
      {sub && <p className="text-xs text-skin-text3 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Badge jatuh tempo ──────────────────────────────────────────────────────
function JtBadge({ jatuh_tempo, status_bayar }) {
  if (status_bayar === "lunas")
    return <span className="text-[10px] font-semibold uppercase text-emerald-600 dark:text-emerald-400">Lunas</span>;
  const d = daysUntil(jatuh_tempo);
  if (d < 0)
    return <span className="text-[10px] font-semibold uppercase text-red-600">Lewat {Math.abs(d)}h</span>;
  if (d <= 30)
    return <span className="text-[10px] font-semibold uppercase text-amber-600">{d}h lagi</span>;
  return <span className="text-[10px] text-skin-text3">{d}h lagi</span>;
}

export default function ProduksiLaporan() {
  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [batches,     setBatches]     = useState([]);
  const [tagihan,     setTagihan]     = useState([]);
  const [loading,     setLoading]     = useState(true);

  // ── Rentang tanggal dari bulan terpilih ────────────────────────────────
  const [yyyy, mm] = selectedMonth.split("-").map(Number);
  const fromDate   = `${selectedMonth}-01`;
  const lastDay    = new Date(yyyy, mm, 0).getDate();
  const toDate     = `${selectedMonth}-${String(lastDay).padStart(2, "0")}`;

  const loadData = useCallback(async () => {
    setLoading(true);

    // Batch produksi bulan ini
    const { data: batchData } = await supabase
      .from("produksi_batch")
      .select("*")
      .gte("tanggal_produksi", fromDate)
      .lte("tanggal_produksi", toDate)
      .order("tanggal_produksi");

    // Tagihan belum lunas yang jatuh tempo bulan ini (dari beli + pinjam)
    const [{ data: beli }, { data: pinjam }] = await Promise.all([
      supabase.from("bahan_pembelian")
        .select("*")
        .eq("status_bayar", "belum")
        .gte("jatuh_tempo", fromDate)
        .lte("jatuh_tempo", toDate)
        .order("jatuh_tempo"),
      supabase.from("bahan_pinjam")
        .select("*")
        .eq("status_bayar", "belum")
        .gte("jatuh_tempo", fromDate)
        .lte("jatuh_tempo", toDate)
        .order("jatuh_tempo"),
    ]);

    setBatches(batchData ?? []);
    setTagihan([
      ...(beli  ?? []).map((r) => ({ ...r, _type: "beli" })),
      ...(pinjam ?? []).map((r) => ({ ...r, _type: "pinjam" })),
    ].sort((a, b) => new Date(a.jatuh_tempo) - new Date(b.jatuh_tempo)));

    setLoading(false);
  }, [fromDate, toDate]);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Kalkulasi ringkasan ────────────────────────────────────────────────
  const totalKain  = batches.reduce((s, b) => s + (b.total_kain ?? 0), 0);
  const totalTagihan = tagihan.reduce((s, t) => s + (t.total_harga ?? 0), 0);
  const hppAvg     = batches.length > 0
    ? Math.round(batches.reduce((s, b) => s + (b.hpp_per_item ?? 0), 0) / batches.length)
    : 0;

  // ── Pemakaian bahan dalam bulan ini ───────────────────────────────────
  const bahanUsage = {};
  for (const b of batches) {
    for (const bh of (b.bahan_dipakai ?? [])) {
      const key = `${bh.nama_bahan}||${bh.satuan}`;
      bahanUsage[key] = (bahanUsage[key] ?? 0) + (Number(bh.jumlah) || 0);
    }
  }
  const bahanRows = Object.entries(bahanUsage).map(([key, jml]) => {
    const [nama, satuan] = key.split("||");
    return { nama, satuan, jumlah: jml };
  }).sort((a, b) => a.nama.localeCompare(b.nama));

  return (
    <ProduksiLayout title="Laporan Produksi">
      {/* Pilih bulan */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 shrink-0">Bulan</label>
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
        <p className="text-xs text-skin-text3 hidden md:block">
          {monthLabel(yyyy, mm)}
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-skin-text3 text-center py-8">Memuat laporan...</p>
      ) : (
        <div className="space-y-8">

          {/* ── Ringkasan Produksi ── */}
          <section>
            <h2 className="font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3 mb-3 border-b border-skin-bdr-lt pb-2">
              Ringkasan Produksi
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard label="Total Batch" value={batches.length} />
              <StatCard label="Total Kain" value={`${totalKain} pcs`} accent />
              <StatCard label="HPP Rata-rata" value={fmtRp(hppAvg)} sub="per baju" />
            </div>
          </section>

          {/* ── Daftar Batch ── */}
          {batches.length > 0 && (
            <section>
              <h2 className="font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3 mb-3 border-b border-skin-bdr-lt pb-2">
                Batch Produksi
              </h2>
              <div className="space-y-2">
                {batches.map((b) => (
                  <div key={b.id} className="bg-skin-card border border-skin-bdr p-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-skin-text">{b.batch_no}</p>
                      <p className="text-xs text-skin-text3">
                        {b.kode_produk} · {fmtDate(b.tanggal_produksi)} · {b.total_kain} kain
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[#CAB170]">{fmtRp(b.hpp_per_item)}</p>
                      <p className="text-[10px] text-skin-text3">per baju</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* ── Pemakaian Bahan ── */}
          {bahanRows.length > 0 && (
            <section>
              <h2 className="font-editorial text-xs tracking-[0.2em] uppercase text-skin-text3 mb-3 border-b border-skin-bdr-lt pb-2">
                Pemakaian Bahan
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

          {/* ── Tagihan Jatuh Tempo Bulan Ini ── */}
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
                  <div key={t.id} className="bg-skin-card border border-skin-bdr p-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm text-skin-text">{t.nama_bahan}</p>
                        <span className="text-[10px] px-1.5 py-0.5 border border-skin-bdr text-skin-text3 uppercase">
                          {t._type === "pinjam" ? "Pinjam" : "Beli"}
                        </span>
                      </div>
                      {t.motif && <p className="text-xs text-skin-text3">{t.motif}</p>}
                      {t.dari_siapa && <p className="text-xs text-skin-text3">dari: {t.dari_siapa}</p>}
                      <p className="text-xs text-skin-text3 mt-0.5">
                        JT: <span className="text-skin-text2">{fmtDate(t.jatuh_tempo)}</span>
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

          {/* ── Empty state ── */}
          {batches.length === 0 && tagihan.length === 0 && (
            <div className="text-center py-12 text-skin-text3">
              <p className="text-sm">Tidak ada data produksi untuk {monthLabel(yyyy, mm)}.</p>
            </div>
          )}
        </div>
      )}

      <BackToTop />
    </ProduksiLayout>
  );
}
