/**
 * KalkulatorHPP.jsx — Estimasi cepat HPP per baju, tidak disimpan ke DB.
 *
 * Diekstrak dari ProduksiHPPPage.jsx (sebelumnya fungsi inline) supaya bisa
 * di-unit-test terpisah — lihat LAPORAN_INVESTIGASI_HPP_POIN.md.
 *
 * ── Perbaikan bug "Poin tidak masuk Total HPP" ──────────────────────────────
 * SEBELUM perbaikan ini, Kalkulator memakai field "Operasional" — angka
 * manual bebas (default Rp5.000) yang TIDAK terhubung ke Harga Dasar sama
 * sekali. Akibatnya estimasi Kalkulator selalu jauh lebih kecil dari Total
 * HPP Template HPP untuk produk yang sama, karena tidak memperhitungkan
 * plastik/hangtag/tali_hangtag/merk/pin/kain_keras/Poin Denny/Poin Haikal —
 * bukan cuma Poin, SEMUA 8 komponen dari Harga Dasar hilang.
 *
 * Field "Operasional" DIHAPUS (bukan hardcode +10000 di hasil akhir) dan
 * digantikan komponen-komponen Harga Dasar yang dihitung otomatis lewat
 * biayaLainBreakdown() — SATU sumber kebenaran yang sama dipakai
 * calcTotal()/HPPForm — dipanggil dengan upah_jahit=bordir=kancing_qty=
 * biaya_studio=0 supaya hasilnya murni komponen dari hpp_config (Harga
 * Dasar), tidak tumpang-tindih dengan slider "Upah & Jasa" milik Kalkulator
 * sendiri (mencegah double counting). Setiap komponen ditampilkan sebagai
 * baris terpisah di breakdown "Estimasi HPP / Baju" (termasuk Poin Denny
 * & Poin Haikal) supaya totalnya bisa diverifikasi — konsisten dengan
 * "Rincian HPP" di HPPForm dan "Biaya Lain" di HppTemplateDetailSheet.
 */
import { useState } from "react";
import { biayaLainBreakdown } from "../utils";

export default function KalkulatorHPP({ fmtRp, fieldFullCls, labelCls, config }) {
  const [bahans, setBahans] = useState([{ harga: "", pemakaian: "" }]);
  const [upah, setUpah] = useState(55000);
  const [lainnya, setLainnya] = useState("");

  const totalBahan = bahans.reduce(
    (s, b) => s + (Number(b.harga) || 0) * (Number(b.pemakaian) || 0),
    0,
  );

  // Komponen tetap dari Harga Dasar (hpp_config) — plastik, hangtag, tali
  // hangtag, merk, pin, kain keras, Poin Denny, Poin Haikal. upah_jahit/
  // bordir/kancing_qty/biaya_studio sengaja 0 di sini: Kalkulator sudah
  // punya slider "Upah & Jasa" sendiri untuk itu, jadi tidak dobel-hitung.
  const biayaTetapRows = biayaLainBreakdown({
    upah_jahit: 0,
    bordir: 0,
    kancing_qty: 0,
    kancing_extra: [],
    biaya_studio: 0,
    config: config ?? {},
  }).filter((b) => b.val > 0);
  const biayaTetap = biayaTetapRows.reduce((s, b) => s + b.val, 0);

  const total = totalBahan + upah + biayaTetap + (Number(lainnya) || 0);

  const rows = [
    { label: "Biaya Bahan", value: totalBahan },
    { label: "Upah & Jasa", value: upah },
    ...biayaTetapRows.map((b) => ({ label: b.label, value: b.val })),
    { label: "Lainnya", value: Number(lainnya) || 0 },
  ].filter((r) => r.value > 0);

  function reset() {
    setBahans([{ harga: "", pemakaian: "" }]);
    setUpah(55000);
    setLainnya("");
  }

  return (
    <div className="space-y-6">
      <p className="text-xs text-skin-text3">
        Perkiraan HPP per baju. Komponen dari Harga Dasar (kemasan, aksesoris, Poin) otomatis
        ikut dihitung. Tidak disimpan ke database.
      </p>

      {/* Bahan */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className={labelCls}>Biaya Bahan</label>
          <button
            type="button"
            onClick={() => setBahans((p) => [...p, { harga: "", pemakaian: "" }])}
            className="text-[10px] tracking-[0.12em] uppercase font-editorial text-[#CAB170] hover:text-[#A8925A] transition"
          >
            + Tambah
          </button>
        </div>
        <div className="space-y-2">
          {bahans.map((b, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={b.harga}
                onChange={(e) =>
                  setBahans((p) => p.map((x, j) => (j === i ? { ...x, harga: e.target.value } : x)))
                }
                placeholder="Harga/satuan"
                className={fieldFullCls}
              />
              <span className="text-skin-text3 text-xs shrink-0">×</span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={b.pemakaian}
                onChange={(e) =>
                  setBahans((p) =>
                    p.map((x, j) => (j === i ? { ...x, pemakaian: e.target.value } : x)),
                  )
                }
                placeholder="Pemakaian"
                className={fieldFullCls}
              />
              {bahans.length > 1 && (
                <button
                  type="button"
                  onClick={() => setBahans((p) => p.filter((_, j) => j !== i))}
                  className="shrink-0 text-red-400 hover:text-red-600 text-xl leading-none"
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {totalBahan > 0 && (
            <p className="text-xs text-right text-[#CAB170] font-semibold">
              {fmtRp(totalBahan)} / baju
            </p>
          )}
        </div>
      </div>

      {/* Upah & Jasa — range */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className={labelCls}>Upah & Jasa</label>
          <span className="text-xs font-bold text-[#CAB170]">{fmtRp(upah)}</span>
        </div>
        <input
          type="range"
          min={35000}
          max={80000}
          step={500}
          value={upah}
          onChange={(e) => setUpah(Number(e.target.value))}
          className="w-full accent-[#CAB170]"
        />
        <div className="flex justify-between text-[10px] text-skin-text4 mt-0.5">
          <span>{fmtRp(35000)}</span>
          <span>{fmtRp(80000)}</span>
        </div>
      </div>

      {/* Lainnya */}
      <div>
        <label className={labelCls}>Lainnya (Rp)</label>
        <input
          type="number"
          min="0"
          value={lainnya}
          onChange={(e) => setLainnya(e.target.value)}
          placeholder="0"
          className={fieldFullCls}
        />
      </div>

      {/* Hasil */}
      {total > 0 && (
        <div className="border-2 border-[#CAB170] bg-skin-gold p-4 space-y-1.5">
          <p className="text-xs font-editorial tracking-[0.2em] uppercase text-[#A8925A] mb-3">
            Estimasi HPP / Baju
          </p>
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between text-xs">
              <span className="text-skin-text3">{r.label}</span>
              <span className="font-semibold text-skin-text2">{fmtRp(r.value)}</span>
            </div>
          ))}
          <div className="border-t border-[#CAB170]/40 pt-2 mt-1 flex justify-between">
            <span className="text-sm font-bold text-skin-text">Total HPP</span>
            <span className="text-lg font-bold text-[#CAB170]">{fmtRp(total)}</span>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={reset}
        className="w-full py-2.5 font-editorial text-xs tracking-[0.18em] uppercase text-skin-text3 border border-skin-bdr hover:text-skin-text transition"
      >
        Reset
      </button>
    </div>
  );
}
