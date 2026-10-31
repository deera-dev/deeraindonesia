import type { Product } from "@deera/shared/features/products/schema";
import type { ReactNode } from "react";
import { getFilterOptions } from "../utils";

interface ChipProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}

function Chip({ active, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "px-3.5 py-2 font-editorial text-xs tracking-[0.1em] uppercase border transition " +
        (active
          ? "bg-skin-accent border-skin-accent text-skin-on-accent"
          : "border-skin-bdr/25 text-skin-text/60 hover:border-skin-bdr/50 hover:text-skin-text/90")
      }
    >
      {children}
    </button>
  );
}

interface FilterModalProps {
  open: boolean;
  products: Product[] | null | undefined;
  bahan: string | null;
  ukuran: string | null;
  resultCount: number;
  onSetBahan: (bahan: string) => void;
  onSetUkuran: (ukuran: string) => void;
  onReset: () => void;
  onClose: () => void;
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
}: FilterModalProps) {
  if (!open) return null;

  const { bahanList, ukuranList } = getFilterOptions(products);
  const hasActiveFilter = !!bahan || !!ukuran;

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-backdrop-in"
      />

      <div className="relative z-10 w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[80dvh] flex flex-col bg-skin-page border-skin-bdr/10 md:border animate-sheet-up">
        <div className="flex items-center justify-between px-5 py-5 border-b border-skin-bdr/10 flex-shrink-0">
          <p className="font-editorial text-sm tracking-[0.3em] text-skin-text/70 uppercase">
            Filter
          </p>
          <button
            onClick={onClose}
            aria-label="Tutup filter"
            className="text-skin-text/50 hover:text-skin-text transition text-2xl leading-none w-9 h-9 flex items-center justify-center"
          >
            &#x2715;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          {bahanList.length > 0 && (
            <div className="mb-8">
              <p className="font-editorial text-[11px] tracking-[0.25em] text-skin-text/35 uppercase mb-3">
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
              <p className="font-editorial text-[11px] tracking-[0.25em] text-skin-text/35 uppercase mb-3">
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
            <p className="font-editorial text-skin-text/30 text-xs tracking-[0.2em] text-center py-8">
              BELUM ADA DATA FILTER
            </p>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr/10 px-5 py-4 flex items-center justify-between gap-4">
          <p className="font-editorial text-xs tracking-[0.1em] text-skin-text/40">
            {resultCount} produk cocok
          </p>
          <div className="flex items-center gap-4">
            {hasActiveFilter && (
              <button
                onClick={onReset}
                className="font-editorial text-xs tracking-[0.2em] text-skin-text/40 hover:text-skin-text/80 uppercase transition"
              >
                Reset
              </button>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 font-editorial text-xs tracking-[0.2em] uppercase border border-skin-accent/60 text-skin-accent-text hover:bg-skin-accent hover:text-skin-on-accent transition"
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
