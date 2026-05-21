import { SIZE_PRESETS, formatHarga } from "@deera/shared/lib/constants";

// stokMap shape: { [size]: { gudang: number, cideng: number, tegalgubug: number } }

export default function StockSection({ stokMap, setStokMap, hpp, setHpp, activeSet, hargaMap, saving }) {
  const activeSizes = SIZE_PRESETS.filter((p) => activeSet.has(p.size));

  function setStok(size, loc, val) {
    setStokMap((prev) => ({
      ...prev,
      [size]: { ...(prev[size] ?? {}), [loc]: parseInt(val) || 0 },
    }));
  }

  const totalGudang   = activeSizes.reduce((s, p) => s + (stokMap[p.size]?.gudang    ?? 0), 0);
  const totalCideng   = activeSizes.reduce((s, p) => s + (stokMap[p.size]?.cideng    ?? 0), 0);
  const totalTegal    = activeSizes.reduce((s, p) => s + (stokMap[p.size]?.tegalgubug ?? 0), 0);
  const totalAll      = totalGudang + totalCideng + totalTegal;

  const cellCls = "bg-transparent border border-white/15 px-2 py-1.5 text-white font-editorial text-xs text-right w-full focus:outline-none focus:border-white/50 disabled:opacity-40 transition";

  return (
    <div className="mb-8">
      <label className="block font-editorial text-[10px] tracking-[0.3em] text-white/50 mb-4 uppercase">
        Stok per Ukuran &amp; HPP
      </label>

      {activeSizes.length === 0 ? (
        <p className="font-editorial text-[10px] text-white/30 italic">Pilih ukuran terlebih dahulu.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[340px] border-collapse">
            <thead>
              <tr>
                {["Ukuran", "Gudang", "Cideng", "Tegalgubug", "Total"].map((h) => (
                  <th key={h} className="font-editorial text-[9px] tracking-[0.2em] text-white/35 uppercase pb-2 pr-2 text-right first:text-left">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.05]">
              {activeSizes.map((p) => {
                const g = stokMap[p.size]?.gudang    ?? 0;
                const c = stokMap[p.size]?.cideng    ?? 0;
                const t = stokMap[p.size]?.tegalgubug ?? 0;
                const row = g + c + t;
                return (
                  <tr key={p.size}>
                    <td className="pr-3 py-1.5">
                      <span className="font-editorial text-[11px] text-white/60 uppercase">{p.size}</span>
                    </td>
                    {[
                      { loc: "gudang",     val: g },
                      { loc: "cideng",     val: c },
                      { loc: "tegalgubug", val: t },
                    ].map(({ loc, val }) => (
                      <td key={loc} className="pr-2 py-1.5">
                        <input
                          type="number" min="0"
                          value={val === 0 ? "" : val}
                          placeholder="0"
                          onChange={(e) => setStok(p.size, loc, e.target.value)}
                          disabled={saving}
                          className={cellCls}
                        />
                      </td>
                    ))}
                    <td className="py-1.5">
                      <div className={`border border-white/10 px-2 py-1.5 font-editorial text-xs text-right ${row === 0 ? "text-white/20" : "text-white/55"}`}>
                        {row}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-white/15">
                <td className="pt-2 pr-3">
                  <span className="font-editorial text-[9px] text-white/40 uppercase tracking-[0.15em]">Total</span>
                </td>
                {[totalGudang, totalCideng, totalTegal, totalAll].map((v, i) => (
                  <td key={i} className="pt-2 pr-2">
                    <div className={`px-2 font-editorial text-xs text-right ${v === 0 ? "text-white/20" : "text-white/70"}`}>{v}</div>
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* HPP */}
      <div className="mt-6">
        <label className="block font-editorial text-[9px] tracking-[0.2em] text-white/35 mb-1.5 uppercase">HPP (Harga Pokok — per produk)</label>
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
              const jual   = parseInt(hargaMap[p.size] ?? "0") || 0;
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
