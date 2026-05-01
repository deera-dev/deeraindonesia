import { useParams, Link, Navigate } from "react-router-dom";
import { useProduct } from "../hooks/useProducts";
import { cldUrl } from "../lib/cloudinary";

export default function ProductDetail() {
  const { kode } = useParams();
  const { product, loading, error } = useProduct(kode);

  // LOADING
  if (loading) {
    return (
      <main className="flex items-center justify-center w-full min-h-screen bg-black">
        <p className="font-editorial text-white/40 text-xs tracking-[0.3em]">
          LOADING…
        </p>
      </main>
    );
  }

  // ERROR
  if (error) {
    return (
      <main className="flex flex-col items-center justify-center w-full min-h-screen bg-black px-7 text-center">
        <p className="font-editorial text-white/80 text-sm tracking-[0.25em]">
          GAGAL MEMUAT PRODUK
        </p>
        <p className="mt-3 font-editorial text-white/40 text-xs tracking-[0.15em]">
          {error.message}
        </p>
      </main>
    );
  }

  // FALLBACK — UNKNOWN KODE
  if (!product) {
    return <Navigate to="/catalog" replace />;
  }

  // HANYA FOTO DETAIL (FOTO UTAMA SUDAH DI HALAMAN CATALOG)
  const images = product.detail ?? [];
  const totalPhotos = images.length;
  const hasPhotos = totalPhotos > 0;

  return (
    <>
      {/* ================= MAIN (NO SCROLL-SNAP → PINCH-ZOOM FRIENDLY) ================= */}
      <main className="w-full bg-black">
        {/* ============ EMPTY STATE (BELUM ADA FOTO DETAIL) ============ */}
        {!hasPhotos && (
          <section className="relative w-full h-screen bg-black flex flex-col items-center justify-center px-7 text-center">
            <p
              className="
                font-editorial
                text-white/80
                text-[24px]
                tracking-[0.25em]

                md:text-[44px]
                md:font-medium
                md:tracking-[0.3em]
              "
            >
              {product.kode}
            </p>

            <p
              className="
                mt-2
                font-editorial
                text-white/45
                text-xs
                tracking-[0.15em]

                md:mt-4
                md:text-base
                md:tracking-[0.22em]
              "
            >
              {product.nama}
            </p>

            <div className="w-16 h-px mt-6 bg-white/20 md:w-24 md:mt-10" />

            <p
              className="
                mt-8
                font-editorial
                text-white/40
                text-[11px]
                tracking-[0.3em]

                md:text-xs
              "
            >
              FOTO DETAIL BELUM TERSEDIA
            </p>
          </section>
        )}

        {hasPhotos &&
          images.map((src, idx) => {
            const isFirst = idx === 0;
            const heroSrc = cldUrl(src, { width: 2000 });
            const blurSrc = cldUrl(src, { width: 400 });

            return (
              <section
                key={idx}
                className="
                  relative
                  w-full
                  bg-black

                  md:min-h-screen
                  md:grid
                  md:grid-cols-[1fr_2fr]
                  md:items-center
                "
              >
                {/* ============ DESKTOP BLURRED BACKGROUND ============ */}
                <div className="absolute inset-0 z-0 hidden overflow-hidden md:block">
                  <img
                    src={blurSrc}
                    alt=""
                    aria-hidden
                    className="object-cover object-[50%_10%] w-full h-full blur-sm opacity-90"
                  />
                  <div className="absolute inset-0 bg-black/55" />
                </div>

                {/* ============ DESKTOP LEFT TEXT (FIRST IMAGE ONLY) ============ */}
                {isFirst ? (
                  <div className="relative z-10 hidden md:flex md:flex-col md:justify-end md:pb-24 md:pl-20">
                    <p
                      className="
                        font-editorial
                        text-white/80
                        text-[28px]

                        md:text-[44px]
                        md:font-medium

                        tracking-[0.3em]
                      "
                    >
                      {product.kode}
                    </p>

                    <p
                      className="
                        mt-4
                        font-editorial
                        text-white/50
                        text-sm

                        md:text-base
                        md:font-normal

                        tracking-[0.22em]
                      "
                    >
                      {product.nama}
                    </p>

                    <div className="w-24 h-px mt-10 bg-white/20" />
                  </div>
                ) : (
                  <div className="hidden md:block" />
                )}

                {/* ============ IMAGE (NATURAL ASPECT — TIDAK CROP) ============ */}
                <div className="relative z-10 w-full md:flex md:items-center md:justify-center md:py-8">
                  <img
                    src={heroSrc}
                    alt={`${product.nama} — ${idx + 1}`}
                    loading={isFirst ? "eager" : "lazy"}
                    fetchpriority={isFirst ? "high" : "auto"}
                    decoding="async"
                    sizes="(min-width: 768px) 66vw, 100vw"
                    className="
                      block
                      w-full
                      h-auto
                      select-none

                      md:w-auto
                      md:max-w-full
                      md:max-h-[90vh]
                      md:object-contain
                    "
                  />
                </div>

                {/* ============ MOBILE OVERLAY (KODE + NAMA, FIRST IMAGE ONLY) ============ */}
                {isFirst && (
                  <div className="absolute bottom-0 left-0 z-10 w-full md:hidden">
                    <div className="pt-24 pb-8 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-7">
                      <p
                        className="
                          font-editorial
                          text-white/85
                          text-[24px]
                          tracking-[0.25em]
                        "
                      >
                        {product.kode}
                      </p>

                      <p
                        className="
                          mt-2
                          font-editorial
                          text-white/50
                          text-xs
                          tracking-[0.15em]
                        "
                      >
                        {product.nama}
                      </p>
                    </div>
                  </div>
                )}

                {/* ============ PHOTO COUNTER (TOP-RIGHT) ============ */}
                {totalPhotos > 1 && (
                  <div
                    className="
                      absolute
                      top-4
                      right-4
                      z-20

                      px-2
                      py-1

                      font-editorial
                      text-[10px]
                      tracking-[0.25em]
                      text-white/75

                      bg-black/50
                      backdrop-blur
                      border
                      border-white/20

                      md:top-6
                      md:right-6
                    "
                  >
                    {String(idx + 1).padStart(2, "0")} /{" "}
                    {String(totalPhotos).padStart(2, "0")}
                  </div>
                )}
              </section>
            );
          })}
      </main>

      {/* ================= HOME BUTTON (FLOATING) ================= */}
      <Link
        to="/catalog"
        className="
          fixed
          bottom-6
          right-6
          z-50

          px-5
          py-2

          font-editorial
          text-xs
          tracking-[0.3em]
          text-white/90

          border
          border-white/30
          bg-black/40
          backdrop-blur

          hover:border-white
          transition
        "
      >
        Lihat Katalog Lain
      </Link>
    </>
  );
}
