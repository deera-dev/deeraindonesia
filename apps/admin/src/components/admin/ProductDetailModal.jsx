/**
 * ProductDetailModal.jsx
 * Modal detail produk di Admin — tampil saat kartu produk di-tap.
 * Berisi info lengkap + tombol Edit, Hapus, Copy WA.
 *
 * Props:
 * - product  : objek produk
 * - stok     : { gudang, cideng, tegalgubug }
 * - onClose  : () => void
 * - onEdit   : () => void
 * - onDelete : () => void
 * - onCopyWA : () => void
 * - isCopied : boolean
 */
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { formatHarga } from "@deera/shared/lib/constants";

const LOCS = [
  { key: "gudang", label: "Gudang" },
  { key: "cideng", label: "Cideng" },
  { key: "tegalgubug", label: "Tegalgubug" },
];

export default function ProductDetailModal({
  product: p,
  stok = {},
  onClose,
  onEdit,
}) {
  const total =
    (stok.gudang ?? 0) + (stok.cideng ?? 0) + (stok.tegalgubug ?? 0);
  const isHabis = total === 0;
  const variants = (p.variants ?? []).filter((v) => v.harga > 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-skin-card w-full max-w-sm mx-auto border-t-2 md:border-2 border-skin-bdr shadow-2xl flex flex-col max-h-[100dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-skin-bdr flex-shrink-0">
          <h3 className="text-2xl text-[#CAB170] leading-none font-headline">
            {p.kode}
          </h3>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-skin-text3 hover:text-skin-text text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Foto */}
          {p.image && (
            <div className="aspect-[3/4] max-h-64 overflow-hidden bg-skin-raised mx-auto w-full">
              <img
                src={cldUrl(p.image, { width: 480 })}
                alt={p.kode}
                className="object-cover object-top w-full h-full"
              />
            </div>
          )}

          {/* Info dasar */}
          <div className="space-y-1">
            <p className="text-lg text-skin-text font-semibold leading-snug">
              {p.nama}
            </p>
            {p.bahan && <p className="text-base text-skin-text2">{p.bahan}</p>}
            {p.hpp > 0 && (
              <p className="text-base text-skin-text3">
                HPP: Rp {formatHarga(p.hpp)}
              </p>
            )}
          </div>

          {/* Ukuran & harga */}
          {variants.length > 0 && (
            <div className="border-t border-skin-bdr-lt pt-4">
              <p className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-2">
                Ukuran & Harga
              </p>
              <div className="space-y-1.5">
                {variants.map((v, i) => (
                  <div key={i} className="flex justify-between items-baseline">
                    <span className="text-base font-semibold text-skin-text uppercase tracking-wide">
                      {v.size}
                    </span>
                    <span className="text-base text-[#CAB170] font-semibold">
                      Rp {formatHarga(v.harga)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stok per lokasi / ukuran */}
          <div className="border-t border-skin-bdr-lt pt-4">
            <p className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-3">
              Stok
            </p>

            {stok.sizes && Object.keys(stok.sizes).length > 1 ? (
              /* Per-size breakdown table */
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-skin-bdr-lt">
                      <th className="text-left py-1.5 text-xs text-skin-text3 uppercase tracking-wide font-semibold">
                        Ukuran
                      </th>
                      {LOCS.map((l) => (
                        <th
                          key={l.key}
                          className="text-right py-1.5 px-1 text-xs text-skin-text3 uppercase tracking-wide font-semibold"
                        >
                          {l.label}
                        </th>
                      ))}
                      <th className="text-right py-1.5 text-xs text-skin-text3 uppercase tracking-wide font-semibold">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-skin-bdr-lt">
                    {Object.entries(stok.sizes).map(([size, vals]) => {
                      const sizeTotal =
                        (vals.gudang ?? 0) +
                        (vals.cideng ?? 0) +
                        (vals.tegalgubug ?? 0);
                      return (
                        <tr key={size}>
                          <td className="py-2 text-sm font-bold text-skin-text uppercase">
                            {size}
                          </td>
                          {LOCS.map((l) => (
                            <td
                              key={l.key}
                              className={`py-2 px-1 text-right text-sm ${vals[l.key] === 0 ? "text-skin-text4" : "text-skin-text2"}`}
                            >
                              {vals[l.key] ?? 0}
                            </td>
                          ))}
                          <td
                            className={`py-2 text-right text-sm font-bold ${sizeTotal === 0 ? "text-skin-text4" : "text-skin-text"}`}
                          >
                            {sizeTotal}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-skin-bdr">
                      <td className="pt-2.5 text-sm font-bold text-skin-text uppercase tracking-wide">
                        Total
                      </td>
                      {LOCS.map((l) => (
                        <td
                          key={l.key}
                          className={`pt-2.5 px-1 text-right text-sm font-bold ${(stok[l.key] ?? 0) === 0 ? "text-skin-text4" : "text-skin-text2"}`}
                        >
                          {stok[l.key] ?? 0}
                        </td>
                      ))}
                      <td
                        className={`pt-2.5 text-right text-base font-bold ${isHabis ? "text-red-500" : "text-skin-text"}`}
                      >
                        {isHabis ? "HABIS" : total}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            ) : (
              /* Single-size or no-sizes: show simple loc breakdown */
              <div className="space-y-3">
                {LOCS.map(({ key, label }) => {
                  const val = stok[key] ?? 0;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-base text-skin-text2 font-medium">
                        {label}
                      </span>
                      <span
                        className={`text-3xl font-bold leading-none ${val === 0 ? "text-skin-text4" : "text-skin-text"}`}
                      >
                        {val}
                      </span>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between border-t-2 border-skin-bdr pt-3">
                  <span className="text-base text-skin-text font-bold uppercase tracking-wide">
                    Total
                  </span>
                  <span
                    className={`text-4xl font-bold leading-none ${isHabis ? "text-red-500" : "text-skin-text"}`}
                  >
                    {isHabis ? "HABIS" : total}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Warna */}
          {p.warna?.length > 0 && (
            <div className="border-t border-skin-bdr-lt pt-4">
              <p className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-2">
                {p.warna.length} Warna
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.warna.map((w, i) => (
                  <span
                    key={i}
                    className="text-sm text-skin-text2 border border-skin-bdr bg-skin-page px-2.5 py-1"
                  >
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Aksi */}
        <div className="flex-shrink-0 border-t-2 border-skin-bdr">
          <button
            onClick={() => { onClose(); onEdit(); }}
            className="w-full py-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text2 hover:text-[#CAB170] hover:bg-skin-gold transition"
          >
            ✎ Edit Produk
          </button>
        </div>
      </div>
    </div>
  );
}
