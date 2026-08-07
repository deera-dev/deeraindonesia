/**
 * AdminBottomNav.jsx
 * Bottom navigation bar untuk semua halaman admin.
 * 7 item: Home, Produksi, Stok Opname, Transfer (+ badge), Buku Potongan,
 * Analytics, Riwayat
 */
import { Link, useLocation } from "react-router-dom";
import { usePendingTransferCount } from "@deera/shared/features/transfers/hooks";

export function IconHome({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}
export function IconProduksi({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="7" width="20" height="14" rx="1" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  );
}
export function IconStok({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
export function IconTransfer({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}
export function IconBuku({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="13" y2="13" />
    </svg>
  );
}
export function IconAnalytics({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="4" y1="20" x2="20" y2="20" />
      <rect x="6" y="12" width="3" height="8" />
      <rect x="12.5" y="7" width="3" height="13" />
      <rect x="19" y="4" width="3" height="16" transform="translate(-2 0)" />
    </svg>
  );
}
export function IconRiwayat({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="12 8 12 12 14 14" />
      <path d="M3.05 11a9 9 0 1 1 .5 4" />
      <polyline points="3 16 3 11 8 11" />
    </svg>
  );
}
export function IconPelanggan({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke={c}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-1a8 8 0 0 1 16 0v1" />
    </svg>
  );
}

export const NAV_ITEMS = [
  { to: "/", exact: true, label: "Home", Icon: IconHome },
  { to: "/produksi", exact: false, label: "Produksi", Icon: IconProduksi },
  { to: "/stok-opname", exact: false, label: "Stok", Icon: IconStok },
  { to: "/transfer", exact: false, label: "Transfer", Icon: IconTransfer, showBadge: true },
  { to: "/buku-potongan", exact: false, label: "Buku", Icon: IconBuku },
  { to: "/pelanggan", exact: false, label: "Pelanggan", Icon: IconPelanggan },
  { to: "/analytics", exact: false, label: "Analytics", Icon: IconAnalytics },
  { to: "/history", exact: false, label: "Riwayat", Icon: IconRiwayat },
];

export default function AdminBottomNav() {
  const { pathname } = useLocation();
  const pending = usePendingTransferCount();

  function isActive(to, exact) {
    if (exact) return pathname === to;
    return pathname === to || pathname.startsWith(to + "/");
  }

  return (
    // Redesign 2026-07: class "safe-area-inset-bottom" LAMA tidak
    // pernah terdefinisi di CSS manapun (bukan utility Tailwind bawaan,
    // tidak ada @layer custom) — jadi TIDAK PERNAH benar-benar
    // menambahkan inset apa pun. Diganti `pb-[env(safe-area-inset-bottom)]`
    // (arbitrary value Tailwind v3 yang valid) supaya iPhone dengan home
    // indicator/notch benar-benar mendapat padding bawah yang sesuai.
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-skin-card border-t-2 border-skin-bdr pb-[env(safe-area-inset-bottom)] md:hidden">
      <div className="flex h-16">
        {NAV_ITEMS.map(({ to, exact, label, Icon, showBadge }) => {
          const active = isActive(to, exact);
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                active ? "text-[#CAB170]" : "text-skin-text3 hover:text-skin-text"
              }`}
            >
              <div className="relative">
                <Icon active={active} />
                {showBadge && pending > 0 && (
                  <span className="absolute -top-1 -right-1.5 min-w-[15px] h-[15px] px-0.5 text-[9px] font-bold bg-amber-400 text-white rounded-full flex items-center justify-center leading-none">
                    {pending}
                  </span>
                )}
              </div>
              <span
                className={`text-[9px] font-editorial tracking-[0.08em] uppercase leading-none ${
                  active ? "text-[#CAB170]" : "text-skin-text3"
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
