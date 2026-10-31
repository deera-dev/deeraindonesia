export default function ConfirmGroupDoneModal({ group, busy, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={busy ? undefined : onClose} />
      <div className="relative bg-skin-card w-full max-w-sm flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="shrink-0 flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt">
          <h2 className="font-editorial text-sm tracking-[0.18em] uppercase text-skin-text2">
            Tandai Selesai Semua
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-skin-text3 hover:text-skin-text text-xl leading-none transition"
          >
            ×
          </button>
        </div>
        <div className="p-4 space-y-2">
          <p className="text-sm text-skin-text">
            {group.kode} — {group.nama}
          </p>
          <p className="text-xs text-skin-text3">
            {group.cards.length} kartu ({group.totalQty} pcs) langsung dipindah ke Selesai tanpa
            scan. Pakai ini untuk kartu yang barangnya sudah jadi.
          </p>
        </div>
        <div className="shrink-0 border-t border-skin-bdr p-4 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="flex-1 py-3 font-editorial text-sm tracking-[0.15em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 py-3 font-editorial text-sm tracking-[0.15em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover disabled:opacity-50"
          >
            {busy ? "Menyimpan..." : "Ya, Selesai"}
          </button>
        </div>
      </div>
    </div>
  );
}
