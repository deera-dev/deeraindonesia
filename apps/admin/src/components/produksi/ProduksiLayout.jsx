/**
 * ProduksiLayout.jsx
 * Shared layout wrapper untuk semua halaman modul Produksi.
 * Berisi header dengan sub-navigasi: Bahan, Produksi, HPP, Laporan.
 */
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@deera/shared/hooks/useTheme";
import ThemeToggle from "@deera/shared/components/ThemeToggle";
import AdminBottomNav from "../AdminBottomNav";

const SUB_NAVS = [
  { to: "/produksi/bahan", label: "Bahan" },
  { to: "/produksi/record", label: "Produksi" },
  { to: "/produksi/hpp", label: "HPP" },
  { to: "/produksi/laporan", label: "Laporan" },
];

export default function ProduksiLayout({ children, title }) {
  const { pathname } = useLocation();
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-skin-page text-skin-text pb-20">
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
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>

        {/* Sub-navigasi */}
        <div className="flex border-t border-skin-bdr-lt overflow-x-auto">
          {SUB_NAVS.map(({ to, label }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 min-w-[80px] py-3 text-center font-editorial text-xs tracking-[0.18em] uppercase transition border-b-2 ${
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
      <div className="px-3 py-4 md:px-8 md:py-6">{children}</div>

      <AdminBottomNav />
    </div>
  );
}
