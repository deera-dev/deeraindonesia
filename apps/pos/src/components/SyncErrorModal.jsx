/**
 * SyncErrorModal.jsx
 * Modal yang muncul saat sync gagal — menjelaskan situasi & opsi kasir.
 * Data transaksi tetap aman di IndexedDB, akan sync ulang saat online.
 */

export default function SyncErrorModal({ error, onClose, onRetry, retrying }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-sm border-t-2 md:border-2 border-skin-bdr shadow-2xl px-6 py-6">

        <h3 className="text-2xl text-skin-text mb-2">
          Sync Gagal
        </h3>
        <p className="text-base text-skin-text2 mb-2 leading-relaxed">
          Transaksi <strong className="text-skin-text">tetap tersimpan</strong> di perangkat dan akan otomatis sync saat koneksi pulih.
        </p>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 mt-3 mb-3 font-mono break-all">
            {error}
          </p>
        )}

        <p className="text-base text-skin-text2 mb-6 leading-relaxed">
          Pastikan koneksi internet stabil, lalu tekan <strong>Coba Lagi</strong>.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onRetry}
            disabled={retrying}
            className="flex-1 py-5 bg-[#CAB170] text-white text-base tracking-[0.12em] uppercase hover:bg-[#A8925A] transition disabled:opacity-40 font-semibold"
          >
            {retrying ? "Mencoba..." : "Coba Lagi"}
          </button>
          <button
            onClick={onClose}
            className="px-6 py-5 border-2 border-skin-bdr text-base text-skin-text2 uppercase hover:border-[#1A1918] transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
