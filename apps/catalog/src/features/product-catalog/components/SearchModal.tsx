import type { Product } from "@deera/shared/features/products/schema";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { filterProducts } from "../utils";

interface SearchModalProps {
  open: boolean;
  query: string;
  products: Product[] | null | undefined;
  soldOutSet: Set<string>;
  onSetQuery: (query: string) => void;
  onSelect: (kode: string) => void;
  onClose: () => void;
}

export default function SearchModal({
  open,
  query,
  products,
  soldOutSet,
  onSetQuery,
  onSelect,
  onClose,
}: SearchModalProps) {
  if (!open) return null;

  const results = filterProducts(products, query);

  function handleSelect(kode: string) {
    onSelect(kode);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center">
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/85 backdrop-blur-sm animate-backdrop-in"
      />

      <div className="relative z-10 w-full max-w-lg h-[100dvh] md:h-auto md:mt-20 md:max-h-[80dvh] flex flex-col bg-aurum-bg border-aurum-border/10 md:border animate-sheet-up">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-aurum-border/10 flex-shrink-0">
          <input
            autoFocus
            type="text"
            inputMode="search"
            value={query}
            onChange={(e) => onSetQuery(e.target.value)}
            placeholder="Cari kode atau nama produk..."
            className="flex-1 bg-transparent font-body text-aurum-text/90 text-base tracking-[0.05em] placeholder:text-aurum-text/30 outline-none"
          />
          <button
            onClick={onClose}
            aria-label="Tutup pencarian"
            className="text-aurum-text/50 hover:text-aurum-text transition text-2xl leading-none w-9 h-9 flex items-center justify-center flex-shrink-0"
          >
            &#x2715;
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {query.trim() === "" && (
            <p className="px-5 py-10 text-center font-body text-aurum-text/30 text-xs tracking-[0.2em]">
              KETIK KODE ATAU NAMA PRODUK
            </p>
          )}
          {query.trim() !== "" && results.length === 0 && (
            <p className="px-5 py-10 text-center font-body text-aurum-text/30 text-xs tracking-[0.2em]">
              TIDAK DITEMUKAN
            </p>
          )}
          {results.map((p) => (
            <button
              key={p.kode}
              onClick={() => handleSelect(p.kode)}
              className="flex items-center gap-4 w-full px-5 py-3 text-left border-b border-aurum-border/5 hover:bg-aurum-text/5 transition"
            >
              <img
                src={cldUrl(p.image, { width: 100 })}
                alt=""
                aria-hidden
                className="w-12 h-14 object-cover flex-shrink-0 bg-aurum-text/5"
              />
              <span className="min-w-0 flex-1">
                <span className="block font-display text-aurum-accent text-lg leading-none">
                  {p.kode}
                </span>
                <span className="block mt-1 font-display text-aurum-text/60 text-base truncate">
                  {p.nama}
                </span>
              </span>
              {soldOutSet?.has(p.kode) && (
                <span className="flex-shrink-0 font-body text-[10px] tracking-[0.15em] text-aurum-danger/80 uppercase">
                  Sold out
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
