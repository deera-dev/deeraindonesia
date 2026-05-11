import { SIZE_PRESETS, formatHarga } from "../../lib/constants";

export default function SizeSection({ activeSet, hargaMap, onToggle, onHarga, saving }) {
  return (
    <div className="mb-8">
      <label className="block font-editorial text-[10px] tracking-[0.3em] text-white/50 mb-4 uppercase">
        Ukuran Tersedia &amp; Harga Jual
      </label>

      <div className="space-y-2">
        {SIZE_PRESETS.map((preset) => {
          const isActive = activeSet.has(preset.size);
          return (
            <div key={preset.size}
              onClick={() => !saving && onToggle(preset.size)}
              className={`flex items-center gap-3 p-3 border cursor-pointer transition ${isActive ? "border-white/30 bg-white/5" : "border-white/10 hover:border-white/20"}`}
            >
              <div className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center transition ${isActive ? "border-[#cab170] bg-[#cab170]" : "border-white/25"}`}>
                {isActive && <span className="text-black text-[9px] font-bold leading-none">&#10003;</span>}
              </div>
              <div className="flex-1">
                <p className={`font-editorial text-xs tracking-[0.2em] uppercase transition ${isActive ? "text-white" : "text-white/40"}`}>
                  {preset.size}
                </p>
                <p className="font-editorial text-[9px] text-white/30 mt-0.5">
                  Ld {preset.ld} &middot; Pb {preset.pb}
                </p>
              </div>
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <span className="font-editorial text-[10px] text-white/30">Rp</span>
                <input
                  type="text" inputMode="numeric"
                  value={hargaMap[preset.size] ?? ""}
                  onChange={(e) => onHarga(preset.size, e.target.value)}
                  disabled={!isActive || saving}
                  placeholder="230000"
                  className={`w-24 bg-transparent border px-2 py-1 font-editorial text-xs text-right focus:outline-none transition ${isActive ? "border-white/20 text-white focus:border-white/50" : "border-white/10 text-white/20 cursor-not-allowed"}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* PREVIEW */}
      {activeSet.size > 0 && (
        <div className="mt-3 p-3 border border-white/10 bg-white/[0.02]">
          <p className="font-editorial text-[9px] tracking-[0.2em] text-white/30 mb-1.5 uppercase">Preview WA:</p>
          {SIZE_PRESETS.filter((p) => activeSet.has(p.size)).map((p) => (
            <p key={p.size} className="font-editorial text-[10px] text-white/45">
              {p.size} (Ld {p.ld} | Pb {p.pb}) &rarr; Rp {formatHarga(hargaMap[p.size]) || "—"}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
