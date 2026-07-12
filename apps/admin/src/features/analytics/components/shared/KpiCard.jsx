/**
 * shared/KpiCard.jsx — kartu KPI angka besar (dipakai section "KPI Utama").
 *
 * Redesign mobile-first (2026-07): label BOLEH multiline (tidak pernah
 * di-truncate/ellipsis), line-height label dirapatkan (~1.15) supaya label
 * panjang seperti "AVERAGE ORDER VALUE" tetap ringkas walau jadi 2-3 baris.
 * Value TIDAK PERNAH mengecil berdasarkan panjang teks lagi (dulu ada logic
 * `str.length > 8 ? text-lg : text-2xl` — dihapus) — angka adalah informasi
 * paling penting di kartu ini, jadi ukurannya SELALU besar & konsisten;
 * kalau butuh ruang lebih, `break-words` membiarkannya turun ke baris
 * berikutnya, bukan mengecil.
 *
 * Phase 5 (Dashboard Polish, perf ringan): dibungkus `React.memo` — kartu
 * ini murni presentational (props primitif: label/value/sub/accent/warn),
 * dipakai berulang di grid (6-8 instance per tab) dan re-render setiap
 * parent tab re-render (mis. saat filter berubah) — memo mencegah
 * re-render kartu yang props-nya TIDAK berubah. Tidak ada perubahan
 * visual/behavior.
 *
 * ── Redesign UX "owner toko non-teknis" (2026-07) — prop `hint` (BARU,
 * additive, opsional) ──────────────────────────────────────────────────
 * Target dashboard ini adalah pemilik toko yang bukan orang teknis —
 * banyak istilah (Margin, Inventory Turnover, dst) tidak boleh berdiri
 * sendiri tanpa penjelasan (instruksi eksplisit Denny: "Owner toko tidak
 * boleh bertanya: Ini angka apa?"). `hint` adalah SATU kalimat pendek
 * penjelasan istilah dalam bahasa sederhana, dirender SELALU TAMPIL (bukan
 * di balik tooltip/klik) — tooltip/hover dihindari SENGAJA karena tidak
 * ramah sentuh di mobile (target device utama dashboard ini). `hint`
 * BEDA dari `sub`: `sub` adalah tag konteks pendek (mis. "per transaksi",
 * "pelanggan periode ini"), `hint` adalah PENJELASAN ISTILAH (mis. "Total
 * keuntungan setelah dikurangi modal") — keduanya boleh tampil bersamaan.
 * Tidak ada perubahan pada caller lama yang belum mengirim `hint` (default
 * `undefined` → tidak dirender, 100% backward compatible).
 */
import { memo } from "react";

function KpiCard({ label, value, sub, hint, accent, warn }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-3 sm:p-4 min-w-0 flex flex-col gap-1">
      <p className="text-[10px] sm:text-xs font-editorial tracking-[0.12em] sm:tracking-[0.15em] uppercase text-skin-text3 leading-[1.15] break-words">
        {label}
      </p>
      <p
        className={`text-2xl sm:text-3xl font-bold leading-tight break-words ${
          accent ? "text-[#CAB170]" : warn ? "text-amber-500" : "text-skin-text"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-skin-text3 leading-snug break-words">{sub}</p>}
      {hint && <p className="text-[11px] text-skin-text4 leading-snug break-words mt-0.5">{hint}</p>}
    </div>
  );
}

export default memo(KpiCard);
