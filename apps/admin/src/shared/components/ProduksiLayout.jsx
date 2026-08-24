/**
 * ProduksiLayout.jsx
 * Shared layout untuk modul Produksi.
 * Sub-nav: Produksi > HPP > Bahan > Sampel
 * Tab bar: flex-wrap (bukan overflow-x-auto), tidak ada x-scroll di halaman.
 *
 * ── Pindahan "Laporan" ke Analytics (2026-07-19) ─────────────────────
 * Tab sub-nav "Laporan" (dulu /produksi/laporan) DIHAPUS dari sini —
 * keputusan eksplisit Denny: halaman itu lebih sesuai jadi bagian
 * Analytics ("Ringkasan Produksi", lihat
 * apps/admin/src/features/analytics/components/tabs/ProductionTab.jsx)
 * daripada di modul Produksi. Route lama (/produksi/laporan) juga sudah
 * dihapus dari App.jsx, folder features/produksi-laporan sudah dihapus
 * total (RPC Postgres get_laporan_produksi/get_produksi_batches_total
 * TETAP ADA di database, tidak dihapus, sekadar tidak lagi dipanggil dari
 * frontend manapun — lihat migration
 * 20260719_analytics_phase9_production_rpc.sql untuk RPC penggantinya).
 *
 * ── BackToTop (redesign 2026-07) ─────────────────────────────────────
 * `<BackToTop/>` SEKARANG dirender SATU KALI di sini, bukan di tiap
 * halaman Produksi (ProduksiRecordPage, ProduksiHPPPage, ProduksiBahanPage,
 * ProduksiSampelPage, ProduksiLaporanPage) seperti sebelumnya. Audit UX
 * menemukan 2 dari 5 halaman tersebut SECARA TIDAK SENGAJA merender
 * `<BackToTop/>` DUA KALI (bug nyata — 2 tombol floating aktif
 * bertumpukan di 1 halaman) karena tiap developer harus mengingat sendiri
 * untuk menambahkannya. Memindahkan ke shared layout menghilangkan
 * sumber masalahnya secara struktural — halaman baru di masa depan yang
 * memakai ProduksiLayout otomatis dapat BackToTop yang konsisten, tanpa
 * perlu diingat manual.
 */
import { Link, useLocation } from "react-router-dom";
import { useTheme } from "@deera/shared/features/theme/hooks";
import ThemeToggle from "@deera/shared/components/ThemeToggle";
import BackToTop from "@deera/shared/components/BackToTop";
import AdminBottomNav from "./AdminBottomNav";
import AdminSidebar from "./AdminSidebar";

// Urutan tab kiri→kanan (permintaan Denny 2026-08): Planning - Produksi -
// HPP - Bahan, dengan Planning sebagai tab utama/default (lihat App.jsx,
// redirect index /produksi → /produksi/sampel).
const SUB_NAVS = [
  { to: "/produksi/sampel", label: "Planning" },
  { to: "/produksi/record", label: "Produksi" },
  { to: "/produksi/hpp", label: "HPP" },
  { to: "/produksi/bahan", label: "Bahan" },
];

export default function ProduksiLayout({ children, title, headerAction }) {
  const { pathname } = useLocation();
  const { isDark, toggleTheme } = useTheme();

  return (
    // Catatan: overflow-x-hidden SENGAJA tidak dipakai di sini (band-aid yang
    // menyembunyikan sumber overflow asli, bukan memperbaikinya). Sub-nav di
    // bawah pakai flex-wrap (bukan overflow-x-auto) sehingga tidak pernah
    // butuh scroll horizontal — kalau 5 tab tidak muat dalam satu baris,
    // otomatis membungkus ke baris kedua.
    <div className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-[#CAB170] text-xl leading-none md:text-2xl">
              PRODUKSI
            </h1>
            {title && (
              <p className="mt-0.5 font-editorial text-xs tracking-[0.15em] text-skin-text3 uppercase truncate">
                {title}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {headerAction}
            <ThemeToggle isDark={isDark} onToggle={toggleTheme} />
          </div>
        </div>

        {/*
          Sub-nav: flex-wrap → tiap tab flex-1 muat pas di layar; kalau
          kurang muat dalam satu baris, membungkus ke baris berikutnya
          (bukan minta pengguna geser horizontal).
        */}
        <div className="flex flex-wrap border-t border-skin-bdr-lt">
          {SUB_NAVS.map(({ to, label }) => {
            const active = pathname === to || pathname.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to}
                className={`flex-1 min-w-[60px] py-2.5 text-center font-editorial text-[10px] tracking-[0.1em] uppercase transition border-b-2 ${
                  active
                    ? "border-[#CAB170] text-[#CAB170]"
                    : "border-transparent text-skin-text3 hover:text-skin-text"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </header>

      {/* ── Content ── */}
      <main className="px-4 py-4 md:px-8 md:py-6 lg:max-w-6xl lg:mx-auto">{children}</main>

      <BackToTop />
      <AdminSidebar />
      <AdminBottomNav />
    </div>
  );
}
