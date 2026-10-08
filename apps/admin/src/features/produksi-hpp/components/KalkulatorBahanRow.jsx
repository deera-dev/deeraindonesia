/**
 * KalkulatorBahanRow.jsx — satu baris bahan di KalkulatorHPP. Deera hampir
 * selalu memakai 2 bahan atau lebih (Denny 2026-10-08), jadi kalkulator
 * punya banyak baris: jenis (Motif/Polos), pemakaian (yard, default rata-rata
 * template), lalu SALAH SATU: harga/yard bila sudah diketahui, atau "Cari
 * harga maksimal" untuk bahan yang sedang dicari.
 */
export default function KalkulatorBahanRow({
  row,
  stat,
  fmtRp,
  fieldFullCls,
  canRemove,
  onChange,
  onJenis,
  onRemove,
}) {
  const pakai = row.pakai ?? (stat ? String(stat.avg) : "");
  const harga = row.harga ?? (stat?.avgHarga ? String(stat.avgHarga) : "");
  const jenisBtn = (value, label) => (
    <button
      type="button"
      onClick={() => onJenis(value)}
      className={`px-3 py-1.5 text-[11px] font-editorial tracking-[0.1em] uppercase transition ${
        row.jenis === value ? "bg-[#CAB170] text-white" : "text-skin-text3 hover:text-skin-text"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="border border-skin-bdr p-3 space-y-2" data-testid="kalkulator-bahan-row">
      <div className="flex items-center justify-between gap-2">
        <div className="flex border border-skin-bdr">
          {jenisBtn("motif", "Motif")}
          {jenisBtn("polos", "Polos")}
        </div>
        <label className="flex items-center gap-1.5 text-[11px] text-skin-text2 cursor-pointer">
          <input
            type="checkbox"
            checked={row.cari}
            onChange={(e) => onChange({ cari: e.target.checked })}
            className="accent-[#CAB170]"
          />
          Cari harga maksimal
        </label>
        {canRemove && (
          <button type="button" onClick={onRemove} aria-label="Hapus bahan" className="text-red-400 hover:text-red-600 text-xl leading-none">
            ×
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <input
            type="number"
            min="0"
            step="0.01"
            value={pakai}
            onChange={(e) => onChange({ pakai: e.target.value })}
            aria-label="Pemakaian (yard)"
            placeholder="Pemakaian (yard)"
            className={fieldFullCls}
          />
        </div>
        <div className="flex-1">
          {row.cari ? (
            <div className="px-3 py-2 text-xs text-[#CAB170] border border-dashed border-[#CAB170]/50">
              harga dicari
            </div>
          ) : (
            <input
              type="number"
              min="0"
              value={harga}
              onChange={(e) => onChange({ harga: e.target.value })}
              aria-label="Harga per yard"
              placeholder="Harga / yard"
              className={fieldFullCls}
            />
          )}
        </div>
      </div>
      <p className="text-[10px] text-skin-text4">
        {stat
          ? `Rata-rata ${stat.n} bahan ${row.jenis}: ${stat.avg} yard${stat.avgHarga ? `, ${fmtRp(stat.avgHarga)} / yard` : ""} (rentang ${stat.min}–${stat.max}).`
          : `Belum ada data ${row.jenis} di template HPP — isi manual.`}
      </p>
    </div>
  );
}
