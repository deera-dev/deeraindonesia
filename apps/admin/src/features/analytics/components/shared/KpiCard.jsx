import { memo } from "react";

function KpiCard({ label, value, sub, hint, accent, warn }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-3 sm:p-4 min-w-0 flex flex-col gap-1">
      <p className="text-[10px] sm:text-xs font-editorial tracking-[0.12em] sm:tracking-[0.15em] uppercase text-skin-text3 leading-[1.15] break-words">
        {label}
      </p>
      <p
        className={`text-2xl sm:text-3xl font-bold leading-tight break-words ${
          accent ? "text-skin-accent-text" : warn ? "text-amber-500" : "text-skin-text"
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-skin-text3 leading-snug break-words">{sub}</p>}
      {hint && <p className="text-[11px] text-skin-text4 leading-snug break-words mt-0.5">{hint}</p>}
    </div>
  );
}

export default memo(KpiCard);
