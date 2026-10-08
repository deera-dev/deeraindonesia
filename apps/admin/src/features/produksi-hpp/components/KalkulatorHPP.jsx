/**
 * KalkulatorHPP.jsx — Kalkulator harga maksimal bahan per yard (tidak disimpan).
 *
 * Permintaan Denny 2026-10-08: komponen biaya (upah, plastik, kancing, pin,
 * poin) bisa dibilang tetap, jadi kalkulator dibalik — dari target harga jual
 * (+ margin) atau HPP target, berapa harga bahan per yard paling mahal yang
 * masih masuk. Deera hampir selalu memakai 2 bahan atau lebih, jadi ada
 * banyak baris bahan (lihat KalkulatorBahanRow & hitungBahanMulti): bahan yang
 * harganya sudah diketahui mengurangi budget, sisanya jadi batas harga bahan
 * yang dicari. Rata-rata pemakaian/harga dihitung LANGSUNG dari template HPP
 * yang ada (bukan disimpan), sehingga otomatis ikut berubah saat template
 * ditambah/diubah.
 */
import { useMemo, useState } from "react";
import {
  avgPemakaianBahan,
  biayaTetapKalkulator,
  hitungBahanMulti,
  hppTargetDari,
} from "../utils";
import KalkulatorBahanRow from "./KalkulatorBahanRow";

const DEFAULT_MARGIN = 40;
let rowSeq = 0;
const mkRow = (jenis, cari) => ({ id: ++rowSeq, jenis, cari, pakai: null, harga: null });
const initialRows = () => [mkRow("motif", true), mkRow("polos", false)];

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
  const [rows, setRows] = useState(initialRows);

  const stats = useMemo(() => avgPemakaianBahan(templates), [templates]);
  const tetap = useMemo(() => biayaTetapKalkulator({ tipe, config, templates }), [tipe, config, templates]);
  const hppMaks = hppTargetDari({ mode, hargaJual, marginPct, hppTarget });

  const effRows = rows.map((r) => ({
    cari: r.cari,
    pakai: r.pakai ?? stats[r.jenis]?.avg ?? 0,
    harga: r.harga ?? stats[r.jenis]?.avgHarga ?? 0,
    jenis: r.jenis,
  }));
  const hasil = hitungBahanMulti({ hppMaks, biayaTetap: tetap.total, rows: effRows });
  const cariRows = effRows.filter((r) => r.cari);
  const cariJenis = [...new Set(cariRows.map((r) => r.jenis))];
  const refHarga = cariJenis.length === 1 ? stats[cariJenis[0]]?.avgHarga : null;
  const cariLabel = cariJenis.length === 1 ? `Bahan ${cariJenis[0]}` : "Bahan";

  const patchRow = (id, patch) => setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  function reset() {
    setMode("jual");
    setHargaJual("");
    setMarginPct(String(DEFAULT_MARGIN));
    setHppTarget("");
    setTipe("gamis");
    setRows(initialRows());
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-skin-text3">
        Berapa harga bahan per yard paling mahal yang masih masuk target? Tandai bahan yang
        dicari, isi harga bahan lainnya. Biaya tetap otomatis dari Harga Dasar. Tidak disimpan.
      </p>

      <Toggle value={mode} onChange={setMode} options={[{ value: "jual", label: "Dari Harga Jual" }, { value: "hpp", label: "Dari HPP Target" }]} />

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

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className={labelCls + " mb-0"}>Bahan</label>
          <button
            type="button"
            onClick={() => setRows((p) => [...p, mkRow("polos", false)])}
            className="text-[10px] tracking-[0.12em] uppercase font-editorial text-[#CAB170] hover:text-[#A8925A] transition"
          >
            + Tambah Bahan
          </button>
        </div>
        {rows.map((r) => (
          <KalkulatorBahanRow
            key={r.id}
            row={r}
            stat={stats[r.jenis]}
            fmtRp={fmtRp}
            fieldFullCls={fieldFullCls}
            canRemove={rows.length > 1}
            onChange={(patch) => patchRow(r.id, patch)}
            onJenis={(jenis) => patchRow(r.id, { jenis, pakai: null, harga: null })}
            onRemove={() => setRows((p) => p.filter((x) => x.id !== r.id))}
          />
        ))}
        <p className="text-[10px] text-skin-text4">
          Rata-rata dihitung langsung dari semua template HPP, jadi otomatis ikut berubah saat
          template ditambah atau diubah.
        </p>
      </div>

      {hasil && (
        <div className="border-2 border-[#CAB170] bg-skin-gold p-4 space-y-3" data-testid="kalkulator-hasil">
          {hasil.tipe === "cari" ? (
            <>
              <p className="text-xs font-editorial tracking-[0.2em] uppercase text-[#A8925A]">{cariLabel}: Harga Maksimal</p>
              {hasil.over ? (
                <p className="text-sm text-red-500">
                  Biaya tetap dan bahan lain sudah melebihi target. Naikkan harga jual, turunkan
                  margin, atau cari bahan lain yang lebih murah.
                </p>
              ) : (
                <p className="text-3xl font-bold text-[#CAB170]">
                  {fmtRp(hasil.hargaMaksPerYard)} <span className="text-sm font-normal">/ yard</span>
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-xs font-editorial tracking-[0.2em] uppercase text-[#A8925A]">Cek Target</p>
              <p className={`text-2xl font-bold ${hasil.over ? "text-red-500" : "text-[#CAB170]"}`}>
                {hasil.over ? "Lebih " : "Sisa "}
                {fmtRp(Math.abs(hasil.selisih))} / baju
              </p>
            </>
          )}
          <div className="space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-skin-text3">Target HPP</span><span className="font-semibold text-skin-text2">{fmtRp(hasil.hppMaks)}</span></div>
            <div className="flex justify-between"><span className="text-skin-text3">Biaya tetap</span><span className="font-semibold text-skin-text2">− {fmtRp(tetap.total)}</span></div>
            {hasil.bahanDiketahui > 0 && (
              <div className="flex justify-between"><span className="text-skin-text3">Bahan lain (harga diketahui)</span><span className="font-semibold text-skin-text2">− {fmtRp(hasil.bahanDiketahui)}</span></div>
            )}
            {hasil.tipe === "cari" && (
              <div className="flex justify-between border-t border-[#CAB170]/40 pt-1"><span className="text-skin-text3">Sisa untuk bahan dicari</span><span className="font-semibold text-skin-text2">{fmtRp(Math.max(hasil.budgetCari, 0))}</span></div>
            )}
          </div>
          {refHarga && hasil.tipe === "cari" && !hasil.over && (
            <p className="text-[11px] text-skin-text3">
              Harga bahan {cariJenis[0]} di template saat ini rata-rata {fmtRp(refHarga)} / yard
              {refHarga <= hasil.hargaMaksPerYard ? " — masih di bawah batas." : " — di atas batas."}
            </p>
          )}
          <details className="text-xs">
            <summary className="cursor-pointer text-skin-text3 hover:text-skin-text">Rincian biaya tetap</summary>
            <div className="mt-2 space-y-1">
              {tetap.rows.map((r) => (
                <div key={r.label} className="flex justify-between"><span className="text-skin-text3">{r.label}</span><span className="text-skin-text2">{fmtRp(r.val)}</span></div>
              ))}
            </div>
          </details>
        </div>
      )}

      <button type="button" onClick={reset} className="w-full py-2.5 font-editorial text-xs tracking-[0.18em] uppercase text-skin-text3 border border-skin-bdr hover:text-skin-text transition">
        Reset
      </button>
    </div>
  );
}
