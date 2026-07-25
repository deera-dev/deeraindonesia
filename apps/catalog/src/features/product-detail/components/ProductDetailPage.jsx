import { useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { WhatsApp } from "../../../shared/components/WhatsApp";
import { useProduct, useProducts } from "@deera/shared/features/products/hooks";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { shareProductViaWA, getAdjacentKodes } from "../utils";
import PhotoLightbox from "./PhotoLightbox";
// Status ketersediaan (SOLD OUT / STOK TERBATAS) dipakai bersama katalog &
// halaman detail — import hooks.js (public surface) fitur lain, konsisten
// dengan Dependency Inversion di CLAUDE.md §4/§7.
import { useSoldOutSet, useLimitedStokSet } from "../../product-catalog/hooks";

export default function ProductDetail() {
  const { kode } = useParams();
  const { product, loading, error } = useProduct(kode);
  const { products } = useProducts();
  const soldOutSet = useSoldOutSet();
  const limitedStokSet = useLimitedStokSet();
  const [sharing, setSharing] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

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

  const mainSrc = cldUrl(product.image, { width: 1400 });
  const blurSrc = cldUrl(product.image, { width: 300 });
  const details = (product.detail ?? []).map((u) => cldUrl(u, { width: 1400 }));
  const allPhotos = [mainSrc, ...details].filter(Boolean);
  const variants = product.variants ?? [];
  const waText = `Assalamu'alaikum, saya tertarik dengan produk ${product.kode} - ${product.nama}`;
  const waUrl = `https://wa.me/62811947254?text=${encodeURIComponent(waText)}`;
  const { prevKode, nextKode } = getAdjacentKodes(products, kode);
  const isSoldOut = soldOutSet.has(product.kode);
  const isLimitedStok = !isSoldOut && limitedStokSet.has(product.kode);

  function navigateLightbox(delta) {
    setLightboxIndex((i) => {
      if (i === null) return i;
      const next = i + delta;
      if (next < 0 || next >= allPhotos.length) return i;
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

          <p className="font-headline text-[#cab170] text-5xl leading-none">{product.kode}</p>
          <p className="mt-4 font-script text-white/65 text-3xl leading-tight">{product.nama}</p>

          {isSoldOut && (
            <span className="inline-block self-start mt-4 px-3 py-1 font-editorial text-xs tracking-[0.2em] text-red-500/85 border border-red-500/40 uppercase">
              Sold Out
            </span>
          )}
          {isLimitedStok && (
            <span className="inline-block self-start mt-4 px-3 py-1 font-editorial text-xs tracking-[0.2em] text-[#cab170] border border-[#cab170]/40 uppercase">
              Stok Terbatas
            </span>
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
          {blurSrc && (
            <div
              className="hidden lg:block fixed inset-0 z-0 pointer-events-none overflow-hidden lg:left-[380px] xl:left-[440px]"
            >
              <img
                src={blurSrc}
                alt=""
                aria-hidden
                className="w-full h-full object-cover blur-md opacity-30"
              />
              <div className="absolute inset-0 bg-black/70" />
            </div>
          )}
          {allPhotos.length > 0 || product.video ? (
            <div className="relative z-10 flex flex-col">
              {allPhotos.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={idx === 0 ? product.nama : `${product.nama} ${idx + 1}`}
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchpriority={idx === 0 ? "high" : "auto"}
                  decoding="async"
                  onClick={() => setLightboxIndex(idx)}
                  className="w-full h-auto block cursor-zoom-in"
                />
              ))}
              {product.video && (
                <video
                  src={product.video}
                  controls
                  autoPlay={false}
                  playsInline
                  className="w-full block bg-black"
                  style={{ maxHeight: "90vh" }}
                />
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
        photos={allPhotos}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={navigateLightbox}
      />
    </main>
  );
}
