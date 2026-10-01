/**
 * ClearCartConfirm.jsx — Konfirmasi "Kosongkan Pesanan" (tombol di
 * CartPanel). Sejak cart dipersist (lihat ../store.js, fix kasus
 * "pesanan tidak hilang walau refresh/pindah tab"), mengosongkan cart
 * jadi tindakan yang DISENGAJA & permanen — makanya sekarang dikonfirmasi
 * dulu (permintaan Denny 2026-10: sebelumnya tombol ini langsung
 * mengosongkan tanpa konfirmasi, berisiko ke-tap gasengaja padahal
 * pesanan sudah susah payah diisi). Pola sama seperti DeleteConfirm.jsx
 * (features/laporan) — CLAUDE.md §13: dilarang pakai window.confirm.
 */
export default function ClearCartConfirm({ itemCount, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full border-t-2 md:border-2 border-skin-bdr shadow-2xl px-6 py-6">
        <h3 className="text-2xl text-skin-text mb-2">Kosongkan Pesanan?</h3>
        <p className="text-base text-skin-text2 mb-6 leading-relaxed">
          {itemCount} jenis barang di keranjang akan dihapus semua. Tindakan ini{" "}
          <strong className="text-skin-text">tidak bisa dibatalkan</strong>.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            className="flex-1 py-5 bg-red-500 text-white text-base tracking-[0.12em] uppercase hover:bg-red-600 transition font-semibold"
          >
            Ya, Kosongkan
          </button>
          <button
            onClick={onClose}
            className="px-6 py-5 border-2 border-skin-bdr text-base text-skin-text2 uppercase hover:border-[#1A1918] transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
