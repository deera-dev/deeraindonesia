import ThemeToggle from "@deera/shared/components/ThemeToggle";
import { useTheme } from "@deera/shared/features/theme/hooks";
import { Link } from "react-router-dom";

export default function LainnyaSheet({ items, isActive, onClose, badges = {} }) {
  const { isDark, toggleTheme } = useTheme();

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:hidden">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full bg-skin-card border-t-2 border-skin-bdr shadow-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt">
          <h2 className="font-editorial text-sm tracking-[0.18em] uppercase text-skin-text2">
            Lainnya
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="text-skin-text3 hover:text-skin-text text-xl leading-none transition"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 p-4">
          {items.map(({ to, exact, label, Icon, badgeKey }) => {
            const active = isActive(to, exact);
            const count = badgeKey ? (badges[badgeKey] ?? 0) : 0;
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 border transition ${
                  active
                    ? "text-skin-accent-text border-skin-accent"
                    : "text-skin-text3 border-skin-bdr-lt hover:text-skin-text"
                }`}
              >
                <div className="relative">
                  <Icon active={active} />
                  {count > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-sky-500 text-white text-[9px] font-bold flex items-center justify-center">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </div>
                <span className="text-[9px] font-editorial tracking-[0.08em] uppercase leading-none text-center">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 pb-4">
          <span className="font-editorial text-xs tracking-[0.08em] uppercase text-skin-text3">
            {isDark ? "Mode Gelap" : "Mode Terang"}
          </span>
          <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
        </div>
      </div>
    </div>
  );
}
