import { fmtRp } from "../../../shared/lib/format";

/** EntryCard.jsx — Satu baris entri tim (nama, sub-info, jumlah, aksi edit/hapus). */
export default function EntryCard({ nama, sub, amount, onEdit, onDelete }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-skin-card border border-skin-bdr px-4 py-3">
      <div className="min-w-0">
        <p className="font-editorial text-sm text-skin-text truncate">{nama}</p>
        {sub && <p className="font-editorial text-xs text-skin-text3 truncate">{sub}</p>}
      </div>
      <div className="shrink-0 flex items-center gap-3">
        <span className="font-numeric text-sm text-skin-text2">{fmtRp(amount)}</span>
        <button onClick={onEdit} className="font-editorial text-xs tracking-[0.1em] uppercase text-skin-text3 hover:text-[#CAB170] transition">
          Edit
        </button>
        <button onClick={onDelete} className="font-editorial text-xs tracking-[0.1em] uppercase text-skin-text3 hover:text-red-500 transition">
          Hapus
        </button>
      </div>
    </div>
  );
}
