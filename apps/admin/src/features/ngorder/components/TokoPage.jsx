import { useEffect, useMemo, useState } from "react";
import AdminBottomNav from "../../../shared/components/AdminBottomNav";
import AdminSidebar from "../../../shared/components/AdminSidebar";
import { BlastPanel } from "../../blast";
import { JadwalTab } from "../../ngorder-jadwal";
import { distinctDaerahList, useTokoListQuery } from "../hooks";
import PetaTab from "./PetaTab";

const TABS = [
  { key: "peta", label: "Peta" },
  { key: "jadwal", label: "Jadwal" },
  { key: "blast", label: "Blast" },
];

export default function TokoPage() {
  const { data: list = [] } = useTokoListQuery();
  const [tab, setTab] = useState("peta");
  const [petaMounted, setPetaMounted] = useState(tab === "peta");
  useEffect(() => {
    if (tab === "peta") setPetaMounted(true);
  }, [tab]);

  const daerahOptions = useMemo(() => distinctDaerahList(list), [list]);

  return (
    <div className="min-h-screen bg-skin-page pb-24 md:pb-6 md:pl-64">
      <div className="px-4 pt-6 pb-4 md:px-8 xl:px-10 2xl:px-12">
        <h1 className="font-headline text-2xl text-skin-text">Ngorder</h1>
        <p className="text-sm text-skin-text3 mt-1">
          Kurasi toko potensial lewat peta, susun rencana kunjungan bersama tim, dan catat hasil
          tiap kunjungan.
        </p>
      </div>

      <div className="px-4 pb-4 md:px-8 xl:px-10 2xl:px-12 flex gap-2 border-b border-skin-bdr-lt">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`px-3 py-2 text-xs font-editorial tracking-[0.1em] uppercase border-b-2 transition ${
              tab === t.key
                ? "border-skin-accent text-skin-accent-text"
                : "border-transparent text-skin-text3 hover:text-skin-text"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {petaMounted && (
        <div className={tab === "peta" ? "" : "hidden"}>
          <PetaTab tokoList={list} onNavigate={setTab} />
        </div>
      )}

      {tab === "blast" && <BlastPanel />}

      {tab === "jadwal" && <JadwalTab tokoList={list} daerahOptions={daerahOptions} />}

      <AdminSidebar />
      <AdminBottomNav />
    </div>
  );
}
