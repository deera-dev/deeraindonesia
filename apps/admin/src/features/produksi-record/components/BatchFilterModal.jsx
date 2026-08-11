/**
 * BatchFilterModal.jsx — Filter full-screen bottom-sheet untuk grid Catatan
 * Produksi (ProduksiRecordPage). Pola & styling sama persis dengan
 * ProductFilterModal.jsx di features/produk/components/.
 */
const BAHAN_STATUS_OPTIONS = [
  { value: "semua", label: "Semua" },
  { value: "sinkron", label: "Bahan Sudah Tersinkron" },
  { value: "belum", label: "Bahan Belum Tersinkron" },
];

const SORT_OPTIONS = [
  { value: "terbaru", label: "Tanggal: Terbaru" },
  { value: "terlama", label: "Tanggal: Terlama" },
  { value: "potong-terbanyak", label: "Jumlah Potong: Terbanyak" },
  { value: "potong-tersedikit", label: "Jumlah Potong: Tersedikit" },
  { value: "hpp-tertinggi", label: "HPP/pcs: Tertinggi" },
  { value: "hpp-terendah", label: "HPP/pcs: Terendah" },
];

const labelCls = "block mb-2 font-editorial text-xs tracking-[0.15em] text-skin-text3 uppercase";
const selectCls =
  "w-full px-4 py-3 text-sm font-editorial border-2 border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-[#CAB170] transition cursor-pointer";
const numberCls =
  "w-full px-3 py-3 text-sm font-editorial border-2 border-skin-bdr bg-skin-card text-skin-text focus:outline-none focus:border-[#CAB170] transition";
const dateCls = numberCls;

export default function BatchFilterModal({ draft, onChange, previewCount, onApply, onReset, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text">
            Filter Catatan Produksi
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
            <label className={labelCls}>Rentang Tanggal Produksi</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={draft.tanggalMin}
                onChange={(e) => onChange({ tanggalMin: e.target.value })}
                className={dateCls}
              />
              <span className="text-skin-text4 flex-shrink-0">—</span>
              <input
                type="date"
                value={draft.tanggalMax}
                onChange={(e) => onChange({ tanggalMax: e.target.value })}
                className={dateCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Rentang Jumlah Potong</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                value={draft.potongMin}
                onChange={(e) => onChange({ potongMin: e.target.value })}
                className={numberCls}
              />
              <span className="text-skin-text4 flex-shrink-0">—</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                value={draft.potongMax}
                onChange={(e) => onChange({ potongMax: e.target.value })}
                className={numberCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Rentang HPP / pcs</label>
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
            <label className={labelCls}>Rentang Upah Jahit / pcs</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                inputMode="numeric"
                placeholder="Min"
                value={draft.upahJahitMin}
                onChange={(e) => onChange({ upahJahitMin: e.target.value })}
                className={numberCls}
              />
              <span className="text-skin-text4 flex-shrink-0">—</span>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Max"
                value={draft.upahJahitMax}
                onChange={(e) => onChange({ upahJahitMax: e.target.value })}
                className={numberCls}
              />
            </div>
          </div>

          <div>
            <label className={labelCls}>Status Bahan</label>
            <select
              value={draft.bahanStatus}
              onChange={(e) => onChange({ bahanStatus: e.target.value })}
              className={selectCls}
            >
              {BAHAN_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
