/**
 * ProductCard.jsx
 * Kartu produk di grid Admin — stok terlihat jelas dengan warna.
 *
 * Props:
 * - product  : objek produk
 * - stok     : { gudang, cideng, tegalgubug }
 * - onTap    : () => void
 * - onCopyWA : () => void
 * - isCopied : boolean
 */
import { cldUrl } from "@deera/shared/lib/cloudinary";

const LOCS = [
  { key: "gudang", label: "GD" },
  { key: "cideng", label: "CD" },
  { key: "tegalgubug", label: "TG" },
];

export default function ProductCard({ product: p, stok = {}, onTap, onCopyWA, isCopied }) {
  const total = (stok.gudang ?? 0) + (stok.cideng ?? 0) + (stok.tegalgubug ?? 0);
  const isHabis = total === 0;

  return (
    <article
      className="bg-skin-card border-2 border-skin-bdr hover:border-[#CAB170] transition cursor-pointer flex flex-col"
      onClick={onTap}
    >
      {/* Foto */}
      <div className="relative aspect-square overflow-hidden bg-skin-raised">
        {p.image ? (
          <img
            src={cldUrl(p.image, { width: 320 })}
            alt={p.kode}
            loading="lazy"
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-skin-text4 text-3xl">
            —
          </div>
        )}

        {/* Badge total stok */}
        <div
          className={`absolute top-0 right-0 px-2.5 py-1.5 text-sm font-bold border-b-2 border-l-2 ${
            isHabis
              ? "text-white bg-red-600 border-red-700"
              : total < 5
                ? "text-white bg-amber-500 border-amber-600"
                : "text-white bg-[#5A7A3A] border-[#4A6A2A]"
          }`}
        >
          {isHabis ? "HABIS" : total}
        </div>
      </div>

      {/* Kode */}
      <div className="px-2.5 pt-2 pb-1">
        <p className="font-headline text-[#CAB170] text-lg text-center leading-none truncate">
          {p.kode}
        </p>
      </div>

      {/* Stok per lokasi */}
      <div className="grid grid-cols-3 divide-x divide-skin-bdr-lt border-t border-skin-bdr-lt mx-2.5 mb-2">
        {LOCS.map(({ key, label }) => {
          const val = stok[key] ?? 0;
          const color =
            val === 0
              ? "text-red-400"
              : val < 3
                ? "text-amber-500"
                : "text-green-600 dark:text-green-400";
          return (
            <div key={key} className="flex flex-col items-center py-2">
              <span className="text-xs text-skin-text3 font-medium tracking-wide leading-none mb-1">
                {label}
              </span>
              <span className={`text-xl font-black leading-tight ${color}`}>{val}</span>
            </div>
          );
        })}
      </div>

      {/* Footer: ikon WA */}
      <div className="border-t-2 border-skin-bdr mt-auto" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onCopyWA}
          title="Copy teks WA"
          className={`w-full py-1 flex items-center justify-center transition ${
            isCopied
              ? "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400"
              : "text-skin-text3 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-950"
          }`}
        >
          {isCopied ? (
            <span className="text-sm font-semibold tracking-wide">✓ Tersalin</span>
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="w-5 h-5 fill-current"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          )}
        </button>
      </div>
    </article>
  );
}
