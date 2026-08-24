/**
 * LainnyaSheet.jsx
 * Bottom sheet full-screen (mobile) berisi grid ikon untuk item nav yang
 * tidak muat di AdminBottomNav utama (permintaan Denny 2026-08 — "menunya
 * udah kebanyakan"). Dipanggil dari AdminBottomNav.jsx, menerima daftar
 * item sisa (`items`, subset dari NAV_ITEMS) + helper `isActive` dari
 * parent supaya logic active-route tidak duplikasi.
 */
import { Link } from "react-router-dom";

export default function LainnyaSheet({ items, isActive, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm md:hidden">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative w-full bg-skin-card border-t-2 border-skin-bdr shadow-xl pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt">
          <h2 className="font-editorial text-sm tracking-[0.18em] uppercase text-skin-text2">Lainnya</h2>
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
          {items.map(({ to, exact, label, Icon }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className={`flex flex-col items-center justify-center gap-1.5 py-3 border transition ${
                  active
                    ? "text-[#CAB170] border-[#CAB170]"
                    : "text-skin-text3 border-skin-bdr-lt hover:text-skin-text"
                }`}
              >
                <Icon active={active} />
                <span className="text-[9px] font-editorial tracking-[0.08em] uppercase leading-none text-center">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
