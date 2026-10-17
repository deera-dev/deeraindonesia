import { memo } from "react";

function InsightCard({ label, primary, metric, accent }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-3 sm:p-4 min-w-0 flex flex-col gap-1.5">
      <p className="text-[10px] sm:text-xs font-editorial tracking-[0.12em] sm:tracking-[0.15em] uppercase text-skin-text3 leading-[1.15] break-words">
        {label}
      </p>
      <p className="text-base sm:text-lg font-semibold text-skin-text leading-snug break-words">
        {primary}
      </p>
      {metric && (
        <p
          className={`text-sm sm:text-base font-bold leading-snug break-words ${
            accent ? "text-skin-accent-text" : "text-skin-text2"
          }`}
        >
          {metric}
        </p>
      )}
    </div>
  );
}

export default memo(InsightCard);
