/**
 * MetricCard.jsx
 * Kartu angka ringkasan di halaman Laporan (omset, untung, stok, dll).
 */

const COLOR_MAP = {
  gold:   "text-[#CAB170]",
  green:  "text-green-600",
  orange: "text-orange-500",
  red:    "text-red-500",
};

export default function MetricCard({ label, value, sub, color = "gold" }) {
  return (
    <div className="bg-white border-2 border-[#E8E3DC] p-4">
      <p className="text-sm text-[#6B6560] tracking-[0.1em] uppercase mb-2 font-medium">{label}</p>
      <p
        className={`text-2xl leading-none font-semibold ${COLOR_MAP[color] ?? COLOR_MAP.gold}`}
        style={{ fontFamily: "'Braise', serif" }}
      >
        {value}
      </p>
      {sub && <p className="text-sm text-[#6B6560] mt-1.5">{sub}</p>}
    </div>
  );
}
