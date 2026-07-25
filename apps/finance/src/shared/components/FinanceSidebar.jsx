/**
 * FinanceSidebar.jsx
 * Navigasi vertikal untuk tablet/desktop (md+).
 * Mobile tetap pakai FinanceBottomNav (nav ini "hidden md:flex" — tidak
 * pernah dirender di mobile). Item nav & ikon di-reuse dari
 * FinanceBottomNav.jsx (NAV_ITEMS) supaya tidak ada duplikasi definisi
 * menu di dua tempat.
 */
import { Link, useLocation } from "react-router-dom";
import { NAV_ITEMS } from "./FinanceBottomNav";

export default function FinanceSidebar() {
  const { pathname } = useLocation();

  function isActive(to, exact) {
    if (exact) return pathname === to;
    return pathname === to || pathname.startsWith(to + "/");
  }

  return (
    <aside className="hidden md:flex md:flex-col md:w-56 md:shrink-0 md:sticky md:top-0 md:h-screen bg-skin-card border-r-2 border-skin-bdr">
      <div className="px-6 py-6 border-b border-skin-bdr-lt">
        <h1 className="font-headline text-[#CAB170] text-2xl leading-none">FINANCE</h1>
        <p className="mt-1 font-editorial text-[10px] tracking-[0.2em] text-skin-text3 uppercase">
          Deera Indonesia
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {NAV_ITEMS.map(({ to, exact, label, Icon }) => {
          const active = isActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 mx-3 mb-1 px-3 py-2.5 rounded transition-colors ${
                active
                  ? "bg-skin-gold text-[#CAB170]"
                  : "text-skin-text2 hover:bg-skin-raised hover:text-skin-text"
              }`}
            >
              <Icon active={active} />
              <span className="font-editorial text-sm tracking-[0.02em]">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
