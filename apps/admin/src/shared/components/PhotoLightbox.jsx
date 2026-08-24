/**
 * PhotoLightbox.jsx — viewer foto full-size, tap-to-zoom, prev/next.
 * Dipakai lintas fitur admin (permintaan Denny 2026-08: "tiap foto bisa di
 * klik untuk lihat secara full size" — mulai dari Planning, tapi generik
 * supaya bisa dipakai fitur lain juga tanpa duplikasi).
 *
 * Diadaptasi dari apps/catalog/src/features/product-detail/components/
 * PhotoLightbox.jsx (pola yang sama sudah terbukti dipakai di katalog
 * publik) — versi ini disederhanakan jadi foto saja (tanpa video, tidak
 * dibutuhkan admin) dan `images` adalah array of string URL langsung
 * (bukan array of {type,src}).
 *
 * z-[70] (bukan z-50 seperti modal admin lain) supaya tetap tampil di atas
 * modal yang sedang terbuka (mis. dibuka dari dalam MarkDibuatModal).
 */
import { useEffect, useState } from "react";

export default function PhotoLightbox({ images, index, onClose, onNavigate }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setZoomed(false);
  }, [index]);

  if (index === null || index === undefined) return null;
  const src = images?.[index];
  if (!src) return null;

  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black flex items-center justify-center overflow-hidden"
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Tutup"
        className="absolute top-4 right-4 z-10 text-white/70 hover:text-white transition text-2xl leading-none w-11 h-11 flex items-center justify-center"
      >
        &#x2715;
      </button>

      {hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(-1);
          }}
          aria-label="Sebelumnya"
          className="absolute left-1 md:left-4 z-10 text-white/70 hover:text-white transition text-3xl leading-none w-11 h-11 flex items-center justify-center"
        >
          &#8249;
        </button>
      )}

      {hasNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(1);
          }}
          aria-label="Berikutnya"
          className="absolute right-1 md:right-4 z-10 text-white/70 hover:text-white transition text-3xl leading-none w-11 h-11 flex items-center justify-center"
        >
          &#8250;
        </button>
      )}

      <img
        src={src}
        alt="Foto"
        onClick={(e) => {
          e.stopPropagation();
          setZoomed((z) => !z);
        }}
        className="max-w-full max-h-full object-contain transition-transform duration-300 select-none"
        style={{
          transform: zoomed ? "scale(2.2)" : "scale(1)",
          cursor: zoomed ? "zoom-out" : "zoom-in",
        }}
      />

      {images.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 font-editorial text-[11px] tracking-[0.2em] text-white/50 pointer-events-none">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
