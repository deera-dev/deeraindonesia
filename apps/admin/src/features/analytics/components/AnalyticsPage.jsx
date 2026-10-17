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
      <header className="sticky top-0 z-30 bg-skin-card border-b-2 border-skin-bdr shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-8">
          <div className="min-w-0">
            <h1 className="font-headline text-skin-accent-text text-xl leading-none">Dasbor Bisnis</h1>
            <p className="text-xs text-skin-text4 mt-1">Pahami kondisi toko Anda dalam sekejap.</p>
          </div>
        </div>

        <GlobalFilterBar />

        <SectionPicker groups={ANALYTICS_SECTION_GROUPS} activeKey={activeTab} onSelect={setActiveTab} />
      </header>

      <div key={activeTab} className="px-4 py-6 md:px-8 xl:px-10 2xl:px-12 animate-fadeIn">
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
