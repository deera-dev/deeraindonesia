/**
 * EditAddItemWarnaPicker.jsx
 * Panel pilih warna + qty saat menambahkan produk berwarna ke transaksi yang
 * sedang diedit (EditSaleModal). Meniru gaya WarnaPanel di Kasir, tapi lebih
 * sederhana: satu lokasi saja (lokasi transaksi), tanpa mode "Gabungan", dan
 * tanpa footer konfirmasi sendiri (tombol Tambahkan/Batal tetap di
 * EditSaleModal, sama seperti alur produk tanpa warna).
 *
 * Props:
 * - product   : object — produk terpilih (harus punya product.warna array)
 * - size      : string — size terpilih
 * - location  : string — lokasi transaksi (untuk baca stok)
 * - selected  : { [warnaName]: qty } — pilihan qty saat ini
 * - onSetQty  : (warnaName, qty) => void — set qty absolut satu warna
 * - onSelectAll: () => void — pilih semua warna (Seri Penuh), qty +1 dibatasi stok
 * - onReset   : () => void — reset semua pilihan ke 0
 */
import { getStokWarna } from "../../../shared/lib/salesUtils";

export default function EditAddItemWarnaPicker({
  product, size, location, selected, onSetQty, onSelectAll, onReset,
}) {
  const totalDipilih = Object.values(selected).reduce((s, q) => s + q, 0);
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button type="button" onClick={onSelectAll} className="flex-1 py-2 bg-skin-gold border border-skin-bdr-gold text-xs tracking-[0.06em] uppercase text-[#A8925A] hover:bg-[#CAB170] hover:text-white hover:border-[#CAB170] transition font-semibold">
          Seri Penuh ({product.warna.length} warna)
        </button>
        <button type="button" onClick={onReset} className="px-3 py-2 border border-skin-bdr text-xs text-skin-text2 hover:border-red-300 hover:text-red-500 transition">
          Reset
        </button>
      </div>
      <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
        {product.warna.map((w) => {
          const stok = getStokWarna(product, size, w, location);
          const qty = selected[w] ?? 0;
          const isSelected = qty > 0;
          const outOfStock = stok === 0;
          function toggle() {
            if (outOfStock) return;
            onSetQty(w, isSelected ? 0 : 1);
          }
          return (
            <div key={w} className={`border transition ${outOfStock ? "border-skin-bdr bg-skin-page opacity-50" : isSelected ? "border-[#CAB170] bg-skin-gold" : "border-skin-bdr bg-skin-card"}`}>
              <div className="flex items-center px-2.5 py-1.5 gap-2">
                <button type="button" onClick={toggle} disabled={outOfStock} className="flex items-center gap-2 flex-1 text-left min-w-0 disabled:cursor-not-allowed">
                  <div className={`w-5 h-5 border-2 flex items-center justify-center flex-shrink-0 transition ${isSelected ? "border-[#CAB170] bg-[#CAB170]" : "border-[#C8C4C0]"}`}>
                    {isSelected && <span className="text-white text-xs font-bold leading-none">✓</span>}
                  </div>
                  <div className="min-w-0 flex items-baseline gap-1.5">
                    <span className={`text-sm transition ${isSelected ? "text-skin-text font-semibold" : "text-skin-text2"}`}>{w}</span>
                    <span className={`text-xs ${outOfStock ? "text-red-600 font-semibold" : "text-skin-text3"}`}>{outOfStock ? "habis" : `${stok} pcs`}</span>
                  </div>
                </button>
                {isSelected && !outOfStock && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button type="button" onClick={() => onSetQty(w, Math.max(0, qty - 1))} className="w-7 h-7 border border-skin-bdr text-sm text-skin-text2 hover:border-red-300 hover:text-red-500 transition flex items-center justify-center" aria-label={`Kurangi ${w}`}>−</button>
                    <span className="text-sm font-bold text-skin-text w-6 text-center">{qty}</span>
                    <button type="button" onClick={() => onSetQty(w, Math.min(stok, qty + 1))} disabled={qty >= stok} className="w-7 h-7 border border-skin-bdr text-sm text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed" aria-label={`Tambah ${w}`}>+</button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-skin-text3">{totalDipilih > 0 ? `${totalDipilih} pcs dipilih` : "Pilih minimal satu warna"}</p>
    </div>
  );
}
