import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

/**
 * MenuButton — satu tombol hamburger yang menggabungkan Filter/Cari/Favorit
 * supaya jumlah tombol fixed di layar tidak menumpuk (lihat CLAUDE.md
 * catatan di CatalogPage.jsx). Dipakai sama untuk mobile, tablet, & desktop
 * lewat SATU pohon DOM (bukan dua versi terpisah) — tampilannya berubah
 * lewat class responsive Tailwind:
 *   - Mobile & tablet (<lg): panel penuh lebar dari atas layar, tinggi
 *     setengah halaman, tepi bawah bergelombang (SVG wave) supaya terasa
 *     lebih "premium" dibanding kotak dropdown biasa.
 *   - Desktop (>=lg): dropdown kecil standar menempel di bawah tombol.
 * Animasi dibuat singkat & simpel (lihat catalog-animations.css) — sengaja
 * TIDAK pakai library animasi tambahan supaya bundle tetap ringan untuk
 * pengguna publik/reseller yang mungkin akses dari koneksi mobile.
 */
export default function MenuButton({ hasActiveFilter, favoriteCount, onFilter, onSearch }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function handleFilter() {
    setOpen(false);
    onFilter();
  }

  function handleSearch() {
    setOpen(false);
    onSearch();
  }

  const hasIndicator = hasActiveFilter || favoriteCount > 0;

  return (
    <div className="fixed top-6 right-6 z-50 lg:relative lg:top-0 lg:right-0">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="relative w-11 h-11 flex items-center justify-center border border-white/30 bg-black/40 backdrop-blur text-white/90 hover:border-white active:scale-90 transition"
      >
        {/* Hamburger 3-garis morph jadi X saat terbuka — animasi CSS murni
            (rotate + translate + fade), tidak ada dependency tambahan. */}
        <span className="relative flex flex-col items-center justify-center w-5 h-5">
          <span
            className={
              "absolute block w-5 h-px bg-current transition-all duration-300 ease-out " +
              (open ? "rotate-45" : "-translate-y-[6px]")
            }
          />
          <span
            className={
              "absolute block w-5 h-px bg-current transition-all duration-200 ease-out " +
              (open ? "opacity-0 scale-x-0" : "opacity-100 scale-x-100")
            }
          />
          <span
            className={
              "absolute block w-5 h-px bg-current transition-all duration-300 ease-out " +
              (open ? "-rotate-45" : "translate-y-[6px]")
            }
          />
        </span>
        {hasIndicator && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#cab170]" />
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] animate-backdrop-in lg:bg-transparent lg:backdrop-blur-none"
            onClick={() => setOpen(false)}
          />

          <div
            className={
              "fixed top-0 left-0 z-50 w-full h-[48dvh] max-h-[420px] overflow-hidden bg-black animate-sheet-down " +
              "lg:absolute lg:top-full lg:left-auto lg:right-0 lg:mt-2 lg:w-52 lg:h-auto lg:max-h-none " +
              "lg:overflow-visible lg:border lg:border-white/15 lg:animate-dropdown-in"
            }
          >
            <div className="relative z-10 flex flex-col h-full pt-10 px-7 pb-10 lg:h-auto lg:pt-0 lg:px-0 lg:pb-0">
              <button
                onClick={handleFilter}
                className="animate-menu-item flex items-center justify-between py-4 font-editorial text-sm tracking-[0.25em] text-white/80 hover:text-white uppercase transition border-b border-white/10 lg:py-3.5 lg:px-4 lg:text-xs lg:hover:bg-white/5"
              >
                Filter
                {hasActiveFilter && <span className="w-2 h-2 rounded-full bg-[#cab170]" />}
              </button>
              <button
                onClick={handleSearch}
                className="animate-menu-item flex items-center justify-between py-4 font-editorial text-sm tracking-[0.25em] text-white/80 hover:text-white uppercase transition border-b border-white/10 lg:py-3.5 lg:px-4 lg:text-xs lg:hover:bg-white/5"
              >
                Cari
              </button>
              <Link
                to="/favorit"
                onClick={() => setOpen(false)}
                className="animate-menu-item flex items-center justify-between py-4 font-editorial text-sm tracking-[0.25em] text-white/80 hover:text-white uppercase transition lg:py-3.5 lg:px-4 lg:text-xs lg:hover:bg-white/5"
              >
                Favorit
                {favoriteCount > 0 && (
                  <span className="font-editorial text-[#cab170] text-sm lg:text-xs">{favoriteCount}</span>
                )}
              </Link>
            </div>

            {/* Tepi bawah bergelombang — hanya untuk panel mobile/tablet
                (h-[48dvh]); dropdown desktop tetap kotak biasa. */}
            <svg
              aria-hidden
              viewBox="0 0 1440 60"
              preserveAspectRatio="none"
              className="absolute bottom-0 left-0 w-full h-6 translate-y-[1px] lg:hidden"
            >
              <path
                fill="black"
                d="M0,20 C180,60 360,0 540,20 C720,40 900,0 1080,20 C1260,40 1350,10 1440,20 L1440,60 L0,60 Z"
              />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
