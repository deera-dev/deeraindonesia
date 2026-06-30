/**
 * SubTabDropdown.jsx — Dropdown navigasi sub-tab halaman Laporan.
 * Diekstrak dari pages/Laporan.jsx (komponen inline) agar LaporanPage.jsx
 * tetap menjadi orchestrator yang tipis (CLAUDE.md §13).
 */
import { useState, useRef, useEffect } from "react";

const SUB_TABS = [
  { key: "ringkasan", label: "Laporan" },
  { key: "transaksi", label: "Transaksi" },
  { key: "keuangan", label: "Keuangan" },
  { key: "stok", label: "Stok" },
  { key: "pembeli", label: "Pembeli" },
  { key: "pasar", label: "Pasar" },
  { key: "bep", label: "BEP" },
];

export default function SubTabDropdown({ subTab, setSubTab }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    function h(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const active = SUB_TABS.find((t) => t.key === subTab) ?? SUB_TABS[0];

  return (
    <div className="flex-shrink-0 bg-skin-card border-b border-skin-bdr px-3 py-2" ref={ref}>
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className={`w-full flex items-center justify-between gap-2 px-4 py-2 rounded-sm border transition text-sm font-semibold ${
            open
              ? "bg-[#CAB170] text-white border-[#CAB170]"
              : "bg-skin-raised text-skin-text border-skin-bdr hover:border-[#CAB170] hover:text-[#CAB170]"
          }`}
        >
          <span className="flex items-center gap-2">
            <span className="uppercase tracking-[0.08em] text-xs">{active.label}</span>
          </span>
          <span
            className={`flex-shrink-0 text-xs transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-skin-card border border-skin-bdr shadow-xl overflow-hidden">
            {SUB_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  setSubTab(t.key);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition border-b border-skin-bdr-lt last:border-0 ${
                  subTab === t.key
                    ? "bg-skin-gold text-[#CAB170] font-semibold"
                    : "text-skin-text2 hover:bg-skin-raised hover:text-skin-text"
                }`}
              >
                <span className="uppercase tracking-[0.06em] text-xs">{t.label}</span>
                {subTab === t.key && <span className="ml-auto text-[#CAB170] font-bold">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
