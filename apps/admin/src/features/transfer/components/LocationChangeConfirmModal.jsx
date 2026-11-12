// Saran admin (November 2026): "setiap ganti dari dan ke nya kalau
// valuenya sudah ada dan mau diubah lagi, ada dialognya dulu" — dropdown
// lokasi gampang ke-klik tidak sengaja (apalagi di HP), bisa diam2 ganti
// lokasi padahal barang sudah dipilih. Dipakai dari TransferForm.jsx,
// bukan window.confirm (lihat CLAUDE.md §13).
export default function LocationChangeConfirmModal({ title, description, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative bg-skin-card w-full max-w-sm mx-auto border-2 border-skin-bdr shadow-2xl overflow-hidden">
        <div className="bg-skin-header px-4 py-3 flex items-center justify-between">
          <span className="text-sm tracking-[0.1em] uppercase text-white font-medium">{title}</span>
          <button onClick={onCancel} className="text-white/60 hover:text-white transition text-xl">
            ✕
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-skin-text2 leading-relaxed mb-4">{description}</p>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onCancel}
              className="py-3 text-sm tracking-[0.08em] uppercase font-semibold text-skin-text3 border border-skin-bdr hover:text-skin-text hover:border-skin-text transition"
            >
              Batal
            </button>
            <button
              onClick={onConfirm}
              className="py-3 text-sm tracking-[0.08em] uppercase font-semibold text-white bg-skin-accent hover:bg-skin-accent-hover transition"
            >
              Ya, Ganti
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
