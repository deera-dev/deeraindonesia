import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { isBaru } from "../utils";
// Tombol favorit dipakai lintas-fitur (katalog & halaman detail) — import
// hooks.js/komponen publik fitur favorites, konsisten dengan pola
// product-detail yang sudah mengimpor hooks.js product-catalog.
import { useFavorites } from "../../favorites/hooks";
import FavoriteButton from "../../favorites/components/FavoriteButton";

// ── Sold-out stamp — compact, diletakkan di atas teks kode/nama ──────────────
function SoldOutStamp() {
  return (
    <div
      className="inline-block rotate-[-10deg] border-[2px] border-red-500/75 px-3 py-1 mb-3 pointer-events-none"
      style={{ boxShadow: "0 0 0 1px rgba(239,68,68,0.18)" }}
    >
      <p
        className="font-editorial tracking-[0.3em] text-red-500/85 text-lg uppercase leading-none select-none"
        style={{ textShadow: "0 0 12px rgba(239,68,68,0.3)" }}
      >
        SOLD OUT
      </p>
    </div>
  );
}

// ── Badge pojok kiri-atas: BARU / VIDEO / +N FOTO — memberi tahu reseller
//    kalau ada konten tambahan (video, foto detail) sebelum mereka tap ke
//    halaman detail, dan menandai produk yang baru ditambahkan. ─────────────
function CornerBadges({ baru, hasVideo, detailCount }) {
  if (!baru && !hasVideo && !detailCount) return null;
  return (
    <div className="absolute top-5 left-5 z-10 flex flex-wrap gap-2 sm:top-6 sm:left-6 lg:top-10 lg:left-10">
      {baru && (
        <span className="px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-black bg-[#cab170] uppercase">
          Baru
        </span>
      )}
      {hasVideo && (
        <span className="px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white/90 border border-white/30 bg-black/50 backdrop-blur uppercase">
          &#9654; Video
        </span>
      )}
      {detailCount > 0 && (
        <span className="px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white/90 border border-white/30 bg-black/50 backdrop-blur uppercase">
          +{detailCount} Foto
        </span>
      )}
    </div>
  );
}

export default function CatalogSlide({ model, isLast, soldOut = false, onActive, registerNode }) {
  const { favoriteKodes, toggle } = useFavorites();
  const heroSrc = cldUrl(model.image, { width: 1200 });
  const blurSrc = cldUrl(model.image, { width: 400 });
  const ref = useRef(null);
  const isFirst = model.index === 0;
  const [active, setActive] = useState(isFirst);
  const sizeNames = (model.variants ?? []).map((v) => v.size);
  const detailCount = (model.detail ?? []).length;
  const baru = isBaru(model.created_at);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting);
        if (entry.isIntersecting) onActive?.(model.kode);
      },
      {
        threshold: 0.6,
        rootMargin: "-10% 0px -10% 0px",
      },
    );
    /* v8 ignore next @preserve -- ref.current selalu terisi saat effect ini
       jalan (React commit ref sebelum effect); guard ini hanya defensif &
       tidak bisa dipicu lewat render normal, jadi cabang false-nya
       dikecualikan dari coverage. */
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [model.kode, onActive]);

  useEffect(() => {
    registerNode?.(model.kode, ref.current);
    return () => registerNode?.(model.kode, null);
  }, [model.kode, registerNode]);

  return (
    <section
      ref={ref}
      className="relative w-full h-dvh snap-start snap-always bg-black overflow-hidden lg:h-auto lg:min-h-dvh lg:grid lg:grid-cols-[1fr_2fr] lg:items-center"
    >
      <div className="absolute inset-0 z-0 hidden overflow-hidden lg:block">
        <img
          src={blurSrc}
          alt=""
          aria-hidden
          className="object-cover object-[50%_10%] w-full h-full blur-sm opacity-90"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      <CornerBadges baru={baru} hasVideo={!!model.video} detailCount={detailCount} />

      <FavoriteButton
        active={favoriteKodes.has(model.kode)}
        onToggle={() => toggle(model.kode)}
        className="absolute bottom-20 right-5 z-30 sm:bottom-64 sm:left-16 lg:top-1/3 lg:left-20 bg-black/40 backdrop-blur"
      />

      {/* Desktop info — hanya untuk layar lebar (laptop/desktop, >=1024px).
          Tablet (termasuk iPad portrait di 768-1024px) tetap pakai tampilan
          full-bleed + overlay di bawah supaya nyaman untuk browsing sentuh,
          bukan dipaksa ke layout dua-kolom yang didesain untuk mouse/lebar
          layar besar. */}
      <div className="relative z-10 hidden lg:flex lg:flex-col lg:justify-end lg:pb-24 lg:pl-20 transition-opacity">
        {soldOut && <SoldOutStamp />}
        <p className="font-headline text-[#cab170] text-[60px] leading-none">{model.kode}</p>
        <p className="mt-4 font-script text-white/65 text-3xl leading-tight">{model.nama}</p>
        <div className="w-16 h-px mt-7 bg-[#cab170]/40" />
        {sizeNames.length > 0 && (
          <div className="mt-5 flex flex-wrap gap-2">
            {sizeNames.map((s) => (
              <span
                key={s}
                className="px-3 py-1.5 font-editorial text-sm tracking-[0.15em] text-[#cab170]/80 border border-[#cab170]/35 uppercase"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="relative z-10 w-full h-full lg:flex lg:items-center lg:justify-center">
        <img
          src={heroSrc}
          alt={model.nama}
          loading={isFirst ? "eager" : "lazy"}
          fetchpriority={isFirst ? "high" : "auto"}
          decoding="async"
          sizes="100vw"
          className="absolute inset-0 w-full h-full object-cover lg:static lg:h-[90vh] lg:w-auto lg:object-contain transition-opacity duration-[800ms] ease-in-out"
          style={{
            opacity: active ? 1 : 0,
          }}
        />
      </div>

      {/* Overlay foto+teks — dipakai di HP & tablet (sampai <1024px).
          Padding & ukuran teks naik bertahap di sm/md supaya di tablet
          terasa proporsional, bukan seperti tampilan HP yang di-stretch. */}
      <div className="absolute bottom-0 left-0 z-10 w-full lg:hidden transition-opacity">
        <div className="pt-48 pb-20 bg-gradient-to-t from-black via-black/60 to-transparent px-7 sm:pt-56 sm:pb-24 sm:px-12 md:px-16">
          {soldOut && <SoldOutStamp />}
          <p className="font-headline text-[#cab170] text-4xl leading-none sm:text-5xl md:text-6xl">{model.kode}</p>
          <p className="mt-3 font-script text-white/60 text-2xl leading-tight sm:text-3xl">{model.nama}</p>
          {sizeNames.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {sizeNames.map((s) => (
                <span
                  key={s}
                  className="px-3 py-1.5 font-editorial text-sm tracking-[0.1em] text-[#cab170]/70 border border-[#cab170]/30 uppercase"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isLast && (
        <div className="absolute z-10 -translate-x-1/2 bottom-6 left-1/2 lg:hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-[#cab170]/50 animate-pulse" />
        </div>
      )}

      <Link
        to={`/code/${model.kode}`}
        aria-label={`Lihat detail ${model.nama}`}
        className="absolute inset-0 z-20"
      />
    </section>
  );
}
