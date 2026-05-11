import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cldUrl } from "../lib/cloudinary";

export default function CatalogSlide({ model, isLast }) {
  const heroSrc = cldUrl(model.image, { width: 1200 });
  const blurSrc = cldUrl(model.image, { width: 400 });
  const ref = useRef(null);
  const isFirst = model.index === 0;
  const [active, setActive] = useState(isFirst);

  const sizeNames = (model.variants ?? []).map((v) => v.size);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { threshold: 0.6, rootMargin: "-10% 0px -10% 0px" },
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      className="
        relative w-full h-screen snap-start bg-black overflow-hidden
        md:h-auto md:min-h-screen md:grid md:grid-cols-[1fr_2fr] md:items-center
      "
    >
      {/* BLURRED BG (DESKTOP) */}
      <div className="absolute inset-0 z-0 hidden overflow-hidden md:block">
        <img
          src={blurSrc}
          alt=""
          aria-hidden
          className="object-cover object-[50%_10%] w-full h-full blur-sm opacity-90"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* LEFT TEXT (DESKTOP) */}
      <div className="relative z-10 hidden md:flex md:flex-col md:justify-end md:pb-24 md:pl-20">
        <p className="font-headline text-[#cab170] text-[52px] leading-none">
          {model.kode}
        </p>
        <p className="mt-3 font-script text-white/60 text-2xl leading-tight">
          {model.nama}
        </p>
        <div className="w-16 h-px mt-6 bg-[#cab170]/40" />
        {sizeNames.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {sizeNames.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 font-editorial text-[9px] tracking-[0.2em] text-[#cab170]/70 border border-[#cab170]/30 uppercase"
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* IMAGE */}
      <div className="relative z-10 w-full h-full md:flex md:items-center md:justify-center">
        <img
          src={heroSrc}
          alt={model.nama}
          loading={isFirst ? "eager" : "lazy"}
          fetchpriority={isFirst ? "high" : "auto"}
          decoding="async"
          sizes="100vw"
          className={`
            absolute inset-0 w-full h-full object-cover
            md:static md:h-[90vh] md:w-auto md:object-contain
            transition-opacity duration-[800ms] ease-in-out
            ${active ? "opacity-100" : "opacity-0"}
          `}
        />
      </div>

      {/* MOBILE OVERLAY */}
      <div className="absolute bottom-0 left-0 z-10 w-full md:hidden">
        <div className="pt-40 pb-16 bg-gradient-to-t from-black via-black/50 to-transparent px-7">
          <p className="font-headline text-[#cab170] text-[30px] leading-none">
            {model.kode}
          </p>
          <p className="mt-2 font-script text-white/55 text-xl leading-tight">
            {model.nama}
          </p>
          {sizeNames.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {sizeNames.map((s) => (
                <span
                  key={s}
                  className="px-2 py-0.5 font-editorial text-[8px] tracking-[0.15em] text-[#cab170]/65 border border-[#cab170]/25 uppercase"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SCROLL DOT (MOBILE) */}
      {!isLast && (
        <div className="absolute z-10 -translate-x-1/2 bottom-5 left-1/2 md:hidden">
          <div className="w-1 h-1 rounded-full bg-[#cab170]/40 animate-pulse" />
        </div>
      )}

      {/* LINK TO DETAIL */}
      <Link
        to={`/code/${model.kode}`}
        aria-label={`Lihat detail ${model.nama}`}
        className="absolute inset-0 z-20"
      />
    </section>
  );
}
