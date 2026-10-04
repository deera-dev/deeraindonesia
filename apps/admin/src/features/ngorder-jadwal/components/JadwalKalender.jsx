/**
 * JadwalKalender.jsx — kalender bulanan: tiap jadwal tampil sbg bar yang
 * membentang di hari-harinya (terpotong per minggu). Ketuk bar = buka
 * jadwal, ketuk tanggal = pilih hari itu.
 */
import { NAMA_BULAN, NAMA_HARI_SINGKAT, monthGrid, layoutWeekBars, localDateStr } from "../hooks";

const BAR_STYLE = {
  rencana: "bg-[#CAB170]/20 text-[#A8925A] border border-[#CAB170]/60",
  berjalan: "bg-[#CAB170] text-white border border-[#CAB170]",
  selesai: "bg-green-600/80 text-white border border-green-700/40",
  batal: "bg-skin-raised text-skin-text4 line-through border border-skin-bdr-lt",
};

export default function JadwalKalender({ year, month, trips, selectedDate, onSelectDate, onOpenTrip, onPrev, onNext, onToday }) {
  const weeks = monthGrid(year, month);
  const today = localDateStr();

  return (
    <div className="border border-skin-bdr-lt bg-skin-card">
      <div className="flex items-center justify-between px-3 py-2 border-b border-skin-bdr-lt">
        <button type="button" onClick={onPrev} aria-label="Bulan sebelumnya" className="w-8 h-8 text-skin-text2 hover:text-[#CAB170] text-lg">
          ‹
        </button>
        <button type="button" onClick={onToday} className="font-editorial text-sm tracking-[0.15em] uppercase text-skin-text">
          {NAMA_BULAN[month]} {year}
        </button>
        <button type="button" onClick={onNext} aria-label="Bulan berikutnya" className="w-8 h-8 text-skin-text2 hover:text-[#CAB170] text-lg">
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 border-b border-skin-bdr-lt">
        {NAMA_HARI_SINGKAT.map((h) => (
          <div key={h} className="py-1.5 text-center text-[10px] font-editorial tracking-[0.08em] uppercase text-skin-text4">
            {h}
          </div>
        ))}
      </div>

      {weeks.map((days) => {
        const { bars, rows } = layoutWeekBars(trips, days);
        return (
          <div key={days[0]} className="border-b border-skin-bdr-lt last:border-b-0 pb-1">
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const inMonth = Number(d.slice(5, 7)) - 1 === month;
                const isSelected = d === selectedDate;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSelectDate(d)}
                    className={`py-1.5 flex justify-center ${isSelected ? "bg-[#CAB170]/10" : ""}`}
                  >
                    <span
                      className={`w-6 h-6 flex items-center justify-center text-xs rounded-full ${
                        d === today ? "bg-[#CAB170] text-white font-bold" : inMonth ? "text-skin-text" : "text-skin-text4/60"
                      }`}
                    >
                      {Number(d.slice(8))}
                    </span>
                  </button>
                );
              })}
            </div>
            {Array.from({ length: rows }, (_, r) => (
              <div key={r} className="grid grid-cols-7 mt-0.5 px-0.5">
                {bars
                  .filter((b) => b.row === r)
                  .map((b) => (
                    <button
                      key={b.trip.id}
                      type="button"
                      onClick={() => onOpenTrip(b.trip.id)}
                      style={{ gridColumn: `${b.start + 1} / span ${b.span}`, gridRow: 1 }}
                      className={`h-5 px-1.5 text-[10px] leading-5 text-left truncate ${BAR_STYLE[b.trip.status] ?? BAR_STYLE.rencana} ${
                        b.contLeft ? "rounded-l-none" : "rounded-l"
                      } ${b.contRight ? "rounded-r-none" : "rounded-r"}`}
                    >
                      {b.trip.nama}
                    </button>
                  ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
