/**
 * AdminBottomNav.jsx
 * Bottom navigation bar untuk semua halaman admin.
 * 6 item: Home, Produksi, Stok Opname, Transfer (+ badge), Buku Potongan, Riwayat
 */
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@deera/shared/lib/supabase";

function IconHome({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
      <path d="M9 21V12h6v9" />
    </svg>
  );
}
function IconProduksi({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="20" height="14" rx="1" />
      <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      <line x1="12" y1="12" x2="12" y2="16" />
      <line x1="10" y1="14" x2="14" y2="14" />
    </svg>
  );
}
function IconStok({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}
function IconTransfer({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 16V4m0 0L3 8m4-4l4 4" />
      <path d="M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  );
}
function IconBuku({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="8" y1="9" x2="16" y2="9" />
      <line x1="8" y1="13" x2="13" y2="13" />
    </svg>
  );
}
function IconRiwayat({ active }) {
  const c = active ? "#CAB170" : "currentColor";
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="12 8 12 12 14 14" />
      <path d="M3.05 11a9 9 0 1 1 .5 4" />
      <polyline points="3 16 3 11 8 11" />
    </svg>
  );
}

const NAV_ITEMS = [
  { to: "/admin",                exact: true,  label: "Home",      Icon: IconHome },
  { to: "/admin/produksi",       exact: false, label: "Produksi",  Icon: IconProduksi },
  { to: "/admin/stok-opname",    exact: false, label: "Stok",      Icon: IconStok },
  { to: "/admin/transfer",       exact: false, label: "Transfer",  Icon: IconTransfer, showBadge: true },
  { to: "/admin/buku-potongan",  exact: false, label: "Buku",      Icon: IconBuku },
  { to: "/admin/history",        exact: false, label: "Riwayat",   Icon: IconRiwayat },
];

export default function AdminBottomNav() {
  const { pathname } = useLocation();
  const [pending, setPending] = useState(0);

  useEffect(() => {
    supabase
      .from("transfers")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => setPending(count ?? 0));
  }, [pathname]); // re-check saat navigasi

  function isActive(to, exact) {
    if (exact) return pathname === to;
    return pathname === to || pathname.startsWith(to + "/");
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-skin-card border-t-2 border-skin-bdr safe-area-inset-bottom">
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
              <span className={`text-[9px] font-editorial tracking-[0.08em] uppercase leading-none ${
                active ? "text-[#CAB170]" : "text-skin-text4"
              }`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
