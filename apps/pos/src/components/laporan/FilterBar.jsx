/**
 * FilterBar.jsx
 * Filter waktu di Laporan — tombol dropdown + date input jika dipilih.
 *
 * Props:
 * - filter       : "today"|"week"|"month"|"year"|"custom"|"range"
 * - customDate   : string "YYYY-MM-DD"
 * - rangeFrom    : string "YYYY-MM-DD"
 * - rangeTo      : string "YYYY-MM-DD"
 * - onFilter     : (key) => void
 * - onDateChange : (date: string) => void
 * - onRangeChange: (from: string, to: string) => void
 */
import { useState, useRef, useEffect } from "react";

const today = new Date().toISOString().split("T")[0];

const FILTERS = [
  { key: "today",  label: "Hari Ini",   icon: "◉" },
  { key: "week",   label: "7 Hari",     icon: "◎" },
  { key: "month",  label: "Bulan Ini",  icon: "◷" },
  { key: "year",   label: "Tahun Ini",  icon: "◈" },
  { key: "custom", label: "Tanggal...", icon: "📅" },
  { key: "range",  label: "Rentang...", icon: "⇔" },
];

function getLabel(filter, customDate, rangeFrom, rangeTo) {
  if (filter === "custom" && customDate) {
    return new Date(customDate + "T00:00:00").toLocaleDateString("id-ID", {
      day: "numeric", month: "short", year: "numeric",
    });
  }
  if (filter === "range" && rangeFrom && rangeTo) {
    const fmt = (d) =>
      new Date(d + "T00:00:00").toLocaleDateString("id-ID", {
        day: "numeric", month: "short",
      });
    return `${fmt(rangeFrom)} → ${fmt(rangeTo)}`;
  }
  return FILTERS.find((f) => f.key === filter)?.label ?? "Filter";
}

export default function FilterBar({
  filter, customDate, rangeFrom, rangeTo,
  onFilter, onDateChange, onRangeChange,
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  // Tutup dropdown kalau klik di luar
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  function selectFilter(key) {
    onFilter(key);
    setOpen(false);
  }

  const label    = getLabel(filter, customDate, rangeFrom, rangeTo);
  const icon     = FILTERS.find((f) => f.key === filter)?.icon ?? "◉";
  const isCustom = filter === "custom";
  const isRange  = filter === "range";

  return (
    <div className="bg-skin-card border-b border-skin-bdr px-3 pt-3 pb-2 flex-shrink-0">

      {/* ── Tombol filter dropdown ── */}
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-sm border transition text-sm font-semibold ${
            open
              ? "bg-[#CAB170] text-white border-[#CAB170]"
              : "bg-skin-raised text-skin-text border-skin-bdr hover:border-[#CAB170] hover:text-[#CAB170]"
          }`}
        >
          <span className="flex items-center gap-2 min-w-0">
            <span className="text-base leading-none flex-shrink-0">{icon}</span>
            <span className="truncate uppercase tracking-[0.08em] text-xs">{label}</span>
          </span>
          <span
            className={`flex-shrink-0 text-xs transition-transform duration-200 ${
              open ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </button>

        {/* ── Dropdown menu ── */}
        {open && (
          <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-skin-card border border-skin-bdr shadow-xl overflow-hidden">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => selectFilter(f.key)}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition border-b border-skin-bdr-lt last:border-0 ${
                  filter === f.key
                    ? "bg-skin-gold text-[#CAB170] font-semibold"
                    : "text-skin-text2 hover:bg-skin-raised hover:text-skin-text"
                }`}
              >
                <span className="text-base leading-none w-5 text-center flex-shrink-0">
                  {f.icon}
                </span>
                <span className="uppercase tracking-[0.06em] text-xs">{f.label}</span>
                {filter === f.key && (
                  <span className="ml-auto text-[#CAB170] font-bold leading-none">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Date picker tunggal ── */}
      {isCustom && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={customDate}
            max={today}
            onChange={(e) => onDateChange(e.target.value)}
            className="flex-1 bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition rounded-sm"
          />
          <span className="text-xs text-skin-text3 whitespace-nowrap flex-shrink-0">
            {new Date(customDate + "T00:00:00").toLocaleDateString("id-ID", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
        </div>
      )}

      {/* ── Range date picker ── */}
      {isRange && (
        <div className="mt-2 flex items-center gap-2">
          <input
            type="date"
            value={rangeFrom}
            max={rangeTo || today}
            onChange={(e) => onRangeChange(e.target.value, rangeTo)}
            className="flex-1 bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition rounded-sm"
          />
          <span className="text-xs text-skin-text3 flex-shrink-0 font-bold">→</span>
          <input
            type="date"
            value={rangeTo}
            min={rangeFrom}
            max={today}
            onChange={(e) => onRangeChange(rangeFrom, e.target.value)}
            className="flex-1 bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition rounded-sm"
          />
        </div>
      )}
    </div>
  );
}
