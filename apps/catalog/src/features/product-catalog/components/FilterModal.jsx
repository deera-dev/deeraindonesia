import { getFilterOptions } from "../utils";

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3.5 py-2 font-editorial text-xs tracking-[0.1em] uppercase border transition " +
        (active
          ? "bg-[#cab170] border-[#cab170] text-black"
          : "border-white/25 text-white/60 hover:border-white/50 hover:text-white/90")
      }
    >
      {children}
    </button>
  );
}

export default function FilterModal({
  open,
  products,
  bahan,
  ukuran,
  resultCount,
  onSetBahan,
  onSetUkuran,
  onReset,
  onClose,
}) {
  if (!open) return null;

  const { bahanList, ukuranList } = getFilterOptions(products);
  const hasActiveFilter = !!bahan || !!ukuran;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div onClick={onClose} className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-backdrop-in" />

      <div className="relative z-10 w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[80dvh] flex flex-col bg-black border-white/10 md:border animate-sheet-up">
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10 flex-shrink-0">
          <p className="font-editorial text-sm tracking-[0.3em] text-white/70 uppercase">Filter</p>
          <button
            onClick={onClose}
            aria-label="Tutup filter"
            className="text-white/50 hover:text-white transition text-2xl leading-none w-9 h-9 flex items-center justify-center"
          >
            &#x2715;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {bahanList.length > 0 && (
            <div className="mb-8">
              <p className="font-editorial text-[11px] tracking-[0.25em] text-white/35 uppercase mb-3">
                Bahan
              </p>
              <div className="flex flex-wrap gap-2">
                {bahanList.map((b) => (
                  <Chip key={b} active={bahan === b} onClick={() => onSetBahan(b)}>
                    {b}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {ukuranList.length > 0 && (
            <div>
              <p className="font-editorial text-[11px] tracking-[0.25em] text-white/35 uppercase mb-3">
                Ukuran
              </p>
              <div className="flex flex-wrap gap-2">
                {ukuranList.map((u) => (
                  <Chip key={u} active={ukuran === u} onClick={() => onSetUkuran(u)}>
                    {u}
                  </Chip>
                ))}
              </div>
            </div>
          )}

          {bahanList.length === 0 && ukuranList.length === 0 && (
            <p className="font-editorial text-white/30 text-xs tracking-[0.2em] text-center py-8">
              BELUM ADA DATA FILTER
            </p>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-white/10 px-5 py-4 flex items-center justify-between gap-4">
          <p className="font-editorial text-xs tracking-[0.1em] text-white/40">
            {resultCount} produk cocok
          </p>
          <div className="flex items-center gap-4">
            {hasActiveFilter && (
              <button
                onClick={onReset}
                className="font-editorial text-xs tracking-[0.2em] text-white/40 hover:text-white/80 uppercase transition"
              >
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 font-editorial text-xs tracking-[0.2em] uppercase border border-[#cab170]/60 text-[#cab170] hover:bg-[#cab170] hover:text-black transition"
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
