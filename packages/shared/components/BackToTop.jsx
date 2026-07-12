import { useScrollVisibility } from "../hooks/useScrollVisibility";

/**
 * BackToTop — tombol floating "Kembali ke Atas", REUSABLE untuk SELURUH
 * aplikasi (Admin/POS/Finance). Redesign total 2026-07 — lihat laporan
 * implementasi untuk audit UX lengkap & alasan tiap keputusan desain.
 *
 * ── Kenapa diredesign ────────────────────────────────────────────────
 * Versi lama mewajibkan tiap halaman mengingat prop `bottomClass` yang
 * benar secara manual (mis. "bottom-24" di Admin, "bottom-20" di POS) —
 * kalau lupa (dan beberapa halaman memang lupa, lihat laporan), tombol
 * bertumpuk/bertabrakan dengan Bottom Navigation, atau bahkan ada 2
 * instance <BackToTop/> aktif sekaligus di 1 halaman. Versi baru
 * menghilangkan sumber masalahnya: default `withBottomNav={true}`
 * SELALU aman untuk halaman apa pun yang punya Bottom Navigation (mayoritas
 * halaman di app ini) TANPA perlu prop tambahan apa pun — offset dihitung
 * otomatis + `env(safe-area-inset-bottom)` (iPhone notch/home-indicator).
 * Halaman yang TIDAK punya Bottom Navigation cukup pasang
 * `withBottomNav={false}`.
 *
 * ── Kenapa bentuk "Extended FAB" bersudut kotak (bukan pill/glass) ────
 * Design System aplikasi ini konsisten memakai elemen bersudut kotak,
 * border-2, aksen emas (`#CAB170`) — lihat SectionPicker, BottomSheet,
 * kartu produk, bottom nav, dll di seluruh app. TIDAK ADA elemen
 * rounded-full/glassmorphism di permukaan utama mana pun. Memilih pola
 * "Floating Pill"/"Floating Glass" akan terasa asing di tengah bahasa
 * visual yang sudah mapan. Sebagai gantinya, tombol ini memakai bentuk
 * "Extended FAB" (ikon + label singkat "Atas" yang muncul mulai `sm:`)
 * TAPI dengan sudut kotak + border-2 seperti komponen lain — konsisten
 * dengan Design System, tetap terasa modern lewat animasi fade+slide+scale.
 *
 * ── Perilaku ─────────────────────────────────────────────────────────
 * Scroll-tracking (passive + rAF-throttled) didelegasikan ke
 * `useScrollVisibility` (packages/shared/hooks/) — SATU implementasi
 * listener untuk seluruh app, bukan tiap komponen bikin sendiri. Tombol
 * TETAP di-mount (bukan `return null`) supaya transisi CSS (opacity +
 * translate-y + scale) bisa berjalan halus; saat tidak terlihat,
 * `pointer-events-none` + `aria-hidden` mencegah elemen "hantu" tetap
 * bisa di-klik/terbaca screen reader.
 *
 * ── Accessibility ────────────────────────────────────────────────────
 * - Area sentuh 48×48px (melebihi minimum 44×44px).
 * - `aria-label` tetap ada meski label teks tampil (screen reader tidak
 *   membaca dobel karena label teks memakai `aria-hidden`).
 * - `focus-visible:` ring terlihat jelas untuk navigasi keyboard.
 * - Kontras: border/teks abu gelap di atas `bg-skin-card`, berubah emas
 *   saat hover/focus — sama dengan pola kontras yang sudah dipakai
 *   komponen lain di app ini.
 *
 * Props:
 *   threshold     — px scroll sebelum tombol muncul (default 300)
 *   scrollEl      — React ref ke elemen yang di-scroll (default: window)
 *   withBottomNav — true = offset otomatis clear Bottom Navigation +
 *                   safe-area (default true, aman untuk mayoritas halaman)
 *   offsetPx      — override manual offset dari bawah dalam px (opsional,
 *                   mengalahkan withBottomNav kalau diisi)
 *   showLabel     — tampilkan label teks "Atas" mulai breakpoint `sm:`
 *                   (default true)
 *   className     — override posisi horizontal (default "right-4")
 */
const NAV_CLEAR_OFFSET_PX = 88; // aman untuk Admin (64px+pad), POS (~62px), Finance (56px)
const NO_NAV_OFFSET_PX = 24;

export default function BackToTop({
  threshold = 300,
  scrollEl = null,
  withBottomNav = true,
  offsetPx = null,
  showLabel = true,
  className = "",
}) {
  const visible = useScrollVisibility({ threshold, scrollEl });

  function scrollToTop() {
    const el = scrollEl?.current ?? null;
    if (el) {
      el.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const resolvedOffset = offsetPx ?? (withBottomNav ? NAV_CLEAR_OFFSET_PX : NO_NAV_OFFSET_PX);

  return (
    <button
      type="button"
      onClick={scrollToTop}
      aria-label="Kembali ke atas"
      aria-hidden={!visible}
      tabIndex={visible ? 0 : -1}
      style={{ bottom: `calc(${resolvedOffset}px + env(safe-area-inset-bottom))` }}
      className={`fixed z-40 flex items-center justify-center gap-1.5 h-12 min-w-[48px] px-3 bg-skin-card border-2 border-skin-bdr shadow-md text-skin-text3 transition-all duration-200 ease-out hover:text-[#CAB170] hover:border-[#CAB170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CAB170] focus-visible:ring-offset-2 active:scale-95 ${
        visible
          ? "opacity-100 translate-y-0 scale-100"
          : "opacity-0 translate-y-2 scale-95 pointer-events-none"
      } ${className || "right-4"}`}
    >
      <span aria-hidden="true" className="text-base leading-none">↑</span>
      {showLabel && (
        <span aria-hidden="true" className="hidden sm:inline font-editorial text-[11px] tracking-[0.15em] uppercase leading-none">
          Atas
        </span>
      )}
    </button>
  );
}
