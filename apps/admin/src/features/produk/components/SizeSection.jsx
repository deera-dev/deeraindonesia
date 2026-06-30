import { SIZE_PRESETS, formatHarga } from "@deera/shared/lib/constants";

export default function SizeSection({ activeSet, hargaMap, onToggle, onHarga, saving }) {
  return (
    <div className="mb-8">
      <label className="block font-editorial text-sm tracking-[0.2em] text-skin-text2 mb-4 uppercase">
        Ukuran Tersedia &amp; Harga Jual
      </label>
      <div className="space-y-3">
        {SIZE_PRESETS.map((preset) => {
          const isActive = activeSet.has(preset.size);
          return (
            <div
              key={preset.size}
              onClick={() => !saving && onToggle(preset.size)}
              className={`flex items-center gap-3 p-4 border-2 cursor-pointer transition ${isActive ? "border-[#CAB170] bg-skin-gold" : "border-skin-bdr bg-skin-card hover:border-[#CAB170]/40"}`}
            >
              <div
                className={`w-6 h-6 flex-shrink-0 border-2 flex items-center justify-center transition ${isActive ? "border-[#CAB170] bg-[#CAB170]" : "border-[#C8C4C0]"}`}
              >
                {isActive && <span className="text-white text-sm font-bold leading-none">✓</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-editorial text-base tracking-[0.1em] uppercase font-medium ${isActive ? "text-skin-text" : "text-skin-text3"}`}
                >
                  {preset.size}
                </p>
                <p className="font-editorial text-sm text-skin-text3">
                  LD {preset.ld} · PB {preset.pb} cm
                </p>
              </div>
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="font-editorial text-sm text-skin-text3">Rp</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={hargaMap[preset.size] ?? ""}
                  onChange={(e) => onHarga(preset.size, e.target.value)}
                  disabled={!isActive || saving}
                  placeholder="230000"
                  className={`w-28 border-2 px-3 py-2 font-editorial text-base text-right focus:outline-none transition ${isActive ? "border-skin-bdr text-skin-text focus:border-[#CAB170] bg-skin-card" : "border-skin-bdr-lt text-skin-text4 cursor-not-allowed bg-skin-page"}`}
                />
              </div>
            </div>
          );
        })}
      </div>

      {activeSet.size > 0 && (
        <div className="mt-4 p-4 border-2 border-skin-bdr-gold bg-skin-gold">
          <p className="font-editorial text-xs tracking-[0.2em] text-skin-text3 mb-2 uppercase">
            Preview WA:
          </p>
          {SIZE_PRESETS.filter((p) => activeSet.has(p.size)).map((p) => (
            <p key={p.size} className="font-editorial text-sm text-skin-text2">
              {p.size} (LD {p.ld} | PB {p.pb}) → Rp {formatHarga(hargaMap[p.size]) || "—"}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
