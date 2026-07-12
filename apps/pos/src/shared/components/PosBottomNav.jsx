/**
 * PosBottomNav.jsx
 * Fixed bottom navigation bar untuk POS.
 * Menggunakan NavLink dari React Router -- active state otomatis dari URL.
 */
import { NavLink } from "react-router-dom";

const TABS = [
  {
    to: "/",
    end: true,
    label: "Kasir",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M7 8h.01M12 8h.01M17 8h.01M7 12h.01M12 12h.01M17 12h.01" strokeWidth="2.2" />
      </svg>
    ),
  },
  {
    to: "/laporan",
    end: false,
    label: "Laporan",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    to: "/pelanggan",
    end: false,
    label: "Pelanggan",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: "/riwayat",
    end: false,
    label: "Riwayat",
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-6 h-6"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
];

export default function PosBottomNav() {
  return (
    // Redesign 2026-07: PosBottomNav SEBELUMNYA tidak punya penanganan
    // safe-area sama sekali (beda dari Admin/Finance) — ditambahkan supaya
    // konsisten di 3 app dan aman di iPhone dengan home indicator.
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-skin-card border-t-2 border-skin-bdr pb-[env(safe-area-inset-bottom)] flex">
      {TABS.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            `relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition ${
              isActive ? "text-[#CAB170]" : "text-skin-text3 hover:text-skin-text2"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {t.icon}
              <span className="text-[10px] tracking-[0.1em] uppercase font-semibold leading-none">
                {t.label}
              </span>
              {isActive && <span className="absolute bottom-0 w-8 h-0.5 bg-[#CAB170]" />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
