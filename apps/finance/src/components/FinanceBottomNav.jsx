/**
 * FinanceBottomNav.jsx
 * Bottom navigation untuk semua halaman finance.
 * 5 item: Dashboard, Gajian, Kas, Kasbon, Karyawan
 */
import { Link, useLocation } from "react-router-dom";

function IconDashboard({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function IconGajian({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="12" cy="15" r="2" />
    </svg>
  );
}

function IconKas({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 1 0 0 7h5a3.5 3.5 0 1 1 0 7H6" />
    </svg>
  );
}

function IconKasbon({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <line x1="17" y1="11" x2="22" y2="11" />
      <line x1="17" y1="15" x2="22" y2="15" />
    </svg>
  );
}

function IconKaryawan({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: "/",         exact: true,  label: "Dashboard", Icon: IconDashboard },
  { to: "/gajian",   exact: false, label: "Gajian",    Icon: IconGajian    },
  { to: "/kas",      exact: false, label: "Kas",       Icon: IconKas       },
  { to: "/kasbon",   exact: false, label: "Kasbon",    Icon: IconKasbon    },
  { to: "/karyawan", exact: false, label: "Karyawan",  Icon: IconKaryawan  },
];

export default function FinanceBottomNav() {
  const { pathname } = useLocation();

  function isActive(to, exact) {
    if (exact) return pathname === to;
    return pathname === to || pathname.startsWith(to + "/");
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-skin-card border-t-2 border-skin-bdr safe-area-inset-bottom">
      <div className="flex h-16">
        {NAV_ITEMS.map(({ to, exact, label, Icon }) => {
          const active = isActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? "text-[#CAB170]" : "text-skin-text3 hover:text-skin-text"
              }`}
            >
              <Icon active={active} />
              <span
                className={`text-[9px] font-editorial tracking-[0.08em] uppercase leading-none ${
                  active ? "text-[#CAB170]" : "text-skin-text4"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
