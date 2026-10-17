import { formatHarga } from "@deera/shared/lib/constants";
import { getMarketLabel, LOCATIONS } from "@deera/shared/lib/marketDay";
import { getEffectiveStokWarna, getStokAllLocations } from "../../../shared/lib/salesUtils";

const LOC_TEXT_CLASS = {
  gudang: "text-sky-500 dark:text-sky-400",
  cideng: "text-violet-500 dark:text-violet-400",
  tegalgubug: "text-rose-500 dark:text-rose-400",
};
const LOC_SHORT = { gudang: "GD", cideng: "CD", tegalgubug: "TG" };

export default function WarnaPanel({
  warnaPanel,
  selectedWarna,
  location,
  gabungan = false,
  selectedBreakdown = {},
  onClose,
  onConfirm,
  onSelectAll,
  onReset,
  onSetWarna,
  onSetWarnaLoc,
}) {
  if (!warnaPanel) return null;
  const { product, variant } = warnaPanel;
  const locLabel = getMarketLabel(location);

  const totalDipilih = Object.values(selectedWarna).reduce((s, q) => s + q, 0);
  const totalRp = totalDipilih * variant.harga;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center">
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />

      <div className="relative bg-skin-card w-full md:w-[460px] md:max-h-[90vh] overflow-y-auto border-t-2 md:border-2 border-skin-bdr shadow-2xl">
        <div className="px-4 py-3 border-b-2 border-skin-bdr flex items-center justify-between sticky top-0 bg-skin-card z-10">
          <div className="min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              <p className="text-lg text-skin-accent-text leading-none font-headline">{product.kode}</p>
              <p className="text-sm text-skin-text2">
                {variant.size} · <strong>Rp {formatHarga(variant.harga)}</strong>
              </p>
            </div>
            <p className="text-xs text-skin-text3 mt-0.5">
              HPP {formatHarga(product.hpp)} · {locLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center text-skin-text3 hover:text-skin-text text-2xl leading-none flex-shrink-0 ml-2"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 flex gap-2">
          <button
            onClick={onSelectAll}
            className="flex-1 py-2.5 bg-skin-gold border-2 border-skin-bdr-gold text-sm tracking-[0.08em] uppercase text-skin-accent-text hover:bg-skin-accent hover:text-white hover:border-skin-accent transition font-semibold"
          >
            Seri Penuh ({product.warna.length} warna)
          </button>
          <button
            onClick={onReset}
            className="px-4 py-2.5 border-2 border-skin-bdr text-sm text-skin-text2 hover:border-red-300 hover:text-red-500 transition"
          >
            Reset
          </button>
        </div>

        <div className="px-4 pb-2 space-y-1.5">
          {product.warna.map((w) => {
            const qty = selectedWarna[w] ?? 0;
            const isSelected = qty > 0;
            const stokByLoc = gabungan ? getStokAllLocations(product, variant.size, w) : null;
            const stok = gabungan
              ? LOCATIONS.reduce((s, l) => s + (stokByLoc[l] ?? 0), 0)
              : getEffectiveStokWarna(product, variant.size, w, location, selectedWarna);
            const outOfStock = stok === 0;
            const bd = selectedBreakdown[w] ?? {};

            function toggleWarna() {
              if (outOfStock) return;
              if (!gabungan) {
                onSetWarna(w, isSelected ? 0 : 1);
                return;
              }
              if (isSelected) {
                LOCATIONS.forEach((l) => onSetWarnaLoc(w, l, 0));
                return;
              }
              const primaryStok = stokByLoc[location] ?? 0;
              const targetLoc = primaryStok > 0 ? location : LOCATIONS.find((l) => (stokByLoc[l] ?? 0) > 0);
              if (targetLoc) onSetWarnaLoc(w, targetLoc, 1);
            }

            return (
              <div
                key={w}
                className={`border transition ${
                  outOfStock
                    ? "border-skin-bdr bg-skin-page opacity-50"
                    : isSelected
                      ? "border-skin-accent bg-skin-gold"
                      : "border-skin-bdr bg-skin-card"
                }`}
              >
                <div className="flex items-center px-3 py-2 gap-2">
                  <button
                    onClick={toggleWarna}
                    disabled={outOfStock}
                    className="flex items-center gap-2.5 flex-1 text-left min-w-0 disabled:cursor-not-allowed"
                  >
                    <div
                      className={`w-6 h-6 border-2 flex items-center justify-center flex-shrink-0 transition ${
                        isSelected ? "border-skin-accent bg-skin-accent" : "border-skin-text4"
                      }`}
                    >
                      {isSelected && (
                        <span className="text-white text-sm font-bold leading-none">✓</span>
                      )}
                    </div>
                    <div className="min-w-0 flex items-baseline gap-2">
                      <span className={`text-sm transition ${isSelected ? "text-skin-text font-semibold" : "text-skin-text2"}`}>
                        {w}
                      </span>
                      <span className={`text-xs ${outOfStock ? "text-red-600 font-semibold" : "text-skin-text3"}`}>
                        {outOfStock ? "habis" : `${stok} pcs`}
                      </span>
                    </div>
                  </button>

                  {!gabungan && isSelected && !outOfStock && (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => onSetWarna(w, Math.max(0, qty - 1))}
                        className="w-9 h-9 border border-skin-bdr text-xl text-skin-text2 hover:border-red-300 hover:text-red-500 transition flex items-center justify-center"
                        aria-label="Kurangi"
                      >
                        −
                      </button>
                      <span className="text-base font-bold text-skin-text w-7 text-center">{qty}</span>
                      <button
                        onClick={() => onSetWarna(w, Math.min(stok, qty + 1))}
                        disabled={qty >= stok}
                        className="w-9 h-9 border border-skin-bdr text-xl text-skin-text2 hover:border-skin-accent hover:text-skin-accent-text transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                        aria-label="Tambah"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>

                {gabungan && isSelected && !outOfStock && (
                  <div className="grid grid-cols-3 gap-2 px-3 pb-2.5">
                    {LOCATIONS.map((loc) => {
                      const locStok = stokByLoc[loc] ?? 0;
                      const locQty = bd[loc] ?? 0;
                      return (
                        <div key={loc} className="flex flex-col items-center gap-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wide ${LOC_TEXT_CLASS[loc]}`}>
                            {LOC_SHORT[loc]} · {locStok} pcs
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onSetWarnaLoc(w, loc, Math.max(0, locQty - 1))}
                              className="w-7 h-7 border border-skin-bdr text-sm text-skin-text2 hover:border-red-300 hover:text-red-500 transition flex items-center justify-center"
                              aria-label={`Kurangi ${LOC_SHORT[loc]}`}
                            >
                              −
                            </button>
                            <span className="text-sm font-bold text-skin-text w-5 text-center">{locQty}</span>
                            <button
                              onClick={() => onSetWarnaLoc(w, loc, Math.min(locStok, locQty + 1))}
                              disabled={locQty >= locStok}
                              className="w-7 h-7 border border-skin-bdr text-sm text-skin-text2 hover:border-skin-accent hover:text-skin-accent-text transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                              aria-label={`Tambah ${LOC_SHORT[loc]}`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-4 pb-4 pt-3 border-t-2 border-skin-bdr mt-1 sticky bottom-0 bg-skin-card">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm text-skin-text2">{totalDipilih} warna dipilih</span>
            <span className="text-xl font-bold text-skin-text leading-none">
              {totalDipilih > 0 ? `Rp ${formatHarga(totalRp)}` : "—"}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => onConfirm({ lanjut: true })}
              disabled={totalDipilih === 0}
              className="w-full py-3.5 border-2 border-skin-accent text-skin-accent-text text-sm tracking-[0.15em] uppercase hover:bg-skin-accent hover:text-skin-on-accent transition disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              Lanjut Pilih Produk
            </button>
            <button
              onClick={() => onConfirm()}
              disabled={totalDipilih === 0}
              className="w-full py-4 bg-skin-accent text-skin-on-accent text-base tracking-[0.2em] uppercase hover:bg-skin-accent-hover transition disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              Tambah ke Pesanan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
