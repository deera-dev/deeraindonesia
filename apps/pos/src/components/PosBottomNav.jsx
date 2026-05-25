/**
 * PosBottomNav.jsx
 * Fixed bottom navigation bar untuk POS — menggantikan tab di AppHeader.
 */

const TABS = [
  {
    key: "kasir",
    label: "Kasir",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M8 21h8M12 17v4" />
        <path d="M7 8h.01M12 8h.01M17 8h.01M7 12h.01M12 12h.01M17 12h.01" strokeWidth="2.2" />
      </svg>
    ),
  },
  {
    key: "laporan",
    label: "Laporan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    key: "pelanggan",
    label: "Pelanggan",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

export default function PosBottomNav({ tab, onTabChange }) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-skin-card border-t-2 border-skin-bdr flex">
      {TABS.map((t) => {
        const active = tab === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onTabChange(t.key)}
            className={`relative flex-1 flex flex-col items-center justify-center gap-1 py-2.5 transition ${
              active ? "text-[#CAB170]" : "text-skin-text3 hover:text-skin-text2"
            }`}
          >
            {t.icon}
            <span className="text-[10px] tracking-[0.1em] uppercase font-semibold leading-none">
              {t.label}
            </span>
            {active && (
              <span className="absolute bottom-0 w-8 h-0.5 bg-[#CAB170]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
