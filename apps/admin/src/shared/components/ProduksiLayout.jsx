/**
 * ProduksiLayout.jsx
 * Shared layout untuk modul Produksi.
 * Sub-nav: Produksi > HPP > Bahan > Sampel > Laporan
 * Tab bar: flex-wrap (bukan overflow-x-auto), tidak ada x-scroll di halaman.
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
    // Catatan: overflow-x-hidden SENGAJA tidak dipakai di sini (band-aid yang
    // menyembunyikan sumber overflow asli, bukan memperbaikinya). Sub-nav di
    // bawah pakai flex-wrap (bukan overflow-x-auto) sehingga tidak pernah
    // butuh scroll horizontal — kalau 5 tab tidak muat dalam satu baris,
    // otomatis membungkus ke baris kedua.
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
          <div className="flex items-center gap-3 shrink-0">
            {headerAction}
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>

        {/*
          Sub-nav: flex-wrap → tiap tab flex-1 muat pas di layar; kalau
          kurang muat dalam satu baris, membungkus ke baris berikutnya
          (bukan minta pengguna geser horizontal).
        */}
        <div className="flex flex-wrap border-t border-skin-bdr-lt">
          {SUB_NAVS.map(({ to, label }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 min-w-[60px] py-2.5 text-center font-editorial text-[10px] tracking-[0.1em] uppercase transition border-b-2 ${
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
