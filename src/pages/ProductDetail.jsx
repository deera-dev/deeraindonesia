import { Link, Navigate, useParams } from "react-router-dom";
import { WhatsApp } from "../svg/WhatsApp";
import { useProduct } from "../hooks/useProducts";
import { cldUrl } from "../lib/cloudinary";

export default function ProductDetail() {
  const { kode } = useParams();
  const { product, loading, error } = useProduct(kode);

  if (loading) {
    return (
      <main className="flex items-center justify-center w-full min-h-screen bg-black">
        <p className="font-editorial text-white/40 text-xs tracking-[0.3em]">LOADING...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center w-full min-h-screen bg-black px-7 text-center">
        <p className="font-editorial text-white/60 text-sm tracking-[0.25em]">GAGAL MEMUAT PRODUK</p>
        <p className="mt-3 font-editorial text-white/30 text-xs">{error.message}</p>
      </main>
    );
  }

  if (!product) return <Navigate to="/catalog" replace />;

  const mainSrc  = cldUrl(product.image,  { width: 1400 });
  const blurSrc  = cldUrl(product.image,  { width: 300 });
  const details  = (product.detail ?? []).map((u) => cldUrl(u, { width: 1400 }));
  const allPhotos = [mainSrc, ...details].filter(Boolean);
  const variants  = (product.variants ?? []);
  const waText   = `Assalamu'alaikum, saya tertarik dengan produk ${product.kode} - ${product.nama}`;
  const waUrl    = `https://wa.me/62811947254?text=${encodeURIComponent(waText)}`;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="md:grid md:grid-cols-[380px_1fr] md:min-h-screen">

        {/* ===== LEFT: INFO PANEL (sticky on desktop) ===== */}
        <aside className="md:sticky md:top-0 md:h-screen md:overflow-y-auto flex flex-col px-8 py-10 md:px-12 md:py-16 border-b border-white/5 md:border-b-0 md:border-r md:border-white/5">

          {/* Back */}
          <Link
            to="/catalog"
            className="mb-10 self-start font-editorial text-[10px] tracking-[0.3em] text-white/25 uppercase hover:text-white/50 transition"
          >
            &larr; Katalog
          </Link>

          {/* Kode */}
          <p className="font-headline text-[#cab170] text-4xl leading-none">
            {product.kode}
          </p>

          {/* Nama — font-script */}
          <p className="mt-3 font-script text-white/65 text-2xl leading-tight">
            {product.nama}
          </p>

          <div className="w-10 h-px mt-5 mb-5 bg-[#cab170]/25" />

          {/* Bahan */}
          {product.bahan && (
            <p className="font-editorial text-white/30 text-xs tracking-[0.15em] mb-6">
              {product.bahan}
            </p>
          )}

          {/* Variants */}
          {variants.length > 0 && (
            <div className="mb-8">
              <p className="font-editorial text-[10px] tracking-[0.3em] text-white/30 uppercase mb-3">
                Ukuran
              </p>
              <div className="flex flex-col divide-y divide-white/5">
                {variants.map((v) => (
                  <div key={v.size} className="flex items-center justify-between py-2.5">
                    <span className="font-editorial text-sm text-white/75">{v.size}</span>
                    <div className="flex gap-4">
                      <span className="font-editorial text-xs text-white/45">
                        <span className="text-white/25 text-[10px] tracking-[0.1em] mr-1">LD</span>
                        {v.ld} cm
                      </span>
                      <span className="font-editorial text-xs text-white/45">
                        <span className="text-white/25 text-[10px] tracking-[0.1em] mr-1">PB</span>
                        {v.pb} cm
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-auto">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full py-3 font-editorial text-xs tracking-[0.25em] uppercase border border-white/15 text-white/50 hover:border-[#cab170]/50 hover:text-[#cab170] transition"
            >
              <WhatsApp className="w-4 h-4 text-green-500" />
              Tanya via WhatsApp
            </a>
          </div>
        </aside>

        {/* ===== RIGHT: PHOTOS ===== */}
        <div className="relative">
          {/* Blurred background only on desktop */}
          {blurSrc && (
            <div className="hidden md:block fixed inset-0 z-0 pointer-events-none overflow-hidden" style={{left: "380px"}}>
              <img src={blurSrc} alt="" aria-hidden className="w-full h-full object-cover blur-md opacity-30" />
              <div className="absolute inset-0 bg-black/70" />
            </div>
          )}

          {allPhotos.length > 0 ? (
            <div className="relative z-10 flex flex-col">
              {allPhotos.map((src, idx) => (
                <img
                  key={idx}
                  src={src}
                  alt={idx === 0 ? product.nama : `${product.nama} ${idx + 1}`}
                  loading={idx === 0 ? "eager" : "lazy"}
                  fetchpriority={idx === 0 ? "high" : "auto"}
                  decoding="async"
                  className="w-full h-auto block"
                />
              ))}
            </div>
          ) : (
            <div className="relative z-10 flex items-center justify-center h-64 md:h-screen">
              <p className="font-editorial text-white/20 text-xs tracking-[0.3em]">FOTO BELUM TERSEDIA</p>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
