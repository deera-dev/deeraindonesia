import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cldUrl } from "../lib/cloudinary";

export default function CatalogSlide({ model, isLast }) {
  const heroSrc = cldUrl(model.image, { width: 1200 });
  const blurSrc = cldUrl(model.image, { width: 400 });
  const ref = useRef(null);
  const isFirst = model.index === 0;
  const [active, setActive] = useState(isFirst);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setActive(entry.isIntersecting);
      },
      {
        threshold: 0.6,
        rootMargin: "-10% 0px -10% 0px",
      },
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="
        relative
        w-full
        h-screen
        snap-start
        bg-black
        overflow-hidden

        md:h-auto
        md:min-h-screen
        md:grid
        md:grid-cols-[1fr_2fr]
        md:items-center
      "
    >
      {/* ================= BLURRED BACKGROUND (DESKTOP ONLY) ================= */}
      <div className="absolute inset-0 z-0 hidden overflow-hidden md:block">
        <img
          src={blurSrc}
          alt=""
          aria-hidden
          className="object-cover object-[50%_10%] w-full h-full  blur-sm opacity-90"
        />
        <div className="absolute inset-0 bg-black/55" />
      </div>

      {/* ================= LEFT TEXT (DESKTOP EDITORIAL) ================= */}
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
          {model.kode}
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
          {model.nama}
        </p>

        <div className="w-24 h-px mt-10 bg-white/20" />
      </div>

      {/* ================= IMAGE (HERO) ================= */}
      <div className="relative z-10 w-full h-full md:flex md:items-center md:justify-center">
        <img
          src={heroSrc}
          alt={model.nama}
          loading={isFirst ? "eager" : "lazy"}
          fetchpriority={isFirst ? "high" : "auto"}
          decoding="async"
          sizes="100vw"
          className={`
            absolute inset-0
            w-full h-full
            object-cover

            md:static
            md:h-[90vh]
            md:w-auto
            md:object-contain

            transition-opacity
            duration-[800ms]
            ease-in-out
            ${active ? "opacity-100" : "opacity-0"}
          `}
        />
      </div>

      {/* ================= MOBILE OVERLAY ================= */}
      <div className="absolute bottom-0 left-0 z-10 w-full md:hidden">
        <div className="pt-40 pb-20 bg-gradient-to-t from-black/60 via-black/30 to-transparent px-7">
          <p
            className="
              font-editorial
              text-white/80
              text-[24px]
              tracking-[0.25em]
            "
          >
            {model.kode}
          </p>

          <p
            className="
              mt-2
              font-editorial
              text-white/45
              text-xs
              tracking-[0.15em]
            "
          >
            {model.nama}
          </p>
        </div>
      </div>

      {/* ================= SCROLL INDICATOR (MOBILE) ================= */}
      {!isLast && (
        <div className="absolute z-10 -translate-x-1/2 bottom-5 left-1/2 md:hidden">
          <div className="w-1 h-1 rounded-full bg-white/40 animate-pulse" />
        </div>
      )}

      {/* ================= CLICKABLE OVERLAY → DETAIL PAGE ================= */}
      <Link
        to={`/catalog/${model.kode}`}
        aria-label={`Lihat detail ${model.nama}`}
        className="absolute inset-0 z-20"
      />
    </section>
  );
}
