/**
 * OverflowDialog.jsx — dialog konfirmasi: penambahan stok di pasar melebihi produksi,
 * selisihnya diambil dari gudang (rencana dihitung backend, komponen hanya menampilkan).
 */
export default function OverflowDialog({ kode, locLabel, plan, onConfirm, onCancel }) {
  const unresolved = (plan?.sizes ?? []).reduce((s, z) => s + Number(z.unresolved || 0), 0);
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true">
      <div className="bg-skin-card border-2 border-skin-bdr shadow-xl w-full max-w-md max-h-[90dvh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-skin-bdr-lt">
          <h2 className="font-headline text-skin-accent-text text-lg">Stok melebihi produksi</h2>
          <p className="text-xs text-skin-text3 mt-0.5">{kode} · {locLabel}</p>
        </div>
        <div className="p-4 space-y-3 text-sm text-skin-text2">
          <p>
            Stok tidak mungkin lebih banyak dari jumlah produksi. Kelebihannya akan <b>diambil dari stok gudang</b>{" "}
            (seperti transfer gudang → {locLabel}).
          </p>
          {plan.sizes.map((z) => (
            <div key={z.size} className="border border-skin-bdr-lt p-2.5 space-y-1" data-testid="overflow-size">
              <p className="text-xs uppercase tracking-wide text-skin-text3">
                {z.size} · produksi {z.produced} pcs · total jadi {z.total_after}
              </p>
              {z.adjustments.map((a) => (
                <p key={a.warna} className="text-sm">
                  {a.warna === "_" ? "Tanpa warna" : a.warna}: gudang{" "}
                  <span className="line-through text-red-400">{a.gudang_from}</span> →{" "}
                  <b className="text-skin-text">{a.gudang_to}</b>{" "}
                  <span className="text-skin-text3">(−{a.take})</span>
                </p>
              ))}
              {Number(z.unresolved) > 0 && (
                <p className="text-xs text-amber-500">Stok gudang tidak cukup, sisa {z.unresolved} pcs tetap melebihi produksi.</p>
              )}
            </div>
          ))}
          {unresolved > 0 && (
            <p className="text-xs text-amber-500">Periksa lagi hitungan atau catat produksinya bila memang bertambah.</p>
          )}
        </div>
        <div className="flex gap-2 p-4 border-t border-skin-bdr-lt">
          <button onClick={onCancel} className="flex-1 py-2.5 text-sm font-semibold uppercase tracking-[0.06em] border-2 border-skin-bdr text-skin-text3">
            Batal
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 text-sm font-bold uppercase tracking-[0.06em] bg-skin-accent text-skin-on-accent">
            Ya, ambil dari gudang
          </button>
        </div>
      </div>
    </div>
  );
}
