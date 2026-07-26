import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { WhatsApp } from "../../../shared/components/WhatsApp";
import { useProduct, useProducts } from "@deera/shared/features/products/hooks";
import { cldUrl, cldVideoPoster } from "@deera/shared/lib/cloudinary";
import { shareProductViaWA, getAdjacentKodes } from "../utils";
import PhotoLightbox from "./PhotoLightbox";
// Status ketersediaan (SOLD OUT / STOK TERBATAS) dipakai bersama katalog &
// halaman detail — import hooks.js (public surface) fitur lain, konsisten
// dengan Dependency Inversion di CLAUDE.md §4/§7.
import {
  useSoldOutSet,
  useLimitedStokSet,
  useBaruSet,
  useTerlarisMap,
} from "../../product-catalog/hooks";
import { TERLARIS_LABELS } from "../../product-catalog/utils";
import { useFavorites } from "../../favorites/hooks";
import FavoriteButton from "../../favorites/components/FavoriteButton";

// ── Hero image dengan efek "blur-up": versi buram resolusi rendah tampil
//    dulu (langsung ada, tanpa jeda kosong), lalu di-preload versi resolusi
//    penuh via objek Image() di background — begitu siap, src ditukar &
//    blur dihilangkan dengan transisi halus. Karena blurSrc & src berasal
//    dari sumber gambar yang SAMA (cuma beda parameter width), aspect
//    ratio-nya identik, jadi tidak ada layout shift saat ditukar. ─────────
function HeroImage({ src, blurSrc, alt, priority, onClick }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    if (!src || typeof window === "undefined") return;
    const img = new window.Image();
    img.onload = () => setReady(true);
    /* v8 ignore next @preserve -- fallback defensif kalau Image gagal load
       (mis. network error); tanpa ini foto akan macet di versi blur
       selamanya. Jarang terjadi & sulit dipicu deterministik di test. */
    img.onerror = () => setReady(true);
    img.src = src;
    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

  return (
    <img
      src={ready ? src : blurSrc}
      alt={alt}
      loading="eager"
      fetchpriority={priority ? "high" : "auto"}
      decoding="async"
      onClick={onClick}
      className={
        "w-full h-auto block cursor-zoom-in transition-[filter] duration-500 ease-out " +
        (ready ? "blur-0" : "blur-md scale-[1.02]")
      }
    />
  );
}

