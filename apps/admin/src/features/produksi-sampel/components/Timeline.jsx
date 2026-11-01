import { useHistoryByKode } from "../../history";
import { buildTimeline } from "../utils";
import { formatGroupDate, formatTime, getMeta } from "../../history/utils";

export default function Timeline({ sampel }) {
  const { history, loading } = useHistoryByKode(sampel.nomor);
  const items = buildTimeline(history);

  if (loading) {
    return <p className="text-xs text-skin-text3 text-center py-8">Memuat riwayat...</p>;
  }
  if (items.length === 0) {
    return <p className="text-xs text-skin-text3 text-center py-8">Belum ada riwayat.</p>;
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-3">
      {items.map((item, i) => {
        const h = item.raw;
        const meta = getMeta(h.action);
        return (
          <div key={`h-${h.id ?? i}`} className="flex gap-2.5">
            <span
              className="shrink-0 w-2 h-2 rounded-full mt-1.5"
              style={{ backgroundColor: meta.color }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-skin-text">
                <span className="font-semibold">{h.user_name || h.user_email || "Sistem"}</span>{" "}
                — {meta.label}
              </p>
              <p className="text-[10px] text-skin-text4">
                {formatGroupDate(item.at)} · {formatTime(item.at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
