/**
 * LaporanKeuangan.jsx
 * Ringkasan keuangan dari sales yang sudah difilter:
 * - Omset, Modal, Keuntungan, Diskon, Retur
 * - Breakdown omset per hari
 * - Breakdown omset per minggu (jika rentang > 7 hari)
 * - Download PNG & Share
 *
 * Props:
 * - sales : array transaksi (sudah difilter oleh Laporan.jsx)
 */
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { formatHarga } from "@deera/shared/lib/constants";
import { effectiveQty, itemProfit } from "../../../shared/lib/salesUtils";

function effectiveHpp(item) {
  return (item.hpp ?? 0) * effectiveQty(item);
}

// Kembalikan nomor minggu ISO (Senin = awal minggu)
function isoWeekKey(dateStr) {
  const d = new Date(dateStr + "T00:00:00");
  const day = d.getDay() === 0 ? 7 : d.getDay(); // 1=Sen .. 7=Min
  const monday = new Date(d);
  monday.setDate(d.getDate() - day + 1);
  const fri = new Date(d);
  fri.setDate(d.getDate() - day + 7);
  return {
    key: monday.toISOString().split("T")[0],
    label:
      monday.toLocaleDateString("id-ID", { day: "numeric", month: "short" }) +
      " – " +
      fri.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }),
  };
}

// Permintaan Denny 2026-09: retur (murni ataupun bagian Tukar Tambah) HARUS
// ikut mengurangi omset & keuntungan di tanggal retur itu DIPROSES (bukan
// tanggal transaksi asal yang diretur, dan bukan dikeluarkan total dari
// breakdown seperti sebelumnya) — `t.date` pada baris retur SUDAH tanggal
// proses (lihat useCreateRetur di features/penjualan/hooks.js), jadi tinggal
// dijumlahkan dengan tanda minus di tanggal itu apa adanya.
function buildWeeklyData(rows) {
  const byWeek = {};
  for (const t of rows) {
    const dateStr = t.date ?? t.created_at?.split("T")[0] ?? "";
    if (!dateStr) continue;
    const { key, label } = isoWeekKey(dateStr);
    if (!byWeek[key]) byWeek[key] = { key, label, omset: 0, keuntungan: 0, count: 0 };
    const sign = t.type === "retur" ? -1 : 1;
    byWeek[key].omset += sign * (t.total ?? 0);
    byWeek[key].keuntungan += sign * (t.items ?? []).reduce((ss, item) => ss + itemProfit(item), 0);
    byWeek[key].count += 1;
  }
  return Object.values(byWeek).sort((a, b) => b.key.localeCompare(a.key));
}

// Format Rp dgn tanda minus eksplisit — formatHarga() (constants.js) buang
// semua karakter non-digit termasuk "-", jadi angka negatif harus dipisah
// tanda & nilai absolutnya sebelum diformat, supaya tidak diam-diam jadi
// kelihatan positif.
function fmtSigned(n) {
  const v = Math.round(n ?? 0);
  return (v < 0 ? "-" : "") + formatHarga(Math.abs(v));
}

