import { timLabel } from "../utils";

export default function KaryawanCard({ k, onEdit, onToggleAktif }) {
  return (
    <div className={`bg-skin-card border border-skin-bdr p-4 ${!k.aktif ? "opacity-50" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-editorial text-sm font-semibold text-skin-text truncate">{k.nama}</p>
          <p className="font-editorial text-xs text-skin-text3 mt-0.5">{timLabel(k.tim)}</p>
          {(k.no_rekening || k.nama_bank) && (
            <p className="font-editorial text-xs text-skin-text3 mt-1">
              {[k.nama_bank, k.no_rekening].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!k.aktif && (
            <span className="font-editorial text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 border border-skin-bdr text-skin-text4">
              non-aktif
            </span>
          )}
          <button
            onClick={() => onEdit(k)}
            className="text-skin-text3 hover:text-[#CAB170] transition font-editorial text-xs tracking-[0.12em] uppercase px-2 py-1 border border-skin-bdr hover:border-[#CAB170]"
          >
            Edit
          </button>
          <button
            onClick={() => onToggleAktif(k)}
            className="text-skin-text3 hover:text-skin-text transition font-editorial text-xs tracking-[0.12em] uppercase px-2 py-1 border border-skin-bdr"
          >
            {k.aktif ? "Non-aktifkan" : "Aktifkan"}
          </button>
        </div>
      </div>
    </div>
  );
}
