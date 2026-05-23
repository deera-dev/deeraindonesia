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
  { key: "gudang",     label: "Gudang"     },
  { key: "cideng",     label: "Cideng"     },
  { key: "tegalgubug", label: "Tegalgubug" },
];

export default function ProductDetailModal({
  product: p,
  stok = {},
  onClose,
  onEdit,
  onDelete,
  onCopyWA,
  isCopied,
}) {
  const total   = (stok.gudang ?? 0) + (stok.cideng ?? 0) + (stok.tegalgubug ?? 0);
  const isHabis = total === 0;
  const variants = (p.variants ?? []).filter((v) => v.harga > 0);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-skin-card w-full max-w-sm mx-auto border-t-2 md:border-2 border-skin-bdr shadow-2xl flex flex-col max-h-[90dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-skin-bdr flex-shrink-0">
          <h3
            className="text-2xl text-[#CAB170] leading-none font-headline"
          >
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
                className="object-cover w-full h-full"
              />
            </div>
          )}

          {/* Info dasar */}
          <div className="space-y-1">
            <p className="text-lg text-skin-text font-semibold leading-snug">{p.nama}</p>
            {p.bahan && <p className="text-base text-skin-text2">{p.bahan}</p>}
            {p.hpp > 0 && <p className="text-base text-skin-text3">HPP: Rp {formatHarga(p.hpp)}</p>}
          </div>

          {/* Ukuran & harga */}
          {variants.length > 0 && (
            <div className="border-t border-skin-bdr-lt pt-4">
              <p className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-2">Ukuran & Harga</p>
              <div className="space-y-1.5">
                {variants.map((v, i) => (
                  <div key={i} className="flex justify-between items-baseline">
                    <span className="text-base font-semibold text-skin-text uppercase tracking-wide">{v.size}</span>
                    <span className="text-base text-[#CAB170] font-semibold">Rp {formatHarga(v.harga)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stok per lokasi */}
          <div className="border-t border-skin-bdr-lt pt-4">
            <p className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-3">Stok</p>
            <div className="space-y-3">
              {LOCS.map(({ key, label }) => {
                const val = stok[key] ?? 0;
                return (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-base text-skin-text2 font-medium">{label}</span>
                    <span className={`text-3xl font-bold leading-none ${val === 0 ? "text-skin-text4" : "text-skin-text"}`}>
                      {val}
                    </span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between border-t-2 border-skin-bdr pt-3">
                <span className="text-base text-skin-text font-bold uppercase tracking-wide">Total</span>
                <span className={`text-4xl font-bold leading-none ${isHabis ? "text-red-500" : "text-skin-text"}`}>
                  {isHabis ? "HABIS" : total}
                </span>
              </div>
            </div>
          </div>

          {/* Warna */}
          {p.warna?.length > 0 && (
            <div className="border-t border-skin-bdr-lt pt-4">
              <p className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-2">{p.warna.length} Warna</p>
              <div className="flex flex-wrap gap-1.5">
                {p.warna.map((w, i) => (
                  <span key={i} className="text-sm text-skin-text2 border border-skin-bdr bg-skin-page px-2.5 py-1">
                    {w}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Aksi */}
        <div className="flex-shrink-0 border-t-2 border-skin-bdr grid grid-cols-3">
          <button
            onClick={() => { onClose(); onEdit(); }}
            className="py-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text2 hover:text-[#CAB170] hover:bg-skin-gold transition border-r-2 border-skin-bdr"
          >
            ✎ Edit
          </button>
          <button
            onClick={() => { onClose(); onDelete(); }}
            className="py-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text3 hover:text-red-600 hover:bg-red-50 transition border-r-2 border-skin-bdr"
          >
            🗑 Hapus
          </button>
          <button
            onClick={onCopyWA}
            className={`py-5 text-sm tracking-[0.1em] uppercase font-semibold transition ${
              isCopied ? "text-green-600 bg-green-50" : "text-green-600 hover:bg-green-50"
            }`}
          >
            {isCopied ? "✓ Tersalin" : "Copy WA"}
          </button>
        </div>
      </div>
    </div>
  );
}