export default function ProductDetail() {
  const { kode } = useParams();
  const { product, loading, error } = useProduct(kode);
  const { products } = useProducts();
  const soldOutSet = useSoldOutSet();
  const limitedStokSet = useLimitedStokSet();
  const baruSet = useBaruSet();
  const terlarisMap = useTerlarisMap();
  const { favoriteKodes, toggle: toggleFavorite } = useFavorites();
  const [sharing, setSharing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Reset galeri (hero aktif & lightbox) tiap kali pindah produk (kode
  // berubah) — komponen ini TIDAK remount saat navigasi Sebelumnya/
  // Selanjutnya (masih route yang sama, cuma param :kode berubah), jadi
  // tanpa reset ini activeIndex/lightboxIndex lama bisa nyasar menunjuk ke
  // slide yang salah di produk baru.
  useEffect(() => {
    setActiveIndex(0);
    setLightboxIndex(null);
  }, [kode]);

  if (loading)
    return (
      <main className="flex items-center justify-center w-full min-h-screen bg-black">
        <p className="font-editorial text-white/40 text-base tracking-[0.3em]">LOADING...</p>
      </main>
    );

  if (error)
    return (
      <main className="flex flex-col items-center justify-center w-full min-h-screen bg-black px-7 text-center">
        <p className="font-editorial text-white/60 text-lg tracking-[0.2em]">GAGAL MEMUAT PRODUK</p>
        <p className="mt-3 font-editorial text-white/30 text-base">{error.message}</p>
      </main>
    );

  if (!product) return <Navigate to="/catalog" replace />;

  // Sumber foto MENTAH (belum di-transform Cloudinary) — dipakai untuk
  // generate DUA versi per foto (full-res utk hero, low-res utk blur-up)
  // dari asal yang sama, supaya aspect ratio identik (lihat HeroImage).
  const rawPhotoSources = [product.image, ...(product.detail ?? [])].filter(Boolean);
  const photoCount = rawPhotoSources.length;
  const ambientBlurSrc = cldUrl(product.image, { width: 300 });

  // Foto & video digabung jadi SATU urutan navigasi (thumbnail strip +
  // lightbox) — video selalu di slide terakhir, konsisten dengan urutan
  // lama (foto utama → detail → video).
  const media = [
    ...rawPhotoSources.map((raw, i) => ({
      type: "image",
      src: cldUrl(raw, { width: 1400 }),
      blurSrc: cldUrl(raw, { width: 48 }),
      alt: i === 0 ? product.nama : `${product.nama} ${i + 1}`,
    })),
    ...(product.video
      ? [
          {
            type: "video",
            src: product.video,
            poster: cldVideoPoster(product.video, { width: 900 }),
          },
        ]
      : []),
  ];
  const activeMedia = media[activeIndex] ?? media[0];

  const variants = product.variants ?? [];
  const waText = `Assalamu'alaikum, saya tertarik dengan produk ${product.kode} - ${product.nama}`;
  const waUrl = `https://wa.me/62811947254?text=${encodeURIComponent(waText)}`;
  const { prevKode, nextKode } = getAdjacentKodes(products, kode);
  const isSoldOut = soldOutSet.has(product.kode);
  const isLimitedStok = !isSoldOut && limitedStokSet.has(product.kode);
  const isBaru = baruSet.has(product.kode);
  const terlarisPeriode = terlarisMap.get(product.kode) ?? null;
  const terlarisLabel = terlarisPeriode ? TERLARIS_LABELS[terlarisPeriode] : null;

  function navigateLightbox(delta) {
    setLightboxIndex((i) => {
      if (i === null) return i;
      const next = i + delta;
      if (next < 0 || next >= media.length) return i;
      return next;
    });
  }

  return (
    <main className="min-h-screen bg-black text-white">
      {/* Split dua-kolom (sidebar + foto) HANYA di layar lebar (>=1024px).
          Tablet (termasuk iPad portrait 768-1024px) tetap satu kolom
          tersusun ke bawah — sidebar 400px fixed akan terasa dominan &
          menyempitkan kolom foto di lebar segitu. */}
      <div className="lg:grid lg:grid-cols-[380px_1fr] xl:grid-cols-[440px_1fr] lg:min-h-screen">
        <aside className="lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto flex flex-col px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-16 xl:px-16 border-b border-white/5 lg:border-b-0 lg:border-r lg:border-white/5">
          <Link
            to="/catalog"
            className="mb-10 self-start font-editorial text-sm tracking-[0.3em] text-white/30 uppercase hover:text-white/60 transition py-2"
          >
            ← Katalog
          </Link>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-headline text-[#cab170] text-5xl leading-none">{product.kode}</p>
              <p className="mt-4 font-script text-white/65 text-3xl leading-tight">{product.nama}</p>
            </div>
            <FavoriteButton
              size="lg"
              active={favoriteKodes.has(product.kode)}
              onToggle={() => toggleFavorite(product.kode)}
              className="flex-shrink-0 border border-white/15"
            />
          </div>

          {(terlarisLabel || isBaru || isSoldOut || isLimitedStok) && (
            <div className="flex flex-wrap gap-2 mt-4">
              {terlarisLabel && (
                <span className="animate-chip-in px-3 py-1 font-editorial text-xs tracking-[0.2em] text-white bg-gradient-to-r from-[#c2410c] to-[#ea580c] uppercase shadow-[0_0_10px_rgba(234,88,12,0.35)]">
                  &#128293; {terlarisLabel}
                </span>
              )}
              {isBaru && (
                <span className="animate-chip-in px-3 py-1 font-editorial text-xs tracking-[0.2em] text-black bg-[#cab170] uppercase">
                  Baru
                </span>
              )}
              {isSoldOut && (
                <span className="animate-chip-in px-3 py-1 font-editorial text-xs tracking-[0.2em] text-red-500/85 border border-red-500/40 uppercase">
                  Sold Out
                </span>
              )}
              {isLimitedStok && (
                <span className="animate-chip-in px-3 py-1 font-editorial text-xs tracking-[0.2em] text-red-400 border border-red-500/50 uppercase">
                  Stok Terbatas
                </span>
              )}
            </div>
          )}

          <div className="w-10 h-px mt-6 mb-6 bg-[#cab170]/25" />

          {product.bahan && (
            <p className="font-editorial text-white/35 text-base tracking-[0.1em] mb-7">
              {product.bahan}
            </p>
          )}

          {variants.length > 0 && (
            <div className="mb-8">
              <p className="font-editorial text-sm tracking-[0.3em] text-white/35 uppercase mb-4">
                Ukuran
              </p>
              <div className="flex flex-col divide-y divide-white/5">
                {variants.map((v) => (
                  <div key={v.size} className="flex items-center justify-between py-3.5">
                    <span className="font-editorial text-lg text-white/80">{v.size}</span>
                    <div className="flex gap-5">
                      <span className="font-editorial text-base text-white/50">
                        <span className="text-white/25 text-xs tracking-[0.1em] mr-1.5">LD</span>
                        {v.ld} cm
                      </span>
                      <span className="font-editorial text-base text-white/50">
                        <span className="text-white/25 text-xs tracking-[0.1em] mr-1.5">PB</span>
                        {v.pb} cm
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto flex flex-col gap-3">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-4 font-editorial text-base tracking-[0.2em] uppercase border border-white/20 text-white/60 hover:border-[#cab170]/60 hover:text-[#cab170] transition"
            >
              <WhatsApp className="w-5 h-5 text-green-400" />
              Tanya via WhatsApp
            </a>
            <button
              type="button"
              disabled={sharing}
              onClick={async () => {
                setSharing(true);
                try {
                  await shareProductViaWA(product);
                } finally {
                  setSharing(false);
                }
              }}
              className="flex items-center justify-center gap-3 w-full py-4 font-editorial text-base tracking-[0.2em] uppercase border border-white/20 text-white/40 hover:border-[#cab170]/60 hover:text-[#cab170] transition disabled:opacity-40"
            >
              {sharing ? "MEMBAGIKAN..." : "SHARE PRODUK"}
            </button>

            {(prevKode || nextKode) && (
              <div className="flex items-stretch gap-3 pt-3 mt-1 border-t border-white/5">
                {prevKode ? (
                  <Link
                    to={`/code/${prevKode}`}
                    className="flex-1 py-3 text-center font-editorial text-xs tracking-[0.2em] text-white/40 uppercase hover:text-[#cab170] transition"
                  >
                    ← Sebelumnya
                  </Link>
                ) : (
                  <span className="flex-1" />
                )}
                {nextKode ? (
                  <Link
                    to={`/code/${nextKode}`}
                    className="flex-1 py-3 text-center font-editorial text-xs tracking-[0.2em] text-white/40 uppercase hover:text-[#cab170] transition"
                  >
                    Selanjutnya →
                  </Link>
                ) : (
                  <span className="flex-1" />
                )}
              </div>
            )}
          </div>
        </aside>

        <div className="relative">
          {ambientBlurSrc && (
            <div
              className="hidden lg:block fixed inset-0 z-0 pointer-events-none overflow-hidden lg:left-[380px] xl:left-[440px]"
            >
              <img
                src={ambientBlurSrc}
                alt=""
                aria-hidden
                className="w-full h-full object-cover blur-md opacity-30"
              />
              <div className="absolute inset-0 bg-black/70" />
            </div>
          )}

          {media.length > 0 ? (
            <div className="relative z-10">
              {/* Badge Video / jumlah foto — sinyal cepat sebelum user
                  lihat/klik apa pun, konsisten dengan badge di katalog
                  utama (yang sebelumnya TIDAK terbawa ke halaman detail). */}
              {(product.video || photoCount > 1) && (
                <div className="absolute top-4 left-4 z-20 flex flex-wrap gap-2 pointer-events-none">
                  {product.video && (
                    <span className="px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white/90 border border-white/30 bg-black/50 backdrop-blur uppercase">
                      &#9654; Video
                    </span>
                  )}
                  {photoCount > 1 && (
                    <span className="px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white/90 border border-white/30 bg-black/50 backdrop-blur uppercase">
                      {photoCount} Foto
                    </span>
                  )}
                </div>
              )}

              {/* Counter posisi mengambang — selalu terlihat di hero (bukan
                  cuma di dalam lightbox), supaya user tahu ada berapa
                  banyak slide sebelum buka lightbox/geser thumbnail. */}
              {media.length > 1 && (
                <div className="absolute top-4 right-4 z-20 px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white/70 bg-black/50 backdrop-blur pointer-events-none">
                  {activeIndex + 1} / {media.length}
                </div>
              )}

              {activeMedia.type === "video" ? (
                <video
                  key={activeMedia.src}
                  src={activeMedia.src}
                  poster={activeMedia.poster}
                  controls
                  autoPlay={false}
                  playsInline
                  className="w-full block bg-black"
                  style={{ maxHeight: "90vh" }}
                />
              ) : (
                <HeroImage
                  key={activeMedia.src}
                  src={activeMedia.src}
                  blurSrc={activeMedia.blurSrc}
                  alt={activeMedia.alt}
                  priority={activeIndex === 0}
                  onClick={() => setLightboxIndex(activeIndex)}
                />
              )}

              {/* Thumbnail strip — navigasi cepat lintas foto & video
                  tanpa perlu buka lightbox atau scroll panjang. */}
              {media.length > 1 && (
                <div className="flex gap-2 overflow-x-auto px-4 py-4 bg-black scrollbar-none">
                  {media.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      aria-label={m.type === "video" ? "Lihat video produk" : `Lihat foto ${i + 1}`}
                      aria-current={i === activeIndex}
                      className={
                        "relative flex-shrink-0 w-16 h-20 overflow-hidden border-2 transition " +
                        (i === activeIndex
                          ? "border-[#cab170]"
                          : "border-white/10 opacity-60 hover:opacity-100")
                      }
                    >
                      <img
                        src={m.type === "video" ? m.poster : cldUrl(m.src, { width: 150 })}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                      />
                      {m.type === "video" && (
                        <span className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <span className="text-white text-xs">&#9654;</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative z-10 flex items-center justify-center h-64 lg:h-screen">
              <p className="font-editorial text-white/20 text-base tracking-[0.3em]">
                FOTO BELUM TERSEDIA
              </p>
            </div>
          )}
        </div>
      </div>

      <PhotoLightbox
        media={media}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={navigateLightbox}
      />
    </main>
  );
}
