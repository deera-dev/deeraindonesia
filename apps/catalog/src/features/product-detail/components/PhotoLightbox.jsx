import { useEffect, useState } from "react";

/**
 * PhotoLightbox — fullscreen viewer untuk foto detail produk.
 * Tap foto untuk zoom in/out (toggle scale), tombol kiri/kanan untuk
 * pindah antar foto. index === null berarti tertutup.
 */
export default function PhotoLightbox({ photos, index, onClose, onNavigate }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setZoomed(false);
  }, [index]);

  if (index === null || index === undefined) return null;

  const src = photos[index];
  const hasPrev = index > 0;
  const hasNext = index < photos.length - 1;

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
        aria-label="Tutup galeri"
        className="absolute top-5 right-5 z-10 text-white/70 hover:text-white transition text-2xl leading-none w-11 h-11 flex items-center justify-center"
      >
        &#x2715;
      </button>

      {hasPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate(-1);
          }}
          aria-label="Foto sebelumnya"
          className="absolute left-2 md:left-5 z-10 text-white/70 hover:text-white transition text-3xl leading-none w-11 h-11 flex items-center justify-center"
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
          aria-label="Foto berikutnya"
          className="absolute right-2 md:right-5 z-10 text-white/70 hover:text-white transition text-3xl leading-none w-11 h-11 flex items-center justify-center"
        >
          &#8250;
        </button>
      )}

      <img
        src={src}
        alt=""
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

      {photos.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 font-editorial text-[11px] tracking-[0.2em] text-white/50 pointer-events-none">
          {index + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
