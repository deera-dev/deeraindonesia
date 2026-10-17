import { useTheme } from "@deera/shared/features/theme/hooks";
import ThemeToggle from "@deera/shared/components/ThemeToggle";
import BackToTop from "@deera/shared/components/BackToTop";
import FinanceBottomNav from "./FinanceBottomNav";
import FinanceSidebar from "./FinanceSidebar";

export default function FinanceLayout({ children, title, subtitle, headerAction }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-0 md:flex">
      <FinanceSidebar />

      <div className="md:flex-1 md:min-w-0">
        <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
          <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
            <div className="min-w-0">
              <h1 className="font-headline text-skin-accent-text text-xl leading-none md:text-2xl md:hidden">
                FINANCE
              </h1>
              {title && (
                <p className="mt-0.5 font-editorial text-xs tracking-[0.15em] text-skin-text3 uppercase truncate md:mt-0 md:text-sm">
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

        <div className="px-3 py-4 md:px-8 md:py-6 xl:px-10 2xl:px-12">{children}</div>
      </div>

      <BackToTop />
      <FinanceBottomNav />
    </div>
  );
}
