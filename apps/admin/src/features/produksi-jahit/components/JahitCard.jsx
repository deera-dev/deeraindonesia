import { cardWarnaLabel } from "../utils";

export default function JahitCard({ card, showKode = true, onUnassign, onMarkDone, onPrint, onReceive }) {
  const tukangPotong = card.produksi_batch?.tukang_potong_nama;

  return (
    <div className="bg-skin-card border border-skin-bdr p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        {showKode ? (
          <div className="min-w-0">
            <p className="font-semibold text-sm text-skin-text">{card.kode_produk}</p>
            <p className="text-xs text-skin-text3 truncate">{card.nama_produk}</p>
          </div>
        ) : (
          <div />
        )}
        <p className="shrink-0 text-xs font-semibold text-skin-accent-text">{card.qty} pcs</p>
      </div>

      <p className="text-xs text-skin-text2">
        {card.size} · {cardWarnaLabel(card.warna)}
      </p>

      {tukangPotong && (
        <p className="text-xs text-skin-text3">
          T.Potong: <span className="font-medium text-skin-text2">{tukangPotong}</span>
        </p>
      )}

      {card.karyawan_nama && (
        <p className="text-xs text-skin-text3">
          Penjahit: <span className="font-medium text-skin-text2">{card.karyawan_nama}</span>
        </p>
      )}

      {onPrint && (
        <button
          type="button"
          onClick={() => onPrint(card)}
          className="w-full py-1.5 text-[11px] font-editorial tracking-[0.1em] uppercase text-skin-text2 border border-skin-bdr hover:border-skin-accent hover:text-skin-accent-text transition"
        >
          🖶 Cetak Kartu
        </button>
      )}

      {onReceive && card.status !== "ready_finishing" && (
        <button
          type="button"
          onClick={() => onReceive(card)}
          className="w-full py-1.5 text-[11px] font-editorial tracking-[0.1em] uppercase text-skin-accent-text border border-skin-accent/50 hover:bg-skin-accent/10 transition"
        >
          ✓ Terima tanpa scan
        </button>
      )}

      {card.status === "ready_finishing" && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-editorial tracking-[0.1em] uppercase text-emerald-500">
            ✓ Sudah diterima
          </p>
          <button
            type="button"
            onClick={() => onMarkDone(card)}
            className="w-full py-2 text-xs font-editorial tracking-[0.12em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition"
          >
            → Tandai Selesai
          </button>
          <button
            type="button"
            onClick={() => onUnassign(card)}
            className="text-[11px] font-editorial text-red-400 hover:text-red-500 transition"
          >
            ↩ Batalkan Terima
          </button>
        </div>
      )}
    </div>
  );
}
