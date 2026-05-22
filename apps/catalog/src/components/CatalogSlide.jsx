import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { cldUrl } from "@deera/shared/lib/cloudinary";

// ── Sold-out stamp overlay ─────────────────────────────────────────────────
function SoldOutStamp() {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
      {/* Darkening veil */}
      <div className="absolute inset-0 bg-black/55" />
      {/* Stamp */}
      <div
        className="relative rotate-[-22deg] border-[3px] border-red-500/80 px-5 py-2 md:px-8 md:py-3"
        style={{
          boxShadow: "0 0 0 2px rgba(239,68,68,0.25)",
        }}
      >
        <p
          className="font-editorial tracking-[0.35em] text-red-500/90 text-2xl md:text-4xl uppercase leading-none select-none"
          style={{ textShadow: "0 0 24px rgba(239,68,68,0.4)" }}
        >
          SOLD OUT
        </p>
      </div>
    </div>
  );
}

export default function CatalogSlide({ model, isLast, soldOut = false }) {
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
      className="relative w-full h-screen snap-start bg-black overflow-hidden md:h-auto md:min-h-screen md:grid md:grid-cols-[1fr_2fr] md:items-center"
    >
      <div className="absolute inset-0 z-0 hidden overflow-hidden md:block">
        <img
          src={blurSrc}
          alt=""
          aria-hidden
          className="object-cover object-[50%_10%] w-full h-full blur-sm opacity-90"
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>

      {/* Desktop info */}
      <div
        className="relative z-10 hidden md:flex md:flex-col md:justify-end md:pb-24 md:pl-20 transition-opacity"
        style={{ opacity: soldOut ? 0.35 : 1 }}
      >
        <p className="font-headline text-[#cab170] text-[60px] leading-none">
          {model.kode}
        </p>
        <p className="mt-4 font-script text-white/65 text-3xl leading-tight">
          {model.nama}
        </p>
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

      <div className="relative z-10 w-full h-full md:flex md:items-center md:justify-center">
        <img
          src={heroSrc}
          alt={model.nama}
          loading={isFirst ? "eager" : "lazy"}
          fetchpriority={isFirst ? "high" : "auto"}
          decoding="async"
          sizes="100vw"
          className="absolute inset-0 w-full h-full object-cover md:static md:h-[90vh] md:w-auto md:object-contain transition-opacity duration-[800ms] ease-in-out"
          style={{
            opacity: soldOut ? 0.4 : active ? 1 : 0,
            filter: soldOut ? "grayscale(100%)" : "none",
          }}
        />
      </div>

      {/* Mobile overlay */}
      <div
        className="absolute bottom-0 left-0 z-10 w-full md:hidden transition-opacity"
        style={{ opacity: soldOut ? 0.35 : 1 }}
      >
        <div className="pt-48 pb-20 bg-gradient-to-t from-black via-black/60 to-transparent px-7">
          <p className="font-headline text-[#cab170] text-4xl leading-none">
            {model.kode}
          </p>
          <p className="mt-3 font-script text-white/60 text-2xl leading-tight">
            {model.nama}
          </p>
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

      {/* Sold-out stamp */}
      {soldOut && <SoldOutStamp />}

      {!isLast && (
        <div className="absolute z-10 -translate-x-1/2 bottom-6 left-1/2 md:hidden">
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
