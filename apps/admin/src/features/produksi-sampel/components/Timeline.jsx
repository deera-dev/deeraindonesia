/**
 * Timeline.jsx — Riwayat gabungan (histori status/edit + komentar) per
 * Planning, dalam satu alur kronologis (permintaan Denny 2026-09: "intinya
 * bisa membantu untuk planing" — opsi "Timeline lengkap" yang dipilih saat
 * diskusi fitur). Dipakai di dalam PlanningDetailModal.jsx (tab "Riwayat").
 *
 * Sumber data: `product_history` (via useHistoryByKode dari fitur history,
 * di-query pakai `sampel.nomor` — history sampel dicatat dengan kode=nomor,
 * lihat produksi-sampel/api.js) + `sampel_comments` (via useComments).
 * Digabung & diurutkan pakai buildTimeline() di utils.js.
 */
import { useHistoryByKode } from "../../history";
import { useComments } from "../hooks";
import { buildTimeline, formatDisplayName } from "../utils";
import { formatGroupDate, formatTime, getMeta } from "../../history/utils";

export default function Timeline({ sampel }) {
  const { history, loading: historyLoading } = useHistoryByKode(sampel.nomor);
  const { comments, loading: commentsLoading } = useComments(sampel.id);
  const items = buildTimeline(history, comments);
  const loading = historyLoading || commentsLoading;

  if (loading) {
    return <p className="text-xs text-skin-text3 text-center py-8">Memuat riwayat...</p>;
  }
  if (items.length === 0) {
    return <p className="text-xs text-skin-text3 text-center py-8">Belum ada riwayat.</p>;
  }

  return (
    <div className="h-full overflow-y-auto px-4 py-3 space-y-3">
      {items.map((item, i) => {
        if (item.type === "history") {
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
        }

        const c = item.raw;
        const preview = c.text
          ? c.text.length > 60
            ? `${c.text.slice(0, 60)}…`
            : c.text
          : c.image_url
          ? "(mengirim foto)"
          : "";
        return (
          <div key={`c-${c.id}`} className="flex gap-2.5">
            <span className="shrink-0 w-2 h-2 rounded-full mt-1.5 bg-sky-500" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-skin-text">
                <span className="font-semibold">{formatDisplayName(c.user_name || c.user_email)}</span>{" "}
                berkomentar
                {preview && <>: “{preview}”</>}
              </p>
              <p className="text-[10px] text-skin-text4">
                {formatGroupDate(c.created_at)} · {formatTime(c.created_at)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
