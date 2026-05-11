import { SIZE_PRESETS, formatHarga } from "../../lib/constants";

export default function StockSection({
  stokGudang, setStokGudang,
  stokCideng, setStokCideng,
  stokTegalgubug, setStokTegalgubug,
  hpp, setHpp,
  activeSet, hargaMap,
  saving,
}) {
  const totalStok =
    (parseInt(stokGudang) || 0) +
    (parseInt(stokCideng) || 0) +
    (parseInt(stokTegalgubug) || 0);

  const numCls = "w-full bg-transparent border border-white/15 px-3 py-2 text-white font-editorial text-sm text-right focus:outline-none focus:border-white/50 disabled:opacity-40 transition";

  return (
    <div className="mb-8">
      <label className="block font-editorial text-[10px] tracking-[0.3em] text-white/50 mb-4 uppercase">
        Stok &amp; HPP
      </label>

      {/* STOK GRID */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Gudang", val: stokGudang, set: setStokGudang },
          { label: "Cideng", val: stokCideng, set: setStokCideng },
          { label: "Tegalgubug", val: stokTegalgubug, set: setStokTegalgubug },
        ].map(({ label, val, set }) => (
          <div key={label}>
            <label className="block font-editorial text-[9px] tracking-[0.2em] text-white/35 mb-1.5 uppercase">{label}</label>
            <input type="number" min="0" value={val} onChange={(e) => set(e.target.value)} disabled={saving} className={numCls} />
          </div>
        ))}
        <div>
          <label className="block font-editorial text-[9px] tracking-[0.2em] text-white/35 mb-1.5 uppercase">Total</label>
          <div className="border border-white/10 px-3 py-2 font-editorial text-sm text-right text-white/50">{totalStok}</div>
        </div>
      </div>

      {/* HPP */}
      <div className="mt-4">
        <label className="block font-editorial text-[9px] tracking-[0.2em] text-white/35 mb-1.5 uppercase">HPP (Harga Pokok)</label>
        <div className="flex items-center gap-2">
          <span className="font-editorial text-[10px] text-white/30">Rp</span>
          <input type="text" inputMode="numeric" value={hpp}
            onChange={(e) => setHpp(e.target.value.replace(/\D/g, ""))}
            disabled={saving} placeholder="150000"
            className="flex-1 bg-transparent border border-white/15 px-3 py-2 text-white font-editorial text-sm text-right focus:outline-none focus:border-white/50 disabled:opacity-40 transition" />
        </div>

        {/* MARGIN PREVIEW */}
        {hpp && activeSet.size > 0 && (
          <div className="mt-2 space-y-0.5">
            {SIZE_PRESETS.filter((p) => activeSet.has(p.size)).map((p) => {
              const jual = parseInt(hargaMap[p.size] ?? "0") || 0;
              const hppVal = parseInt(hpp) || 0;
              if (!jual || !hppVal) return null;
              const margin = Math.round(((jual - hppVal) / jual) * 100);
              return (
                <p key={p.size} className="font-editorial text-[9px] text-white/30">
                  {p.size}: margin {margin}% (untung Rp {formatHarga(jual - hppVal)})
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
