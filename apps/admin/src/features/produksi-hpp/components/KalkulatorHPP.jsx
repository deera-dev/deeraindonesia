/**
 * KalkulatorHPP.jsx — Kalkulator harga maksimal bahan per yard (tidak disimpan).
 *
 * Permintaan Denny 2026-10-08: komponen biaya (upah, plastik, kancing, pin,
 * poin) bisa dibilang tetap, jadi kalkulator dibalik — dari target harga jual
 * (+ margin) atau HPP target, berapa harga bahan per yard paling mahal yang
 * masih masuk. Pemakaian rata-rata motif/polos diambil dari template HPP
 * (avgPemakaianBahan), biaya tetap otomatis dari Harga Dasar
 * (biayaTetapKalkulator). Dulunya kalkulator ini menghitung total HPP dari
 * harga bahan × pemakaian + slider upah.
 */
import { useMemo, useState } from "react";
import {
  avgPemakaianBahan,
  biayaTetapKalkulator,
  hitungHargaMaksBahan,
} from "../utils";

const DEFAULT_MARGIN = 40;

function Toggle({ value, onChange, options }) {
  return (
    <div className="flex border border-skin-bdr">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase transition ${
            value === o.value ? "bg-[#CAB170] text-white" : "text-skin-text3 hover:text-skin-text"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function KalkulatorHPP({ fmtRp, fieldFullCls, labelCls, config, templates }) {
  const [mode, setMode] = useState("jual");
  const [hargaJual, setHargaJual] = useState("");
  const [marginPct, setMarginPct] = useState(String(DEFAULT_MARGIN));
  const [hppTarget, setHppTarget] = useState("");
  const [tipe, setTipe] = useState("gamis");
  const [jenis, setJenis] = useState("motif");
  const [pakaiManual, setPakaiManual] = useState(null); // null = pakai rata-rata

  const stats = useMemo(() => avgPemakaianBahan(templates), [templates]);
  const stat = stats[jenis];
  const pemakaian = pakaiManual ?? (stat ? String(stat.avg) : "");
  const tetap = useMemo(() => biayaTetapKalkulator({ tipe, config, templates }), [tipe, config, templates]);
  const hasil = hitungHargaMaksBahan({
    mode,
    hargaJual,
    marginPct,
    hppTarget,
    pemakaian,
    biayaTetap: tetap.total,
  });

  function reset() {
    setMode("jual");
    setHargaJual("");
    setMarginPct(String(DEFAULT_MARGIN));
    setHppTarget("");
    setTipe("gamis");
    setJenis("motif");
    setPakaiManual(null);
  }

  const jenisLabel = jenis === "motif" ? "motif" : "polos";

  return (
    <div className="space-y-5">
      <p className="text-xs text-skin-text3">
        Berapa harga bahan per yard paling mahal yang masih masuk target? Biaya tetap
        dihitung otomatis dari Harga Dasar. Tidak disimpan.
      </p>

      <Toggle
        value={mode}
        onChange={setMode}
        options={[
          { value: "jual", label: "Dari Harga Jual" },
          { value: "hpp", label: "Dari HPP Target" },
        ]}
      />

      {mode === "jual" ? (
        <div className="flex gap-2">
          <div className="flex-[2]">
            <label className={labelCls}>Harga Jual (Rp)</label>
            <input type="number" min="0" value={hargaJual} onChange={(e) => setHargaJual(e.target.value)} placeholder="cth. 285000" className={fieldFullCls} />
          </div>
          <div className="flex-1">
            <label className={labelCls}>Margin (%)</label>
            <input type="number" min="0" max="95" value={marginPct} onChange={(e) => setMarginPct(e.target.value)} className={fieldFullCls} />
          </div>
        </div>
      ) : (
        <div>
          <label className={labelCls}>HPP Maksimal / Baju (Rp)</label>
          <input type="number" min="0" value={hppTarget} onChange={(e) => setHppTarget(e.target.value)} placeholder="cth. 160000" className={fieldFullCls} />
        </div>
      )}

      <div>
        <label className={labelCls}>Model</label>
        <Toggle value={tipe} onChange={setTipe} options={[{ value: "gamis", label: "Gamis" }, { value: "midi", label: "Midi" }]} />
      </div>

      <div>
        <label className={labelCls}>Bahan Utama</label>
        <Toggle
          value={jenis}
          onChange={(v) => {
            setJenis(v);
            setPakaiManual(null);
          }}
          options={[{ value: "motif", label: "Motif" }, { value: "polos", label: "Polos" }]}
        />
        <div className="mt-2">
          <label className={labelCls}>Pemakaian (yard / baju)</label>
          <input type="number" min="0" step="0.01" value={pemakaian} onChange={(e) => setPakaiManual(e.target.value)} className={fieldFullCls} />
          <p className="text-[10px] text-skin-text4 mt-1">
            {stat
              ? `Rata-rata ${jenisLabel} dari ${stat.n} bahan di template HPP (rentang ${stat.min}–${stat.max} yard).`
              : `Belum ada data ${jenisLabel} di template HPP — isi manual.`}
          </p>
        </div>
      </div>

      {hasil && (
        <div className="border-2 border-[#CAB170] bg-skin-gold p-4 space-y-3" data-testid="kalkulator-hasil">
          <p className="text-xs font-editorial tracking-[0.2em] uppercase text-[#A8925A]">
            Harga Maksimal Bahan
          </p>
          {hasil.over ? (
            <p className="text-sm text-red-500">
              Biaya tetap ({fmtRp(tetap.total)}) sudah melebihi target. Naikkan harga jual atau
              turunkan margin.
            </p>
          ) : (
            <p className="text-3xl font-bold text-[#CAB170]">
              {fmtRp(hasil.hargaMaksPerYard)} <span className="text-sm font-normal">/ yard</span>
            </p>
          )}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-skin-text3">Target HPP</span><span className="font-semibold text-skin-text2">{fmtRp(hasil.hppMaks)}</span></div>
            <div className="flex justify-between"><span className="text-skin-text3">Biaya tetap</span><span className="font-semibold text-skin-text2">− {fmtRp(tetap.total)}</span></div>
            <div className="flex justify-between border-t border-[#CAB170]/40 pt-1"><span className="text-skin-text3">Sisa untuk bahan</span><span className="font-semibold text-skin-text2">{fmtRp(Math.max(hasil.budgetBahan, 0))}</span></div>
          </div>
          {stat?.avgHarga && !hasil.over && (
            <p className="text-[11px] text-skin-text3">
              Harga bahan {jenisLabel} di template saat ini rata-rata {fmtRp(stat.avgHarga)} / yard
              {stat.avgHarga <= hasil.hargaMaksPerYard ? " — masih di bawah batas." : " — di atas batas."}
            </p>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer text-skin-text3 hover:text-skin-text">Rincian biaya tetap</summary>
            <div className="mt-2 space-y-1">
              {tetap.rows.map((r) => (
                <div key={r.label} className="flex justify-between">
                  <span className="text-skin-text3">{r.label}</span>
                  <span className="text-skin-text2">{fmtRp(r.val)}</span>
                </div>
              ))}
            </div>
          </details>
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
