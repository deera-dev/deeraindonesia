import { useProduct, useProducts } from "@deera/shared/features/products/hooks";
import { cldUrl, cldVideoPoster } from "@deera/shared/lib/cloudinary";
import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { WhatsApp } from "../../../shared/components/WhatsApp";
import useDocumentMeta from "../../../shared/hooks/useDocumentMeta";
import { trackEvent } from "../../analytics";
import FavoriteButton from "../../favorites/components/FavoriteButton";
import { useFavorites } from "../../favorites/hooks";
import {
  useBaruSet,
  useLimitedStokSet,
  useSoldOutSet,
  useTerlarisMap,
} from "../../product-catalog/hooks";
import { countSeriWarna, TERLARIS_LABELS } from "../../product-catalog/utils";
import { buildProductSeo, getAdjacentKodes, shareProductViaWA } from "../utils";
import PhotoLightbox from "./PhotoLightbox";

function ShareIcon({ className = "" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

function HeroImage({ src, blurSrc, alt, priority, onClick, fit = "cover" }) {
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
        "w-full h-full block cursor-zoom-in transition-[filter] duration-500 ease-out lg:h-auto " +
        (fit === "contain" ? "object-contain bg-black " : "object-cover ") +
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
  const [selectedWarna, setSelectedWarna] = useState(null);

  useEffect(() => {
    setActiveIndex(0);
    setLightboxIndex(null);
    setSelectedWarna(null);
  }, [kode]);

  const viewedKode = product?.kode;
  useEffect(() => {
    if (viewedKode) trackEvent("view_product", { kode: viewedKode });
  }, [viewedKode]);

  useDocumentMeta(buildProductSeo(product));

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

  const warnaImages = product.warna_images ?? {};
  const hasWarnaImages = Object.keys(warnaImages).length > 0;
  const defaultWarna = product.warna?.[0] ?? null;
  const effectiveWarna = selectedWarna ?? defaultWarna;
  const isDefaultWarna = !hasWarnaImages || effectiveWarna === defaultWarna;
  const activeColorImage = isDefaultWarna ? product.image : warnaImages[effectiveWarna]?.image;
  const activeColorDetail = isDefaultWarna
    ? (product.detail ?? [])
    : (warnaImages[effectiveWarna]?.detail ?? []);
  const swatchWarnaList = hasWarnaImages
    ? (product.warna ?? []).filter((w) => w === defaultWarna || warnaImages[w]?.image)
    : [];

  const rawPhotoSources = hasWarnaImages
    ? [activeColorImage, ...activeColorDetail].filter(Boolean)
    : [product.image, product.seri_warna, ...(product.detail ?? [])].filter(Boolean);
  const photoCount = rawPhotoSources.length;
  const ambientBlurSrc = cldUrl(product.image, { width: 300 });
  const seriWarnaMediaIndex =
    !hasWarnaImages && product.seri_warna ? rawPhotoSources.indexOf(product.seri_warna) : -1;

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
  const seriWarnaCount = countSeriWarna(product);
  const waText = `Assalamu'alaikum, saya tertarik ambil grosir per seri produk ${product.kode} - ${product.nama}`;
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

  function openSeriWarna() {
    if (seriWarnaMediaIndex < 0) return;
    setActiveIndex(seriWarnaMediaIndex);
    setLightboxIndex(seriWarnaMediaIndex);
  }

  async function handleShare() {
    setSharing(true);
    trackEvent("share_product", { kode: product.kode });
    try {
      await shareProductViaWA(product);
    } finally {
      setSharing(false);
    }
  }

  return (
    <main className="h-dvh overflow-hidden bg-black text-white lg:h-auto lg:overflow-visible lg:min-h-screen">
      <div className="flex flex-col h-full lg:h-auto lg:grid lg:grid-cols-[380px_1fr] xl:grid-cols-[440px_1fr] lg:min-h-screen">
        <aside className="shrink-0 flex flex-col px-5 py-4 sm:px-8 sm:py-6 lg:shrink lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:px-12 lg:py-16 xl:px-16 border-b border-white/5 lg:border-b-0 lg:border-r lg:border-white/5">
          <Link
            to="/catalog"
            className="mb-3 lg:mb-10 self-start font-editorial text-xs lg:text-sm tracking-[0.3em] text-white/30 uppercase hover:text-white/60 transition py-1 lg:py-2"
          >
            ← Katalog
          </Link>

          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-headline text-[#cab170] text-3xl lg:text-5xl leading-none">
                {product.kode}
              </p>
              <p className="mt-2 lg:mt-4 font-script text-white/65 text-xl lg:text-3xl leading-tight">
                {product.nama}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={waUrl}
                onClick={() => trackEvent("click_wa", { kode: product.kode, place: "detail" })}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Tanya via WhatsApp"
                title="Tanya via WhatsApp"
                className="lg:hidden flex items-center justify-center w-9 h-9 border border-white/20 text-white/60 hover:border-[#cab170]/60 transition"
              >
                <WhatsApp className="w-4 h-4 text-green-400" />
              </a>
              <button
                type="button"
                disabled={sharing}
                onClick={handleShare}
                aria-label={sharing ? "Membagikan produk" : "Share Produk"}
                title="Share Produk"
                className="lg:hidden flex items-center justify-center w-9 h-9 border border-white/20 text-white/40 hover:border-[#cab170]/60 transition disabled:opacity-40"
              >
                {sharing ? (
                  <span
                    aria-hidden="true"
                    className="w-4 h-4 border-2 border-white/30 border-t-white/80 rounded-full animate-spin"
                  />
                ) : (
                  <ShareIcon className="w-4 h-4" />
                )}
              </button>
              <FavoriteButton
                size="lg"
                active={favoriteKodes.has(product.kode)}
                onToggle={() => toggleFavorite(product.kode)}
                className="flex-shrink-0 border border-white/15"
              />
            </div>
          </div>

          {(terlarisLabel || isBaru || isSoldOut || isLimitedStok) && (
            <div className="flex flex-wrap gap-2 mt-2 lg:mt-4">
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

          <div className="w-10 h-px mt-3 mb-3 lg:mt-6 lg:mb-6 bg-[#cab170]/25" />

          {product.bahan && (
            <p className="font-editorial text-white/35 text-sm lg:text-base tracking-[0.1em] mb-2 lg:mb-7">
              {product.bahan}
            </p>
          )}

          {variants.length > 0 && (
            <>
              <div className="mb-3 lg:hidden">
                <p className="font-editorial text-[10px] tracking-[0.3em] text-white/35 uppercase mb-2">
                  Ukuran
                </p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <span
                      key={v.size}
                      className="px-2.5 py-1.5 font-editorial text-[11px] text-white/80 border border-white/25 uppercase leading-tight whitespace-nowrap"
                    >
                      {v.size}
                      <span className="text-white/40 normal-case ml-1">
                        · LD{v.ld} PB{v.pb}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div className="hidden lg:block mb-8">
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
            </>
          )}

          {swatchWarnaList.length > 1 && (
            <div className="mb-4 lg:mb-8">
              <p className="font-editorial text-[10px] lg:text-sm tracking-[0.3em] text-white/35 uppercase mb-2 lg:mb-4">
                Warna — {effectiveWarna}
              </p>
              <div className="flex flex-wrap gap-2">
                {swatchWarnaList.map((w) => {
                  const thumbSrc = w === defaultWarna ? product.image : warnaImages[w]?.image;
                  const active = w === effectiveWarna;
                  return (
                    <button
                      key={w}
                      type="button"
                      onClick={() => {
                        setSelectedWarna(w);
                        setActiveIndex(0);
                      }}
                      aria-label={`Pilih warna ${w}`}
                      aria-current={active}
                      title={w}
                      className={
                        "relative w-12 h-12 lg:w-14 lg:h-14 overflow-hidden border-2 transition " +
                        (active
                          ? "border-[#cab170]"
                          : "border-white/15 opacity-70 hover:opacity-100")
                      }
                    >
                      {thumbSrc ? (
                        <img
                          src={cldUrl(thumbSrc, { width: 100 })}
                          alt={w}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="flex items-center justify-center w-full h-full font-editorial text-[9px] text-white/50 text-center px-0.5">
                          {w}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {!hasWarnaImages && product.seri_warna && (
            <div className="hidden lg:block mb-6">
              <p className="font-editorial text-sm tracking-[0.3em] text-white/35 uppercase mb-3">
                Seri Warna
              </p>
              <button
                type="button"
                onClick={openSeriWarna}
                className="block w-40 xl:w-48 aspect-[3/2] overflow-hidden border border-white/15 hover:border-[#cab170]/60 transition"
              >
                <img
                  src={cldUrl(product.seri_warna, { width: 400 })}
                  alt={`Seri warna ${product.nama}`}
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
            </div>
          )}

          <div className="mb-4 lg:mb-8 px-3 py-2.5 lg:p-4 border border-[#cab170]/25 bg-[#cab170]/[0.05]">
            <p className="font-editorial text-[10px] lg:text-xs tracking-[0.3em] text-[#cab170] uppercase">
              Khusus Grosir · Per Seri
            </p>
            <p className="mt-1 lg:mt-2 font-editorial text-xs lg:text-sm text-white/60 leading-relaxed">
              {seriWarnaCount > 1
                ? `1 seri berisi semua ${seriWarnaCount} warna. `
                : "Pembelian per seri. "}
              Mohon maaf, belum melayani pembelian satuan.
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <div className="hidden lg:flex lg:flex-col lg:gap-3">
              <a
                href={waUrl}
                onClick={() => trackEvent("click_wa", { kode: product.kode, place: "detail" })}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Tanya via WhatsApp"
                title="Tanya via WhatsApp"
                className="flex items-center justify-center gap-3 w-full py-4 font-editorial text-base tracking-[0.2em] uppercase border border-white/20 text-white/60 hover:border-[#cab170]/60 hover:text-[#cab170] transition"
              >
                <WhatsApp className="w-5 h-5 text-green-400 shrink-0" />
                <span>Tanya via WhatsApp</span>
              </a>
              <button
                type="button"
                disabled={sharing}
                onClick={handleShare}
                aria-label={sharing ? "Membagikan produk" : "Share Produk"}
                title="Share Produk"
                className="flex items-center justify-center gap-3 w-full py-4 font-editorial text-base tracking-[0.2em] uppercase border border-white/20 text-white/40 hover:border-[#cab170]/60 hover:text-[#cab170] transition disabled:opacity-40"
              >
                <span>{sharing ? "MEMBAGIKAN..." : "SHARE PRODUK"}</span>
              </button>
            </div>

            {(prevKode || nextKode) && (
              <div className="flex items-stretch gap-3 pt-2 mt-1 lg:pt-3 border-t border-white/5">
                {prevKode ? (
                  <Link
                    to={`/code/${prevKode}`}
                    className="flex-1 py-2 lg:py-3 text-center font-editorial text-xs tracking-[0.2em] text-white/40 uppercase hover:text-[#cab170] transition"
                  >
                    ← Sebelumnya
                  </Link>
                ) : (
                  <span className="flex-1" />
                )}
                {nextKode ? (
                  <Link
                    to={`/code/${nextKode}`}
                    className="flex-1 py-2 lg:py-3 text-center font-editorial text-xs tracking-[0.2em] text-white/40 uppercase hover:text-[#cab170] transition"
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

        <div className="relative flex-1 min-h-0 lg:flex-none lg:min-h-0">
          {ambientBlurSrc && (
            <div className="hidden lg:block fixed inset-0 z-0 pointer-events-none overflow-hidden lg:left-[380px] xl:left-[440px]">
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
            <div className="relative z-10 h-full flex flex-col lg:h-auto lg:block">
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

              {media.length > 1 && (
                <div className="absolute top-4 right-4 z-20 px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white/70 bg-black/50 backdrop-blur pointer-events-none">
                  {activeIndex + 1} / {media.length}
                </div>
              )}

              <div className="relative flex-1 min-h-0 lg:flex-none lg:min-h-0">
                {activeMedia.type === "video" ? (
                  <video
                    key={activeMedia.src}
                    src={activeMedia.src}
                    poster={activeMedia.poster}
                    controls
                    autoPlay={false}
                    playsInline
                    className="w-full h-full object-cover block bg-black lg:h-auto"
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
                    fit={activeIndex === seriWarnaMediaIndex ? "contain" : "cover"}
                  />
                )}
              </div>

              {media.length > 1 && (
                <div className="shrink-0 flex gap-1.5 lg:gap-2 overflow-x-auto px-3 py-2 lg:px-4 lg:py-4 bg-black scrollbar-none">
                  {media.map((m, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setActiveIndex(i)}
                      aria-label={m.type === "video" ? "Lihat video produk" : `Lihat foto ${i + 1}`}
                      aria-current={i === activeIndex}
                      className={
                        "relative flex-shrink-0 w-12 h-16 lg:w-16 lg:h-20 overflow-hidden border-2 transition " +
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
            <div className="relative z-10 flex items-center justify-center h-full lg:h-screen">
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
