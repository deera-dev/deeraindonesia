import { LOCATIONS } from "@deera/shared/lib/marketDay";

const LOC_TEXT_CLASS = {
  gudang: "text-sky-500 dark:text-sky-400",
  cideng: "text-violet-500 dark:text-violet-400",
  tegalgubug: "text-rose-500 dark:text-rose-400",
};
const LOC_SHORT = { gudang: "GD", cideng: "CD", tegalgubug: "TG" };

// Grid 3 lokasi (sama gayanya dengan WarnaPanel kasir mode gabungan) --
// dipakai di EditSaleModal supaya admin EKSPLISIT pilih sendiri dari lokasi
// mana nambah/kurangi stok, bukan otomatis/diam-diam kayak sebelumnya.
export default function LocationQtyRow({ breakdown, maxByLoc, onChange }) {
  const qtyAtLoc = (loc) => breakdown.find((b) => b.location === loc)?.qty ?? 0;
  return (
    <div className="grid grid-cols-3 gap-2">
      {LOCATIONS.map((loc) => {
        const max = maxByLoc[loc] ?? 0;
        const qty = qtyAtLoc(loc);
        return (
          <div key={loc} className="flex flex-col items-center gap-1">
            <span className={`text-[10px] font-bold uppercase tracking-wide ${LOC_TEXT_CLASS[loc]}`}>
              {LOC_SHORT[loc]} · {max} pcs
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => onChange(loc, Math.max(0, qty - 1))}
                disabled={qty <= 0}
                className="w-7 h-7 border border-skin-bdr text-sm text-skin-text2 hover:border-red-300 hover:text-red-500 transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                aria-label={`Kurangi ${LOC_SHORT[loc]}`}
              >
                −
              </button>
              <span className="text-sm font-bold text-skin-text w-5 text-center">{qty}</span>
              <button
                type="button"
                onClick={() => onChange(loc, Math.min(max, qty + 1))}
                disabled={qty >= max}
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
  );
}
