// Saran admin (November 2026): "Tambahkan popup konfirmasi logout ketika
// button keluar dipencet" — sebelumnya tombol Keluar di admin & pos langsung
// signOut() tanpa konfirmasi, rawan ke-klik tidak sengaja. Dipakai bareng
// oleh apps/admin & apps/pos (bukan window.confirm, lihat CLAUDE.md §13).
export default function LogoutConfirmModal({ open, onConfirm, onCancel, loading }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative bg-skin-card w-full max-w-sm mx-auto border-2 border-skin-bdr shadow-2xl overflow-hidden">
        <div className="bg-skin-header px-4 py-3 flex items-center justify-between">
          <span className="text-sm tracking-[0.1em] uppercase text-white font-medium">
            Keluar dari Akun?
          </span>
          <button onClick={onCancel} className="text-white/60 hover:text-white transition text-xl">
            ✕
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-skin-text2 leading-relaxed mb-4">
            Kamu akan keluar dari akun ini dan diarahkan kembali ke halaman login.
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
              {loading ? "Keluar..." : "Ya, Keluar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
