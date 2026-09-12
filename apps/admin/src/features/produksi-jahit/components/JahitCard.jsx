/**
 * JahitCard.jsx — satu kartu kanban (kombinasi batch × size × warna).
 * Aksi yang tersedia beda-beda tergantung status (lihat STATUS_COLUMNS di
 * ../utils.js): belum_assign → buka AssignModal; on_progress → pindah ke
 * Ready Finishing atau batalkan assign; ready_finishing → kembali ke
 * On Progress (jaring pengaman kalau salah geser).
 */
import { cardWarnaLabel } from "../utils";

export default function JahitCard({ card, onAssign, onMoveToFinishing, onUnassign, onMoveBackToProgress, onMarkDone }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-skin-text">{card.kode_produk}</p>
          <p className="text-xs text-skin-text3 truncate">{card.nama_produk}</p>
        </div>
        <p className="shrink-0 text-xs font-semibold text-[#CAB170]">{card.qty} pcs</p>
      </div>

      <p className="text-xs text-skin-text2">
        {card.size} · {cardWarnaLabel(card.warna)}
      </p>

      {card.karyawan_nama && (
        <p className="text-xs text-skin-text3">
          Penjahit: <span className="font-medium text-skin-text2">{card.karyawan_nama}</span>
        </p>
      )}

      {card.status === "belum_assign" && (
        <button
          type="button"
          onClick={() => onAssign(card)}
          className="w-full py-2 text-xs font-editorial tracking-[0.12em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
        >
          + Penjahit
        </button>
      )}

      {card.status === "on_progress" && (
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={() => onMoveToFinishing(card)}
            className="w-full py-2 text-xs font-editorial tracking-[0.12em] uppercase text-white bg-emerald-500 hover:bg-emerald-600 transition"
          >
            → Ready Finishing
          </button>
          <button
            type="button"
            onClick={() => onUnassign(card)}
            className="text-[11px] font-editorial text-red-400 hover:text-red-500 transition"
          >
            Batalkan assign
          </button>
        </div>
      )}

      {card.status === "ready_finishing" && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-editorial tracking-[0.1em] uppercase text-emerald-500">
            ✓ Sudah disetor
          </p>
          <button
            type="button"
            onClick={() => onMarkDone(card)}
            className="w-full py-2 text-xs font-editorial tracking-[0.12em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
          >
            → Tandai Selesai
          </button>
          <button
            type="button"
            onClick={() => onMoveBackToProgress(card)}
            className="text-[11px] font-editorial text-skin-text3 hover:text-skin-text transition"
          >
            ↩ Kembali ke On Progress
          </button>
        </div>
      )}
    </div>
  );
}
