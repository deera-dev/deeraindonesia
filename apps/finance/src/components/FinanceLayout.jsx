/**
 * FinanceLayout.jsx
 * Shared layout wrapper untuk semua halaman finance.
 * Menyediakan header dengan title, optional headerAction, ThemeToggle,
 * dan FinanceBottomNav di bawah.
 */
import { useTheme } from "@deera/shared/hooks/useTheme";
import ThemeToggle from "@deera/shared/components/ThemeToggle";
import FinanceBottomNav from "./FinanceBottomNav";

export default function FinanceLayout({ children, title, subtitle, headerAction }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-skin-page text-skin-text pb-20">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-[#CAB170] text-xl leading-none md:text-2xl">
              FINANCE
            </h1>
            {title && (
              <p className="mt-0.5 font-editorial text-xs tracking-[0.15em] text-skin-text3 uppercase truncate">
                {subtitle ?? title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {headerAction}
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <div className="px-3 py-4 md:px-8 md:py-6">{children}</div>

      <FinanceBottomNav />
    </div>
  );
}
