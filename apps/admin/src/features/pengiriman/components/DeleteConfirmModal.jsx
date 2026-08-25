/**
 * DeleteConfirmModal.jsx
 * Modal konfirmasi hapus pengiriman (pengganti window.confirm, lihat
 * CLAUDE.md §13 "Jangan gunakan window.confirm").
 *
 * Props:
 * - pengiriman : objek pengiriman
 * - onConfirm  : () => void
 * - onCancel   : () => void
 * - loading    : boolean
 */
export default function DeleteConfirmModal({ pengiriman, onConfirm, onCancel, loading }) {
  if (!pengiriman) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative bg-skin-card w-full max-w-sm mx-auto border-2 border-skin-bdr shadow-2xl overflow-hidden">
        <div className="bg-[#1A1918] px-4 py-3 flex items-center justify-between">
          <span className="text-sm tracking-[0.1em] uppercase text-white font-medium">
            Hapus Pengiriman
          </span>
          <button onClick={onCancel} className="text-white/60 hover:text-white transition text-xl">
            ✕
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0 bg-red-100 text-red-700">
              🗑
            </div>
            <div>
              <p className="font-mono font-bold text-[#CAB170] text-base">
                {pengiriman.pengiriman_no}
              </p>
              <p className="text-xs text-skin-text3">{pengiriman.nama_penerima}</p>
            </div>
          </div>

          <p className="text-sm text-skin-text2 leading-relaxed mb-4">
            Data pengiriman ini akan dihapus permanen dan tidak dapat dibatalkan.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="py-3 text-sm tracking-[0.08em] uppercase font-semibold text-skin-text3 border border-skin-bdr hover:text-skin-text hover:border-skin-text transition disabled:opacity-40"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="py-3 text-sm tracking-[0.08em] uppercase font-semibold text-white bg-red-600 hover:bg-red-700 transition disabled:opacity-40"
            >
              {loading ? "Menghapus..." : "Hapus"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
