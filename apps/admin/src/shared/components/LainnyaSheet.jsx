/**
 * LainnyaSheet.jsx
 * Bottom sheet full-screen (mobile) berisi grid ikon untuk item nav yang
 * tidak muat di AdminBottomNav utama (permintaan Denny 2026-08 — "menunya
 * udah kebanyakan"). Dipanggil dari AdminBottomNav.jsx, menerima daftar
 * item sisa (`items`, subset dari NAV_ITEMS) + helper `isActive` dari
 * parent supaya logic active-route tidak duplikasi.
 *
 * Toggle dark/light mode (permintaan Denny 2026-10: "pindahkan fitur
 * switch dark/light mode di navigasi aja ... kalau yang mobile baiknya
 * gimana?") ditaruh di sini sbg baris footer — AdminBottomNav sendiri
 * sudah padat (5 ikon + "Lainnya"), jadi switch tema masuk ke sheet ini
 * yang dibuka dari tombol "Lainnya" yang SELALU ada di setiap halaman
 * mobile, bukan ditumpuk lagi di header tiap halaman seperti sebelumnya
 * (cuma 4 dari ~14 halaman yang kebetulan punya switch sendiri).
 */
import { Link } from "react-router-dom";
import { useTheme } from "@deera/shared/features/theme/hooks";
import ThemeToggle from "@deera/shared/components/ThemeToggle";

export default function LainnyaSheet({ items, isActive, onClose }) {
  const { isDark, toggleTheme } = useTheme();

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
