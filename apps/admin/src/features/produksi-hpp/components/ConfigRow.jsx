import { fmtRp } from "../utils";

function fmtTanggal(iso) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return null;
  }
}

export default function ConfigRow({ row, onOpenEdit }) {
  const tanggal = fmtTanggal(row.updated_at);

  return (
    <button
      type="button"
      onClick={() => onOpenEdit(row)}
      className="w-full flex items-center justify-between gap-3 px-3 py-3 text-left hover:bg-skin-raised transition"
    >
      <div className="min-w-0">
        <p className="text-sm text-skin-text2">{row.label}</p>
        {row.keterangan && <p className="text-xs text-skin-text3 truncate">{row.keterangan}</p>}
        {tanggal && (
          <p className="text-[10px] text-skin-text4 mt-0.5">
            Diubah {tanggal}
            {row.updated_by ? ` · ${row.updated_by}` : ""}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-sm font-semibold text-skin-accent-text">{fmtRp(row.nilai)}</span>
        <span className="text-skin-text4">›</span>
      </div>
    </button>
  );
}
