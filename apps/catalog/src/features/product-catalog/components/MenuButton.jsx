import { useState } from "react";
import { Link } from "react-router-dom";

/**
 * MenuButton — satu tombol hamburger (fixed top-right) yang membuka menu
 * kecil berisi Filter / Cari / Favorit. Menggantikan 3 tombol terpisah
 * (FILTER, CARI, FAVORIT) supaya tidak menumpuk di layar sempit dan tidak
 * saling menutup satu sama lain. Dipakai sama persis di mobile, tablet,
 * & desktop — tidak ada breakpoint khusus di sini.
 */
export default function MenuButton({ hasActiveFilter, favoriteCount, onFilter, onSearch }) {
  const [open, setOpen] = useState(false);

  function handleFilter() {
    setOpen(false);
    onFilter();
  }

  function handleSearch() {
    setOpen(false);
    onSearch();
  }

  return (
    <div className="fixed top-6 right-6 z-50">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        aria-expanded={open}
        className="relative w-11 h-11 flex items-center justify-center border border-white/30 bg-black/40 backdrop-blur text-white/90 hover:border-white transition"
      >
        <span className="flex flex-col gap-[5px]">
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
          <span className="block w-5 h-px bg-current" />
        </span>
        {(hasActiveFilter || favoriteCount > 0) && (
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#cab170]" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-48 z-50 bg-black border border-white/15 flex flex-col overflow-hidden">
            <button
              onClick={handleFilter}
              className="flex items-center justify-between px-4 py-3.5 font-editorial text-xs tracking-[0.25em] text-white/80 hover:bg-white/5 uppercase transition"
            >
              Filter
              {hasActiveFilter && <span className="w-2 h-2 rounded-full bg-[#cab170]" />}
            </button>
            <button
              onClick={handleSearch}
              className="flex items-center justify-between px-4 py-3.5 font-editorial text-xs tracking-[0.25em] text-white/80 hover:bg-white/5 uppercase transition border-t border-white/10"
            >
              Cari
            </button>
            <Link
              to="/favorit"
              onClick={() => setOpen(false)}
              className="flex items-center justify-between px-4 py-3.5 font-editorial text-xs tracking-[0.25em] text-white/80 hover:bg-white/5 uppercase transition border-t border-white/10"
            >
              Favorit
              {favoriteCount > 0 && (
                <span className="font-editorial text-[#cab170] text-xs">{favoriteCount}</span>
              )}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
