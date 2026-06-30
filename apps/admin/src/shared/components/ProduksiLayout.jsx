/**
 * ProduksiLayout.jsx
 * Shared layout untuk modul Produksi.
 * Sub-nav: Produksi > HPP > Bahan > Sampel > Laporan
 * Tab bar: touch-swipeable, scrollbar hidden (tidak ada x-scroll di halaman).
 */
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@deera/shared/features/theme/hooks";
import ThemeToggle from "@deera/shared/components/ThemeToggle";
import AdminBottomNav from "./AdminBottomNav";

const SUB_NAVS = [
  { to: "/produksi/record", label: "Produksi" },
  { to: "/produksi/hpp", label: "HPP" },
  { to: "/produksi/bahan", label: "Bahan" },
  { to: "/produksi/sampel", label: "Sampel" },
  { to: "/produksi/laporan", label: "Laporan" },
];

export default function ProduksiLayout({ children, title, headerAction }) {
  const { pathname } = useLocation();
  const { isDark, toggleTheme } = useTheme();

  return (
    /* overflow-x-hidden: cegah konten dalam sub-nav menyebabkan x-scroll halaman */
    <div className="min-h-screen bg-skin-page text-skin-text pb-20 overflow-x-hidden">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-[#CAB170] text-xl leading-none md:text-2xl">
              PRODUKSI
            </h1>
            {title && (
              <p className="mt-0.5 font-editorial text-xs tracking-[0.15em] text-skin-text3 uppercase truncate">
                {title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {headerAction}
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>

        {/*
          Sub-nav: scrollbar-none → scrollbar tidak kelihatan tapi bisa di-swipe.
          Tiap tab shrink-0 flex-1 → muat pas di layar; kalau kurang muat bisa
          geser dengan sentuhan tanpa scrollbar muncul (pola umum Instagram / YouTube).
        */}
        <div className="flex overflow-x-auto scrollbar-none border-t border-skin-bdr-lt">
          {SUB_NAVS.map(({ to, label }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`shrink-0 flex-1 min-w-[60px] py-2.5 text-center font-editorial text-[10px] tracking-[0.1em] uppercase transition border-b-2 ${
                  active
                    ? "border-[#CAB170] text-[#CAB170]"
                    : "border-transparent text-skin-text3 hover:text-skin-text"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="px-4 py-4 md:px-8 md:py-6">{children}</main>

      <AdminBottomNav />
    </div>
  );
}
