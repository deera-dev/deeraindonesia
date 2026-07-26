import { useEffect, useState } from "react";

/**
 * PhotoLightbox — fullscreen viewer untuk galeri produk (foto + video
 * digabung jadi satu urutan navigasi, bukan cuma foto). Tiap item di
 * `media` berbentuk { type: "image" | "video", src, poster? }.
 * - Foto: tap untuk zoom in/out (toggle scale), sama seperti sebelumnya.
 * - Video: pakai poster (thumbnail frame) + kontrol video native
 *   (di-stopPropagation supaya klik kontrol tidak ikut menutup lightbox
 *   atau ke-treat sebagai toggle zoom — video tidak punya konsep zoom).
 * index === null berarti tertutup. Tombol sebelumnya/berikutnya jalan
 * lintas tipe (dari foto bisa lanjut ke slide video, & sebaliknya).
 */
export default function PhotoLightbox({ media, index, onClose, onNavigate }) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setZoomed(false);
  }, [index]);

  if (index === null || index === undefined) return null;

  const item = media[index];
  const hasPrev = index > 0;
  const hasNext = index < media.length - 1;

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
          aria-label="Sebelumnya"
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
          aria-label="Berikutnya"
          className="absolute right-2 md:right-5 z-10 text-white/70 hover:text-white transition text-3xl leading-none w-11 h-11 flex items-center justify-center"
        >
          &#8250;
        </button>
      )}

      {item.type === "video" ? (
        <video
          key={item.src}
          src={item.src}
          poster={item.poster}
          controls
          playsInline
          onClick={(e) => e.stopPropagation()}
          className="max-w-full max-h-full object-contain select-none"
        />
      ) : (
        <img
          src={item.src}
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
      )}

      {media.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 font-editorial text-[11px] tracking-[0.2em] text-white/50 pointer-events-none">
          {index + 1} / {media.length}
        </div>
      )}
    </div>
  );
}
