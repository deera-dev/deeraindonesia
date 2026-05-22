/**
 * FilterBar.jsx
 * Tab filter waktu di Laporan:
 * Hari Ini / 7 Hari / Bulan / Tahun / Tanggal / Rentang (A→B)
 *
 * Props:
 * - filter      : "today"|"week"|"month"|"year"|"custom"|"range"
 * - customDate  : string "YYYY-MM-DD" (untuk mode custom)
 * - rangeFrom   : string "YYYY-MM-DD" (untuk mode range)
 * - rangeTo     : string "YYYY-MM-DD" (untuk mode range)
 * - onFilter    : (key) => void
 * - onDateChange: (date: string) => void
 * - onRangeChange: (from: string, to: string) => void
 */

const today = new Date().toISOString().split("T")[0];

const QUICK_FILTERS = [
  { key: "today", label: "Hari Ini" },
  { key: "week",  label: "7 Hari"  },
  { key: "month", label: "Bulan"   },
  { key: "year",  label: "Tahun"   },
];

export default function FilterBar({
  filter, customDate, rangeFrom, rangeTo,
  onFilter, onDateChange, onRangeChange,
}) {
  return (
    <div className="bg-white border-b-2 border-[#E8E3DC] px-3 py-3 flex-shrink-0 space-y-2">

      {/* ── Baris tombol filter ── */}
      <div className="flex gap-1.5 flex-wrap">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => onFilter(f.key)}
            className={`flex-1 min-w-[60px] py-3.5 text-sm tracking-[0.06em] uppercase font-semibold transition border-2 ${
              filter === f.key
                ? "bg-[#CAB170] text-white border-[#CAB170]"
                : "bg-white text-[#6B6560] border-[#E8E3DC] hover:border-[#CAB170] hover:text-[#CAB170]"
            }`}
          >
            {f.label}
          </button>
        ))}

        {/* Tombol tanggal spesifik */}
        <button
          onClick={() => onFilter("custom")}
          title="Tanggal spesifik"
          className={`px-3 py-3.5 border-2 transition text-lg ${
            filter === "custom"
              ? "bg-[#CAB170] text-white border-[#CAB170]"
              : "bg-white text-[#6B6560] border-[#E8E3DC] hover:border-[#CAB170] hover:text-[#CAB170]"
          }`}
        >
          📅
        </button>

        {/* Tombol rentang tanggal */}
        <button
          onClick={() => onFilter("range")}
          title="Rentang tanggal"
          className={`px-3 py-3.5 border-2 transition text-sm font-bold ${
            filter === "range"
              ? "bg-[#CAB170] text-white border-[#CAB170]"
              : "bg-white text-[#6B6560] border-[#E8E3DC] hover:border-[#CAB170] hover:text-[#CAB170]"
          }`}
        >
          A→B
        </button>
      </div>

      {/* ── Date picker tunggal ── */}
      {filter === "custom" && (
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={customDate}
            max={today}
            onChange={(e) => onDateChange(e.target.value)}
            className="flex-1 bg-[#F9F7F4] border-2 border-[#CAB170] px-4 py-3 text-base text-[#1A1918] focus:outline-none"
          />
          <span className="text-sm text-[#6B6560] whitespace-nowrap">
            {new Date(customDate + "T00:00:00").toLocaleDateString("id-ID", {
              day: "numeric", month: "long", year: "numeric",
            })}
          </span>
        </div>
      )}

      {/* ── Range date picker ── */}
      {filter === "range" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#9C9690] w-10 flex-shrink-0">Dari</span>
            <input
              type="date"
              value={rangeFrom}
              max={rangeTo || today}
              onChange={(e) => onRangeChange(e.target.value, rangeTo)}
              className="flex-1 bg-[#F9F7F4] border-2 border-[#CAB170] px-3 py-3 text-base text-[#1A1918] focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#9C9690] w-10 flex-shrink-0">Sampai</span>
            <input
              type="date"
              value={rangeTo}
              min={rangeFrom}
              max={today}
              onChange={(e) => onRangeChange(rangeFrom, e.target.value)}
              className="flex-1 bg-[#F9F7F4] border-2 border-[#CAB170] px-3 py-3 text-base text-[#1A1918] focus:outline-none"
            />
          </div>
          {rangeFrom && rangeTo && (
            <p className="text-sm text-[#6B6560] text-center">
              {new Date(rangeFrom + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
              {" — "}
              {new Date(rangeTo + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
