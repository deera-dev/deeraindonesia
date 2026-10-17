import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cldUrl } from "@deera/shared/lib/cloudinary";
import { TERLARIS_LABELS } from "../utils";
import { useFavorites } from "../../favorites/hooks";
import FavoriteButton from "../../favorites/components/FavoriteButton";

function SoldOutStamp({ className = "" }) {
  return (
    <div
      className={
        "absolute z-10 w-fit rotate-[-10deg] border-[2px] border-red-500/75 pl-2.5 pr-4 py-1 pointer-events-none whitespace-nowrap " +
        className
      }
      style={{ boxShadow: "0 0 0 1px rgba(239,68,68,0.18)" }}
    >
      <p
        className="font-editorial tracking-[0.12em] text-red-500/85 text-sm uppercase leading-none select-none"
        style={{ textShadow: "0 0 12px rgba(239,68,68,0.3)" }}
      >
        SOLD OUT
      </p>
    </div>
  );
}

function InfoBadges({ terlarisLabel, baru, limitedStok, hasVideo, detailCount }) {
  if (!terlarisLabel && !baru && !limitedStok && !hasVideo && !detailCount) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {terlarisLabel && (
        <span className="animate-chip-in px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white bg-gradient-to-r from-[#c2410c] to-[#ea580c] uppercase shadow-[0_0_10px_rgba(234,88,12,0.35)]">
          &#128293; {terlarisLabel}
        </span>
      )}
      {baru && (
        <span className="animate-chip-in px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-black bg-[#cab170] uppercase">
          Baru
        </span>
      )}
      {limitedStok && (
        <span className="animate-chip-in px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-red-400 border border-red-500/50 bg-black/50 backdrop-blur uppercase">
          Stok Terbatas
        </span>
      )}
      {hasVideo && (
        <span className="animate-chip-in px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white/90 border border-white/30 bg-black/50 backdrop-blur uppercase">
          &#9654; Video
        </span>
      )}
      {detailCount > 0 && (
        <span className="animate-chip-in px-2.5 py-1 font-editorial text-[10px] tracking-[0.2em] text-white/90 border border-white/30 bg-black/50 backdrop-blur uppercase">
          +{detailCount} Foto
        </span>
      )}
    </div>
  );
}

export default function CatalogSlide({
  model,
  isLast,
  soldOut = false,
  limitedStok = false,
  baru = false,
  terlarisPeriode = null,
  onActive,
  registerNode,
}) {
  const { favoriteKodes, toggle } = useFavorites();
  const heroSrc = cldUrl(model.image, { width: 1200 });
  const blurSrc = cldUrl(model.image, { width: 400 });
  const ref = useRef(null);
  const isFirst = model.index === 0;
  const [active, setActive] = useState(isFirst);
  const sizeNames = (model.variants ?? []).map((v) => v.size);
  const detailCount = (model.detail ?? []).length;
  const isFavorite = favoriteKodes.has(model.kode);
  const terlarisLabel = terlarisPeriode ? TERLARIS_LABELS[terlarisPeriode] : null;

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

      <Link
        to={`/code/${model.kode}`}
        aria-label={`Lihat detail ${model.nama}`}
        className="absolute inset-0 z-20"
      />

      <div
        className={
          "relative z-20 hidden lg:flex lg:flex-col lg:justify-end lg:pb-24 lg:pl-20 transition-opacity pointer-events-none " +
          (active ? "animate-fade-in-up" : "")
        }
      >
        <div className="flex items-center gap-3 mb-4">
          <InfoBadges
            terlarisLabel={terlarisLabel}
            baru={baru}
            limitedStok={limitedStok}
            hasVideo={!!model.video}
            detailCount={detailCount}
          />
          <FavoriteButton
            active={isFavorite}
            onToggle={() => toggle(model.kode)}
            className="ml-auto flex-shrink-0 pointer-events-auto border border-white/15 bg-black/30"
          />
        </div>
        <div className="relative w-fit">
          {soldOut && <SoldOutStamp className="-top-4 right-2" />}
          <p className="font-headline text-[#cab170] text-[60px] leading-none">{model.kode}</p>
        </div>
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
        {model.seri_warna && (
          <img
            src={cldUrl(model.seri_warna, { width: 700 })}
            alt={`Seri warna ${model.nama}`}
            loading="lazy"
            className="pointer-events-auto mt-6 w-72 xl:w-80 aspect-[3/2] object-cover border-2 border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.55)]"
          />
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

      <div
        className={
          "absolute bottom-0 left-0 z-20 w-full lg:hidden transition-opacity pointer-events-none " +
          (active ? "animate-fade-in-up" : "")
        }
      >
        <div className="pt-48 pb-20 bg-gradient-to-t from-black via-black/60 to-transparent px-7 sm:pt-56 sm:pb-24 sm:px-12 md:px-16">
          <div className="flex items-center gap-3 mb-4">
            <InfoBadges
              terlarisLabel={terlarisLabel}
              baru={baru}
              limitedStok={limitedStok}
              hasVideo={!!model.video}
              detailCount={detailCount}
            />
            <FavoriteButton
              active={isFavorite}
              onToggle={() => toggle(model.kode)}
              className="ml-auto flex-shrink-0 pointer-events-auto border border-white/15 bg-black/30"
            />
          </div>
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="relative w-fit">
                {soldOut && <SoldOutStamp className="-top-3 right-1 sm:-top-4 sm:right-2" />}
                <p className="font-headline text-[#cab170] text-4xl leading-none sm:text-5xl md:text-6xl">{model.kode}</p>
              </div>
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
            {model.seri_warna && (
              <img
                src={cldUrl(model.seri_warna, { width: 480 })}
                alt={`Seri warna ${model.nama}`}
                loading="lazy"
                className="flex-shrink-0 w-32 h-20 sm:w-40 sm:h-24 md:w-48 md:h-28 object-cover border-2 border-white/80 shadow-[0_4px_20px_rgba(0,0,0,0.55)]"
              />
            )}
          </div>
        </div>
      </div>

      {!isLast && (
        <div className="absolute z-10 -translate-x-1/2 bottom-6 left-1/2 lg:hidden">
          <div className="w-1.5 h-1.5 rounded-full bg-[#cab170]/50 animate-pulse" />
        </div>
      )}
    </section>
  );
}
