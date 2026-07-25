/**
 * AnalyticsPage.jsx — /analytics
 * Orchestrator: header + GlobalFilterBar + navigasi halaman + konten.
 *
 * ══════════════════════════════════════════════════════════════════════
 * REDESIGN UI/UX TOTAL (2026-07) — perubahan requirement eksplisit Denny
 * ══════════════════════════════════════════════════════════════════════
 * Target dashboard ini adalah OWNER TOKO yang bukan orang teknis —
 * prioritas utama kemudahan penggunaan, bukan banyaknya data. Perubahan
 * utama di file ini (alasan lengkap & perbandingan alternatif desain ada
 * di laporan implementasi redesign):
 *
 * 1. Navigasi tab horizontal 9-tombol (sejajar, rawan overflow/terpotong
 *    di mobile) DIHAPUS TOTAL, diganti <SectionPicker/> (BARU, lihat
 *    shared/SectionPicker.jsx) — 1 tombol trigger + bottom sheet
 *    terkelompok. TIDAK ADA overflow/ellipsis/horizontal-scroll di
 *    manapun, skalabel walau halaman bertambah ke depan.
 * 2. Nama halaman sekarang Bahasa Indonesia sederhana (dari
 *    ANALYTICS_SECTION_GROUPS di constants.js — SATU sumber kebenaran,
 *    dipakai juga oleh SectionPicker).
 * 3. Halaman DEFAULT diganti dari "overview" (Ringkasan Penjualan) jadi
 *    "executive" (Ringkasan Bisnis) — DEFAULT_ANALYTICS_SECTION di
 *    constants.js. Evaluasi ulang Denny (poin 9 redesign): Ringkasan
 *    Bisnis adalah halaman yang PALING SERING dibuka owner, jadi
 *    dijadikan beranda, bukan dipertahankan di urutan lama.
 * 4. Judul halaman & subjudul diubah ke bahasa yang lebih akrab ("Dasbor
 *    Bisnis" / "Pahami kondisi toko Anda dalam sekejap") — bukan lagi
 *    "Analytics" / "Business Intelligence penjualan" yang terasa seperti
 *    istilah alat analis, bukan aplikasi bantu keputusan.
 *
 * TIDAK ADA perubahan pada RPC/hook/business logic di file ini — HANYA
 * susunan navigasi & teks. Setiap tab (`{activeTab === "..." && <XxxTab/>}`)
 * tetap memanggil hook yang SAMA PERSIS seperti sebelumnya.
 *
 * GlobalFilterBar TIDAK diubah (di luar scope redesign navigasi ini).
 *
 * ── Tab "Ringkasan Produksi" (2026-07-19) ─────────────────────────────
 * Pindahan dari /produksi/laporan (keputusan eksplisit Denny) — masuk ke
 * group baru "Produksi" di ANALYTICS_SECTION_GROUPS (constants.js), render
 * via <ProductionTab/> sama seperti tab lain, tidak ada perubahan pola.
 */
import { useState } from "react";
import BackToTop from "@deera/shared/components/BackToTop";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";
import { ANALYTICS_SECTION_GROUPS, DEFAULT_ANALYTICS_SECTION } from "../constants";
import GlobalFilterBar from "./GlobalFilterBar";
import SectionPicker from "./shared/SectionPicker";
import OverviewTab from "./tabs/OverviewTab";
import ProductsTab from "./tabs/ProductsTab";
import MarketsTab from "./tabs/MarketsTab";
import TrendsTab from "./tabs/TrendsTab";
import CustomersTab from "./tabs/CustomersTab";
import AdvancedTab from "./tabs/AdvancedTab";
import InventoryTab from "./tabs/InventoryTab";
import ForecastTab from "./tabs/ForecastTab";
import ExecutiveTab from "./tabs/ExecutiveTab";
import ProductionTab from "./tabs/ProductionTab";

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState(DEFAULT_ANALYTICS_SECTION);

  return (
    <main className="min-h-screen bg-skin-page text-skin-text pb-20 md:pb-6 md:pl-64">
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-[#CAB170] text-xl leading-none">Dasbor Bisnis</h1>
            <p className="text-xs text-skin-text4 mt-1">Pahami kondisi toko Anda dalam sekejap.</p>
          </div>
        </div>

        <GlobalFilterBar />

        {/* Navigasi halaman — SectionPicker (bottom sheet terkelompok),
            BUKAN lagi tab horizontal. Lihat shared/SectionPicker.jsx. */}
        <SectionPicker groups={ANALYTICS_SECTION_GROUPS} activeKey={activeTab} onSelect={setActiveTab} />
      </header>

      {/* ── Konten halaman ── */}
      <div key={activeTab} className="px-4 py-6 md:px-8 md:max-w-6xl md:mx-auto animate-fadeIn">
        {activeTab === "executive" && <ExecutiveTab />}
        {activeTab === "overview" && <OverviewTab />}
        {activeTab === "trends" && <TrendsTab />}
        {activeTab === "products" && <ProductsTab />}
        {activeTab === "inventory" && <InventoryTab />}
        {activeTab === "markets" && <MarketsTab />}
        {activeTab === "customers" && <CustomersTab />}
        {activeTab === "forecast" && <ForecastTab />}
        {activeTab === "advanced" && <AdvancedTab />}
        {activeTab === "production" && <ProductionTab />}
      </div>

      <AdminSidebar />
      <AdminBottomNav />
      <BackToTop />
    </main>
  );
}
