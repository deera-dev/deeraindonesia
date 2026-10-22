import { fmtJarak } from "../hooks";

export default function PetaTerdekat({ items, mode, total, selected, onToggle, onSelectAll, onFocus, onClose }) {
  if (!items.length) return null;
  const estimate = items.some((i) => i.isEstimate);
  const isRencana = mode === "rencana";
  return (
    <div className="px-4">
      <div className="border border-skin-bdr-lt bg-skin-card">
        <div className="flex items-center justify-between px-4 py-2 border-b border-skin-bdr-lt">
          <span className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3">
            {isRencana ? "Rencana terdekat" : "Toko terdekat"}
            {isRencana && total > items.length ? ` (${items.length} dari ${total})` : ""}
            {estimate ? " (garis lurus)" : ""}
          </span>
          <div className="flex items-center gap-3 text-xs">
            {!isRencana && (
              <button type="button" onClick={onSelectAll} className="text-skin-accent-text underline">
                Pilih semua
              </button>
            )}
            <button type="button" onClick={onClose} aria-label="Tutup" className="text-skin-text3 text-base leading-none">
              ×
            </button>
          </div>
        </div>
        <div className="divide-y divide-skin-bdr-lt">
          {items.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => (isRencana ? onFocus(t) : onToggle(t))}
              className="w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-skin-page"
            >
              {isRencana ? (
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-skin-accent text-skin-on-accent flex items-center justify-center text-[11px] font-bold">
                  {i + 1}
                </span>
              ) : (
                <span
                  className={`flex-shrink-0 w-5 h-5 border-2 flex items-center justify-center text-xs font-bold ${
                    selected.has(t.id) ? "bg-skin-accent border-skin-accent text-skin-on-accent" : "border-skin-bdr text-transparent"
                  }`}
                >
                  ✓
                </span>
              )}
              <span className="flex-1 min-w-0 text-sm text-skin-text truncate">
                {isRencana ? t.nama : `${i + 1}. ${t.nama}`}
              </span>
              <span className="flex-shrink-0 text-xs text-skin-text3">{fmtJarak(t)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
