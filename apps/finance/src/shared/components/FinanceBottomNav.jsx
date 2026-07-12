/**
 * FinanceBottomNav.jsx
 * Bottom navigation untuk semua halaman finance.
 * 6 item: Dashboard, Gajian, Kasbon, Petty Cash, Karyawan, Pengaturan
 */
import { Link, useLocation } from "react-router-dom";

function IconDashboard({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <circle cx="12" cy="15" r="2" />
    </svg>
  );
}

function IconKasbon({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <line x1="17" y1="11" x2="22" y2="11" />
      <line x1="17" y1="15" x2="22" y2="15" />
    </svg>
  );
}

function IconPettycash({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="6" width="20" height="13" rx="2" />
      <path d="M16 6V4a1 1 0 0 0-1-1H6a1 1 0 0 0-1 1v2" />
      <circle cx="15" cy="12.5" r="2" />
    </svg>
  );
}

function IconKaryawan({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconPengaturan({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: "/",           exact: true,  label: "Dashboard",  Icon: IconDashboard  },
  { to: "/gajian",     exact: false, label: "Gajian",     Icon: IconGajian     },
  { to: "/kasbon",     exact: false, label: "Kasbon",     Icon: IconKasbon     },
  { to: "/pettycash",  exact: false, label: "Petty",      Icon: IconPettycash  },
  { to: "/karyawan",   exact: false, label: "Karyawan",   Icon: IconKaryawan   },
  { to: "/pengaturan", exact: false, label: "Setelan",    Icon: IconPengaturan },
];

export default function FinanceBottomNav() {
  const { pathname } = useLocation();

  function isActive(to, exact) {
    if (exact) return pathname === to;
    return pathname === to || pathname.startsWith(to + "/");
  }

  return (
    // Redesign 2026-07: class "safe-area-inset-bottom" LAMA tidak pernah
    // terdefinisi di CSS manapun — diganti `pb-[env(safe-area-inset-bottom)]`
    // (arbitrary value Tailwind v3 yang valid). Lihat AdminBottomNav.jsx
    // untuk catatan lengkap.
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-skin-card border-t-2 border-skin-bdr pb-[env(safe-area-inset-bottom)]">
      <div className="flex h-14">
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
                className={`text-[8px] font-editorial tracking-[0.06em] uppercase leading-none ${
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
