export default function OverflowConfirm({ kode, take, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="bg-skin-card border-2 border-skin-bdr shadow-xl w-full max-w-sm">
        <div className="p-4 space-y-1.5">
          <h2 className="font-headline text-skin-accent-text text-lg">Kurangi stok gudang?</h2>
          <p className="text-sm text-skin-text2">
            Stok {kode} melebihi produksi, jadi <b>{take} pcs</b> akan otomatis diambil dari gudang.
          </p>
        </div>
        <div className="flex gap-2 p-4 border-t border-skin-bdr-lt">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold uppercase tracking-[0.06em] border-2 border-skin-bdr text-skin-text3">
            Batal
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-bold uppercase tracking-[0.06em] bg-skin-accent text-skin-on-accent">
            Ya, lanjut
          </button>
        </div>
      </div>
    </div>
  );
}
