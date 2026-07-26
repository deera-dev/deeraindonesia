import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

// ── Ikon inline (bukan library eksternal) — garis tipis (strokeWidth 1.5),
//    konsisten sama seperti estetika editorial situs (tipis, elegan, bukan
//    ikon solid/tebal). Sengaja tidak pakai lucide-react dkk supaya bundle
//    tetap ringan untuk pengguna publik/reseller di koneksi mobile. ───────
function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="w-[18px] h-[18px]">
      <path d="M4 6h16M8 12h8M11 18h2" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" className="w-[18px] h-[18px]">
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="M19.5 19.5l-4.3-4.3" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <path d="M12 3.5l2.47 5.18 5.53.55-4.13 3.86 1.14 5.55L12 15.9l-4.99 2.74 1.14-5.55-4.13-3.86 5.53-.55z" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" className="w-[18px] h-[18px]">
      <path d="M12 21s7-7.1 7-12a7 7 0 10-14 0c0 4.9 7 12 7 12z" />
      <circle cx="12" cy="9" r="2.3" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="w-4 h-4">
      <path d="M5 5l14 14M19 5L5 19" />
    </svg>
  );
}

/**
 * MenuButton — satu tombol hamburger yang menggabungkan Filter/Cari/Favorit
 * + Visit Us supaya jumlah tombol fixed di layar tidak menumpuk. Dipakai
 * sama untuk mobile, tablet, & desktop lewat SATU pohon DOM (bukan dua
 * versi terpisah) — tampilannya berubah lewat class responsive Tailwind:
 *   - Mobile & tablet (<lg): panel penuh lebar dari atas layar, tinggi
 *     setengah halaman, tepi bawah bergelombang (SVG wave).
 *   - Desktop (>=lg): dropdown kecil standar menempel di bawah tombol.
 * Wrapper LUAR wajib tetap "fixed" di semua breakpoint (jangan diganti ke
 * "lg:relative" — pernah bikin tombol ini "hilang" di desktop/tablet
 * karena kembali ikut alur dokumen normal & terdorong ke bawah <main>
 * yang tingginya 100dvh per slide). "fixed" juga sudah cukup jadi
 * containing block untuk dropdown "lg:absolute" di bawahnya, jadi tidak
 * perlu "position: relative" tambahan di wrapper ini.
 */
export default function MenuButton({
  hasActiveFilter,
  favoriteCount,
  onFilter,
  onSearch,
  onVisitUs,
}) {
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

  function handleVisitUs() {
    setOpen(false);
    onVisitUs();
  }

  const hasIndicator = hasActiveFilter || favoriteCount > 0;

  const itemCls =
    "animate-menu-item group relative flex items-center gap-4 py-4 pl-1 pr-2 font-editorial text-sm tracking-[0.22em] text-white/75 hover:text-[#cab170] uppercase transition-colors " +
    "lg:gap-3 lg:py-3 lg:pl-3 lg:pr-3 lg:text-[11px] lg:tracking-[0.18em]";

  return (
    <div className="fixed top-6 right-6 z-50">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="relative w-11 h-11 flex items-center justify-center border border-white/30 bg-black/40 backdrop-blur text-white/90 hover:border-[#cab170]/70 active:scale-90 transition"
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
              "fixed top-0 left-0 z-50 w-full h-[52dvh] max-h-[440px] overflow-hidden bg-gradient-to-b from-[#0c0a06] via-black to-black animate-sheet-down " +
              "lg:absolute lg:top-full lg:left-auto lg:right-0 lg:mt-2 lg:w-64 lg:h-auto lg:max-h-none " +
              "lg:overflow-visible lg:border lg:border-[#cab170]/20 lg:bg-black lg:animate-dropdown-in"
            }
          >
            {/* Header: wordmark + tombol tutup — sebelumnya panel ini TIDAK
                punya cara eksplisit untuk ditutup selain tap backdrop/Esc,
                yang kurang jelas di mobile (tidak ada affordance visual). */}
            <div className="relative z-10 flex items-center justify-between px-7 pt-8 pb-4 border-b border-[#cab170]/15 lg:px-4 lg:pt-3.5 lg:pb-3">
              <div className="flex items-center gap-2.5">
                <img src="/logo-mark.png" alt="" aria-hidden className="h-9 w-auto lg:h-6" />
                <img src="/wordmark.png" alt="Deera" className="h-4 w-auto lg:h-3" />
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup menu"
                className="w-8 h-8 flex items-center justify-center text-white/50 hover:text-white transition"
              >
                <CloseIcon />
              </button>
            </div>

            <nav className="relative z-10 flex flex-col px-7 lg:px-2 lg:py-1">
              <button onClick={handleFilter} className={itemCls + " border-b border-white/5"}>
                <span className="text-white/40 group-hover:text-[#cab170] transition-colors">
                  <FilterIcon />
                </span>
                Filter
                {hasActiveFilter && <span className="w-1.5 h-1.5 rounded-full bg-[#cab170] ml-auto" />}
              </button>
              <button onClick={handleSearch} className={itemCls + " border-b border-white/5"}>
                <span className="text-white/40 group-hover:text-[#cab170] transition-colors">
                  <SearchIcon />
                </span>
                Cari
              </button>
              <Link to="/favorit" onClick={() => setOpen(false)} className={itemCls + " border-b border-white/5"}>
                <span className="text-white/40 group-hover:text-[#cab170] transition-colors">
                  <StarIcon />
                </span>
                Favorit
                {favoriteCount > 0 && (
                  <span className="ml-auto font-editorial text-[#cab170] text-sm lg:text-[11px]">{favoriteCount}</span>
                )}
              </Link>
              <button onClick={handleVisitUs} className={itemCls}>
                <span className="text-white/40 group-hover:text-[#cab170] transition-colors">
                  <PinIcon />
                </span>
                Visit Us
              </button>
            </nav>

            {/* Tepi bawah bergelombang — hanya untuk panel mobile/tablet
                (h-[52dvh]); dropdown desktop tetap kotak biasa. */}
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
