import { NotifBell } from "../../features/notifikasi";
import { Link, useLocation } from "react-router-dom";
import { usePendingTransferCount } from "@deera/shared/features/transfers/hooks";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { useTheme } from "@deera/shared/features/theme/hooks";
import ThemeToggle from "@deera/shared/components/ThemeToggle";
import { useTotalUnreadCount } from "../../features/produksi-sampel/hooks";
import { NAV_ITEMS, formatBadgeCount, BADGE_COLOR } from "./AdminBottomNav";

export default function AdminSidebar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const pending = usePendingTransferCount();
  const { total: unreadDiskusi } = useTotalUnreadCount(user?.email);
  const { isDark, toggleTheme } = useTheme();
  const badges = { transfer: pending, produksi: unreadDiskusi };

  function isActive(to, exact) {
    if (exact) return pathname === to;
    return pathname === to || pathname.startsWith(to + "/");
  }

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 z-40 w-64 flex-col bg-skin-card border-r-2 border-skin-bdr">
      <div className="px-6 py-4 border-b-2 border-skin-bdr flex items-center justify-between">
        <h1 className="font-headline text-skin-accent-text text-2xl leading-none">DEERA</h1>
        <NotifBell />
      </div>

      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map(({ to, exact, label, Icon, badgeKey }) => {
          const active = isActive(to, exact);
          const count = badgeKey ? (badges[badgeKey] ?? 0) : 0;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 pl-5 pr-6 py-3 border-l-4 font-editorial text-sm tracking-[0.08em] uppercase transition ${
                active
                  ? "border-skin-accent bg-skin-accent/10 text-skin-accent-text"
                  : "border-transparent text-skin-text3 hover:text-skin-text hover:bg-skin-hover-gold"
              }`}
            >
              <div className="relative flex-shrink-0">
                <Icon active={active} />
                {count > 0 && (
                  <span
                    className={`absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-0.5 text-[9px] font-bold text-white rounded-full flex items-center justify-center leading-none ${BADGE_COLOR[badgeKey] ?? "bg-amber-400"}`}
                  >
                    {formatBadgeCount(count)}
                  </span>
                )}
              </div>
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t-2 border-skin-bdr">
        <span className="font-editorial text-xs tracking-[0.08em] uppercase text-skin-text3">
          {isDark ? "Mode Gelap" : "Mode Terang"}
        </span>
        <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
      </div>
    </aside>
  );
}
