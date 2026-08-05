import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { LOCATIONS, LOCATION_LABELS } from "@deera/shared/lib/marketDay";

const STOK_STATUS_OPTIONS = [
  { value: "semua", label: "Semua" },
  { value: "ada", label: "Ada Stok" },
  { value: "habis", label: "Habis" },
];

const SORT_OPTIONS = [
  { value: "terbaru", label: "Terbaru" },
  { value: "terlaris", label: "Paling Banyak Laku" },
];

const labelCls = "block mb-2 font-editorial text-xs tracking-[0.15em] text-skin-text3 uppercase";
const selectCls =
  "w-full px-4 py-3 text-sm font-editorial border-2 border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-[#CAB170] transition cursor-pointer";
const numberCls =
  "w-full px-3 py-3 text-sm font-editorial border-2 border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-[#CAB170] transition";

export default function ProductFilterModal({
  draft,
  onChange,
  allWarna,
  previewCount,
  onApply,
  onReset,
  onClose,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text">
            Filter Produk
          </h2>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <div>
            <label className={labelCls}>Ukuran</label>
            <select
              value={draft.size}
              onChange={(e) => onChange({ size: e.target.value })}
              className={selectCls}
            >
              <option value="">Semua Ukuran</option>
              {SIZE_PRESETS.map((preset) => (
                <option key={preset.size} value={preset.size}>
                  {preset.size}
                </option>
              ))}
            </select>
          </div>

          {allWarna.length > 0 && (
            <div>
              <label className={labelCls}>Warna</label>
              <select
                value={draft.warna}
                onChange={(e) => onChange({ warna: e.target.value })}
                className={selectCls}
              >
                <option value="">Semua Warna</option>
                {allWarna.map((warna) => (
                  <option key={warna} value={warna}>
                    {warna}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className={labelCls}>Status Stok</label>
            <select
              value={draft.stokStatus}
              onChange={(e) => onChange({ stokStatus: e.target.value })}
              className={selectCls}
            >
              {STOK_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Lokasi Stok</label>
            <select
              value={draft.lokasi}
              onChange={(e) => onChange({ lokasi: e.target.value })}
              className={selectCls}
            >
              <option value="semua">Semua Lokasi</option>
              {LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>
                  Ada di {LOCATION_LABELS[loc] ?? loc}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls}>Rentang Harga Jual</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                value={draft.hargaMin}
                onChange={(e) => onChange({ hargaMin: e.target.value })}
                className={numberCls}
              />
              <span className="text-skin-text4 flex-shrink-0">—</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                value={draft.hargaMax}
                onChange={(e) => onChange({ hargaMax: e.target.value })}
                className={numberCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Rentang HPP</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                value={draft.hppMin}
                onChange={(e) => onChange({ hppMin: e.target.value })}
                className={numberCls}
              />
              <span className="text-skin-text4 flex-shrink-0">—</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                value={draft.hppMax}
                onChange={(e) => onChange({ hppMax: e.target.value })}
                className={numberCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Urutkan</label>
            <select
              value={draft.sort}
              onChange={(e) => onChange({ sort: e.target.value })}
              className={selectCls}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">
          <button
            onClick={onReset}
            className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition"
          >
            Reset
          </button>
          <button
            onClick={onApply}
            className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
          >
            Terapkan ({previewCount})
          </button>
        </div>
      </div>
    </div>
  );
}
