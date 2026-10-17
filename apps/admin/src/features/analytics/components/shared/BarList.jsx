export default function BarList({ items = [], valueFormatter = (v) => v, emptyMessage = "Belum ada data." }) {
  if (!items.length) {
    return <p className="text-sm text-skin-text3 text-center py-5">{emptyMessage}</p>;
  }

  const max = Math.max(1, ...items.map((it) => Math.abs(Number(it.value) || 0)));

  return (
    <div className="space-y-2">
      {items.map((it, i) => {
        const value = Number(it.value) || 0;
        const widthPct = (Math.abs(value) / max) * 100;
        return (
          <div key={`${it.label}-${i}`} className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 mb-0.5">
              <span className="text-xs font-semibold text-skin-text3 break-words">{it.label}</span>
              <span className="flex-shrink-0 text-xs font-bold text-skin-text">{valueFormatter(value)}</span>
            </div>
            <div className="h-1.5 bg-skin-bdr-lt rounded-sm">
              <div
                className="h-full bg-skin-accent rounded-sm"
                style={{ width: `${widthPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
