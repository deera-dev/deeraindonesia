import { memo } from "react";

function Leaderboard({
  items = [],
  labelKey = "kode",
  valueFormatter = (v) => v,
  emptyMessage = "Belum ada data.",
  valueClassName,
  mono = true,
}) {
  if (!items.length) {
    return <p className="text-sm text-skin-text3 text-center py-5">{emptyMessage}</p>;
  }

  return (
    <div className="bg-skin-card border border-skin-bdr divide-y divide-skin-bdr-lt">
      {items.map((item, i) => (
        <div
          key={`${item[labelKey] ?? item.pelangganId ?? i}-${i}`}
          className="flex items-center justify-between gap-3 px-3 py-2.5"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-skin-page text-skin-text3 text-[10px] font-bold flex items-center justify-center">
              {i + 1}
            </span>
            <span
              className={`text-sm text-skin-text break-words ${mono ? "font-mono" : "font-semibold"}`}
            >
              {item[labelKey]}
            </span>
          </div>
          <span
            className={`flex-shrink-0 text-sm font-bold break-words text-right ${
              valueClassName ? valueClassName(item.value) : "text-skin-accent-text"
            }`}
          >
            {valueFormatter(item.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default memo(Leaderboard);
