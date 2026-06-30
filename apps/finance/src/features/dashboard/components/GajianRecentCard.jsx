import { fmtRp, fmtTanggalPendek } from "../../../shared/lib/format";

const BREAKDOWN = [
  ["total_potong", "Potong"],
  ["total_jahit", "Jahit"],
  ["total_finishing", "Finishing"],
  ["total_kreatif", "Kreatif"],
  ["total_cmt", "CMT"],
];

/** GajianRecentCard.jsx — Satu baris riwayat gajian di Dashboard. */
export default function GajianRecentCard({ g, onClick }) {
  return (
    <div
      className="bg-skin-card border border-skin-bdr p-4 cursor-pointer hover:border-[#CAB170] transition"
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <p className="font-editorial text-sm font-semibold text-skin-text">
          Sabtu, {fmtTanggalPendek(g.tanggal_sabtu)}
        </p>
        <span
          className={`font-editorial text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 border ${
            g.status === "final"
              ? "border-emerald-500/40 text-emerald-500"
              : "border-amber-400/40 text-amber-400"
          }`}
        >
          {g.status}
        </span>
      </div>
      <p className="font-headline text-[#CAB170] text-lg leading-none">{fmtRp(g.total_gaji)}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2">
        {BREAKDOWN.map(([key, label]) => {
          const val = g[key];
          if (!val) return null;
          return (
            <p key={key} className="font-editorial text-xs text-skin-text3">
              {label}: {fmtRp(val)}
            </p>
          );
        })}
      </div>
    </div>
  );
}
