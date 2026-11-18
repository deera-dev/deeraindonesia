import { useState } from "react";
import ProduksiLayout from "../../../shared/components/ProduksiLayout";
import CmtJahitTab from "./CmtJahitTab";
import CmtFullTab from "./CmtFullTab";

const TABS = [
  { key: "jahit", label: "CMT Jahit" },
  { key: "full", label: "CMT Full" },
];

export default function CmtPage() {
  const [tab, setTab] = useState("jahit");

  return (
    <ProduksiLayout title="CMT (Vendor Luar)">
      <div className="flex border-b border-skin-bdr-lt mb-4">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 py-2.5 text-center font-editorial text-xs tracking-[0.12em] uppercase transition border-b-2 ${
              tab === key
                ? "border-skin-accent text-skin-accent-text"
                : "border-transparent text-skin-text3 hover:text-skin-text"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "jahit" ? <CmtJahitTab /> : <CmtFullTab />}
    </ProduksiLayout>
  );
}
