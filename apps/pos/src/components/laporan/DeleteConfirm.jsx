/**
 * DeleteConfirm.jsx
 * Dialog konfirmasi hapus transaksi. Irreversible — stok dikembalikan.
 */

export default function DeleteConfirm({ sale, onClose, onConfirm, deleting }) {
  if (!sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-white w-full border-t-2 md:border-2 border-[#E8E3DC] shadow-2xl px-6 py-6">
        <h3
          className="text-2xl text-[#1A1918] mb-2"
          style={{ fontFamily: "'Braise', serif" }}
        >
          Hapus Transaksi?
        </h3>
        <p className="text-base text-[#6B6560] mb-6 leading-relaxed">
          Stok akan dikembalikan dan data transaksi dihapus permanen. Tindakan
          ini <strong className="text-[#1A1918]">tidak bisa dibatalkan</strong>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-5 bg-red-500 text-white text-base tracking-[0.12em] uppercase hover:bg-red-600 transition disabled:opacity-40 font-semibold"
          >
            {deleting ? "Menghapus..." : "Ya, Hapus"}
          </button>
          <button
            onClick={onClose}
            disabled={deleting}
            className="px-6 py-5 border-2 border-[#E8E3DC] text-base text-[#6B6560] uppercase hover:border-[#1A1918] transition disabled:opacity-40"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
