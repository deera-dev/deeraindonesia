export interface OrphanStokConfirmModalProps {
  entries: Array<[string, number]> | null | undefined;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export default function OrphanStokConfirmModal({
  entries,
  onConfirm,
  onCancel,
  loading,
}: OrphanStokConfirmModalProps) {
  if (!entries || entries.length === 0) return null;
  const totalQty = entries.reduce((s, [, qty]) => s + qty, 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 backdrop-blur-sm px-4">
      <div className="absolute inset-0" onClick={onCancel} />

      <div className="relative bg-skin-card w-full max-w-sm mx-auto border-2 border-skin-bdr shadow-2xl overflow-hidden">
        <div className="bg-red-700 px-4 py-3 flex items-center justify-between">
          <span className="text-sm tracking-[0.1em] uppercase text-white font-medium">
            Stok Akan Hilang
          </span>
          <button onClick={onCancel} className="text-white/60 hover:text-white transition text-xl">
            ✕
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-skin-text2 leading-relaxed mb-3">
            Warna berikut dihapus dari daftar tapi <strong>masih punya stok</strong>. Kalau
            dilanjutkan, data stok warna ini akan <strong>dihapus permanen</strong> (bukan cuma
            disembunyikan) — total <strong>{totalQty} pcs</strong>:
          </p>
          <ul className="mb-4 text-sm text-skin-text bg-skin-raised border border-skin-bdr px-3 py-2 space-y-1">
            {entries.map(([warna, qty]) => (
              <li key={warna} className="flex items-center justify-between">
                <span className="font-medium">{warna}</span>
                <span className="text-skin-text3">{qty} pcs</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-skin-text2 leading-relaxed mb-4">
            Kalau ini cuma salah ketik nama warna, <strong>batalkan dulu</strong> dan pakai tombol
            ganti nama warna (bukan hapus+tambah baru) supaya stoknya ikut pindah.
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
              {loading ? "Menyimpan..." : "Ya, Hapus & Simpan"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