export default function LaporanKeuangan({ sales }) {
  const reportRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  const realSales = sales.filter((s) => s.type !== "retur");
  const returSales = sales.filter((s) => s.type === "retur");

  const omset = realSales.reduce((s, t) => s + (t.total ?? 0), 0);
  const modal = realSales.reduce(
    (s, t) => s + (t.items ?? []).reduce((ss, item) => ss + effectiveHpp(item), 0),
    0,
  );
  const keuntungan = realSales.reduce(
    (s, t) => s + (t.items ?? []).reduce((ss, item) => ss + itemProfit(item), 0),
    0,
  );
  const totalDiskon = realSales.reduce((s, t) => s + (t.discount ?? 0), 0);
  const totalRetur = returSales.reduce((s, t) => s + (t.total ?? 0), 0);
  const marginPct = omset > 0 ? Math.round((keuntungan / omset) * 100) : 0;

  // Per-hari — pakai SEMUA sales (bukan cuma realSales) supaya retur ikut
  // mengurangi omset & keuntungan di tanggal retur diproses, lihat komentar
  // di buildWeeklyData di atas.
  const byDay = {};
  for (const t of sales) {
    const d = t.date ?? t.created_at?.split("T")[0] ?? "—";
    if (!byDay[d]) byDay[d] = { omset: 0, keuntungan: 0, count: 0 };
    const sign = t.type === "retur" ? -1 : 1;
    byDay[d].omset += sign * (t.total ?? 0);
    byDay[d].keuntungan += sign * (t.items ?? []).reduce((ss, item) => ss + itemProfit(item), 0);
    byDay[d].count += 1;
  }
  const days = Object.entries(byDay).sort(([a], [b]) => b.localeCompare(a));

  // Per-minggu (tampilkan jika ada >= 2 minggu berbeda)
  const weeks = buildWeeklyData(sales);
  const showWeekly = weeks.length >= 2;
  const rataMingguan =
    weeks.length > 0 ? Math.round(weeks.reduce((s, w) => s + w.omset, 0) / weeks.length) : 0;
  const bestWeek = weeks.length > 0 ? weeks.reduce((a, b) => (b.omset > a.omset ? b : a)) : null;

  // Teks ringkasan untuk share
  function buildShareText() {
    const lines = [
      "📊 Laporan Keuangan Deera",
      `💰 Omset: Rp ${formatHarga(omset)}`,
      `✅ Keuntungan: Rp ${formatHarga(keuntungan)} (${marginPct}%)`,
      `🛒 Transaksi: ${realSales.length}`,
    ];
    if (showWeekly) {
      lines.push(`📅 Rata-rata/minggu: Rp ${formatHarga(rataMingguan)}`);
    }
    if (totalRetur > 0) lines.push(`↩ Retur: Rp ${formatHarga(totalRetur)}`);
    return lines.join("\n");
  }

  async function handleDownload() {
    if (!reportRef.current || downloading) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `laporan-keuangan-${new Date().toISOString().split("T")[0]}.png`;
      a.click();
    } catch (err) {
      console.warn("Download failed:", err);
    }
    setDownloading(false);
  }

  async function handleShare() {
    if (sharing) return;
    setSharing(true);
    try {
      const text = buildShareText();
      // Coba share dengan file PNG
      if (navigator.canShare && reportRef.current) {
        try {
          const dataUrl = await toPng(reportRef.current, {
            quality: 1,
            pixelRatio: 2,
            backgroundColor: "#ffffff",
          });
          const res = await fetch(dataUrl);
          const blob = await res.blob();
          const file = new File([blob], "laporan-keuangan.png", { type: "image/png" });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: "Laporan Keuangan Deera", text });
            setSharing(false);
            return;
          }
        } catch {
          // fallback ke text share
        }
      }
      // Fallback: share teks saja atau WhatsApp
      if (navigator.share) {
        await navigator.share({ title: "Laporan Keuangan Deera", text });
      } else {
        const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(waUrl, "_blank");
      }
    } catch (err) {
      if (err?.name !== "AbortError") console.warn("Share failed:", err);
    }
    setSharing(false);
  }

  return (
    <div className="p-4 space-y-4">
      {/* ── Tombol aksi ── */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading || realSales.length === 0}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-skin-bdr text-sm font-semibold text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] disabled:opacity-40 disabled:pointer-events-none transition uppercase tracking-[0.08em]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {downloading ? "Menyimpan..." : "Simpan PNG"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={sharing || realSales.length === 0}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border-2 border-skin-bdr text-sm font-semibold text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] disabled:opacity-40 disabled:pointer-events-none transition uppercase tracking-[0.08em]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {sharing ? "Berbagi..." : "Bagikan"}
        </button>
      </div>

      {/* ── Area yang di-capture untuk PNG ── */}
      <div ref={reportRef} className="space-y-4 bg-white p-1 rounded">
        {/* Kartu ringkasan utama */}
        <div className="grid grid-cols-2 gap-3">
          <KeuCard
            label="Omset"
            value={`Rp ${formatHarga(omset)}`}
            sub={`${realSales.length} transaksi`}
            color="gold"
          />
          <KeuCard
            label="Keuntungan"
            value={keuntungan > 0 ? `Rp ${formatHarga(keuntungan)}` : "—"}
            sub={`Margin ${marginPct}%`}
            color="green"
          />
          <KeuCard
            label="Modal (HPP)"
            value={modal > 0 ? `Rp ${formatHarga(modal)}` : "—"}
            sub="total biaya produk"
            color="neutral"
          />
          <KeuCard
            label="Total Diskon"
            value={totalDiskon > 0 ? `Rp ${formatHarga(totalDiskon)}` : "—"}
            sub="dari semua transaksi"
            color="neutral"
          />
        </div>

        {totalRetur > 0 && (
          <div className="bg-orange-50 border-2 border-orange-200 px-4 py-3">
            <p className="text-sm text-orange-800 font-semibold">
              ↩ Total Retur: Rp {formatHarga(totalRetur)} ({returSales.length} transaksi)
            </p>
          </div>
        )}

        {/* Ringkasan Mingguan */}
        {showWeekly && (
          <div className="bg-skin-card border-2 border-[#CAB170]/40">
            <div className="px-4 py-3 border-b border-skin-bdr bg-skin-gold/30">
              <p className="text-sm text-[#CAB170] uppercase tracking-[0.1em] font-semibold">
                Ringkasan Mingguan
              </p>
            </div>
            {/* Rata-rata + terbaik */}
            <div className="grid grid-cols-2 divide-x divide-skin-bdr border-b border-skin-bdr">
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-skin-text3 uppercase tracking-wider mb-1">Rata-rata/Minggu</p>
                <p className="font-headline text-lg text-[#CAB170]">{fmtSigned(rataMingguan)}</p>
              </div>
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-skin-text3 uppercase tracking-wider mb-1">Minggu Terbaik</p>
                <p
                  className={`font-headline text-lg ${
                    bestWeek && bestWeek.omset < 0 ? "text-red-500" : "text-green-600"
                  }`}
                >
                  {bestWeek ? fmtSigned(bestWeek.omset) : "—"}
                </p>
              </div>
            </div>
            {/* Per-minggu detail — omset/keuntungan bisa negatif kalau
                retur minggu itu lebih besar dari penjualan barunya, lihat
                komentar di buildWeeklyData() soal kenapa retur diikutkan. */}
            <div className="divide-y divide-skin-bdr-lt">
              {weeks.map((w) => {
                const omsetNeg = w.omset < 0;
                const untungNeg = w.keuntungan < 0;
                return (
                  <div key={w.key} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold text-skin-text">{w.label}</p>
                      <p className="text-xs text-skin-text3">{w.count} transaksi</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-base font-bold font-headline ${
                          omsetNeg ? "text-red-500" : "text-[#CAB170]"
                        }`}
                      >
                        {fmtSigned(w.omset)}
                      </p>
                      {w.keuntungan !== 0 && (
                        <p className={`text-xs ${untungNeg ? "text-red-500" : "text-green-600"}`}>
                          {untungNeg ? "" : "+"}
                          {fmtSigned(w.keuntungan)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Breakdown per hari — permintaan Denny 2026-09: retur (murni
            ataupun bagian Tukar Tambah) ikut ditampilkan sbg pengurang PAS
            di tanggal retur itu diproses (bukan tanggal transaksi asal yg
            diretur, & bukan lagi dikeluarkan total dari breakdown ini).
            Kalau di hari itu HANYA ada retur (tanpa penjualan baru), omset
            & keuntungan hari itu tampil negatif berwarna merah supaya
            jelas beda dari hari normal — lihat byDay di atas & fmtSigned(). */}
        {days.length > 0 && (
          <div className="bg-skin-card border-2 border-skin-bdr">
            <div className="px-4 py-3 border-b border-skin-bdr">
              <p className="text-sm text-skin-text3 uppercase tracking-[0.1em] font-semibold">
                Omset per Hari
              </p>
            </div>
            <div className="divide-y divide-skin-bdr-lt">
              {days.map(([date, data]) => {
                const label = new Date(date + "T00:00:00").toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                });
                const omsetNeg = data.omset < 0;
                const untungNeg = data.keuntungan < 0;
                return (
                  <div key={date} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-base font-semibold text-skin-text">{label}</p>
                      <p className="text-sm text-skin-text3">{data.count} transaksi</p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-lg font-bold font-headline ${
                          omsetNeg ? "text-red-500" : "text-[#CAB170]"
                        }`}
                      >
                        {fmtSigned(data.omset)}
                      </p>
                      {data.keuntungan !== 0 && (
                        <p
                          className={`text-sm font-medium ${
                            untungNeg ? "text-red-500" : "text-green-600"
                          }`}
                        >
                          {untungNeg ? "" : "+"}
                          {fmtSigned(data.keuntungan)}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {days.length === 0 && (
        <p className="text-center text-base text-skin-text4 py-12">Belum ada data keuangan</p>
      )}
    </div>
  );
}

function KeuCard({ label, value, sub, color }) {
  const valueColor =
    color === "gold" ? "text-[#CAB170]" : color === "green" ? "text-green-600" : "text-skin-text";

  return (
    <div className="bg-skin-card border-2 border-skin-bdr px-4 py-4">
      <p className="text-xs text-skin-text3 uppercase tracking-[0.1em] font-semibold mb-1">
        {label}
      </p>
      <p className={`text-xl font-bold leading-tight ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-skin-text3 mt-1">{sub}</p>}
    </div>
  );
}
