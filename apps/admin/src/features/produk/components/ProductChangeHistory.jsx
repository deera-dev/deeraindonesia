import { useState } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import { useProductPriceHistory } from "../hooks";
import { fmtWaktu } from "../utils";

const rp = (v) => (v == null ? "—" : `Rp ${formatHarga(v)}`);

function PriceLine({ c }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2 text-sm">
      <span className="text-[11px] uppercase tracking-wide text-skin-text3">{c.label}</span>
      <span className="text-red-400 line-through">{rp(c.from)}</span>
      <span className="text-skin-text3">→</span>
      <span className="text-emerald-500 font-semibold">{rp(c.to)}</span>
    </div>
  );
}

export default function ProductChangeHistory({ kode, limit = 6 }) {
  const { history, loading } = useProductPriceHistory(kode);
  const [all, setAll] = useState(false);
  if (loading || history.length === 0) return null;
  const rows = all ? history : history.slice(0, limit);
  return (
    <div className="space-y-3" data-testid="price-history">
      {rows.map((h) => (
        <div key={h.changed_at} className="border-l-2 border-skin-bdr-lt pl-3 space-y-1">
          <p className="text-xs text-skin-text3">
            {fmtWaktu(h.changed_at)} · <span className="text-skin-text2 uppercase">{h.user_name || "—"}</span>
          </p>
          {h.changes.map((c, i) => (
            <PriceLine key={i} c={c} />
          ))}
        </div>
      ))}
      {history.length > limit && (
        <button type="button" onClick={() => setAll((v) => !v)} className="text-xs text-skin-accent-text">
          {all ? "Tampilkan lebih sedikit" : `Tampilkan semua (${history.length})`}
        </button>
      )}
    </div>
  );
}
