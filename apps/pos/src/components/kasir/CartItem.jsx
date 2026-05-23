/**
 * CartItem.jsx
 * Satu baris item di dalam panel keranjang belanja.
 * Menampilkan kode, ukuran, harga (bisa diedit), qty atau list warna.
 *
 * Props:
 * - item           : cart item object
 * - isEditingPrice : boolean — apakah harga item ini sedang diedit
 * - onEditPrice    : () => void — mulai edit harga
 * - onSavePrice    : (newHarga) => void
 * - onCancelPrice  : () => void
 * - onUpdateQty    : (delta) => void — untuk item simple
 * - onRemove       : () => void
 * - onEditWarna    : () => void — buka warna panel untuk edit
 */
import { formatHarga } from "@deera/shared/lib/constants";
import { effectiveQty } from "../../lib/salesUtils";
import PriceEditor from "./PriceEditor";

export default function CartItem({
  item,
  isEditingPrice,
  onEditPrice,
  onSavePrice,
  onCancelPrice,
  onUpdateQty,
  onRemove,
  onEditWarna,
}) {
  const qty = effectiveQty(item);

  return (
    <div className="p-4 bg-skin-page border border-skin-bdr">

      {/* Baris atas: kode + harga + tombol hapus */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          {/* Kode & ukuran */}
          <p className="text-base font-semibold text-skin-text leading-tight">
            {item.kode} <span className="text-skin-text2">— {item.size}</span>
          </p>

          {/* Harga — tap untuk edit */}
          {!isEditingPrice ? (
            <button
              onClick={onEditPrice}
              className="flex items-center gap-1.5 mt-1 group"
              title="Tap untuk ubah harga"
            >
              <span className="text-base text-[#CAB170] font-semibold border-b border-dashed border-[#CAB170]/50 group-hover:border-[#CAB170] transition">
                Rp {formatHarga(item.harga)}
              </span>
              <span className="text-xs text-skin-text4 group-hover:text-[#CAB170] transition">
                ✎ ubah
              </span>
            </button>
          ) : (
            <PriceEditor
              harga={item.harga}
              onSave={onSavePrice}
              onCancel={onCancelPrice}
            />
          )}
        </div>

        {/* Tombol hapus */}
        <button
          onClick={onRemove}
          className="w-11 h-11 border-2 border-skin-bdr flex items-center justify-center text-skin-text4 hover:border-red-300 hover:text-red-500 transition text-2xl leading-none flex-shrink-0"
          aria-label="Hapus item"
        >
          ×
        </button>
      </div>

      {/* Item warna: tampilkan daftar warna yang dipilih */}
      {item.warna ? (
        <div className="space-y-1.5 mb-3">
          {item.warna.map((w, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-skin-text2">{w.nama} ×{w.qty}</span>
              <span className="text-skin-text font-medium">Rp {formatHarga(w.qty * item.harga)}</span>
            </div>
          ))}
        </div>
      ) : (
        /* Item simple: stepper qty */
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={() => onUpdateQty(-1)}
            className="w-12 h-12 border-2 border-skin-bdr text-2xl text-skin-text2 hover:border-red-300 hover:text-red-500 transition flex items-center justify-center"
            aria-label="Kurangi"
          >
            −
          </button>
          <span className="text-xl font-bold text-skin-text w-8 text-center">{item.qty}</span>
          <button
            onClick={() => onUpdateQty(+1)}
            className="w-12 h-12 border-2 border-skin-bdr text-2xl text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition flex items-center justify-center"
            aria-label="Tambah"
          >
            +
          </button>
        </div>
      )}

      {/* Baris bawah: total item + tombol ubah warna */}
      <div className="flex items-center justify-between pt-2.5 border-t border-skin-bdr">
        <span className="text-sm text-skin-text2">
          {qty} pcs · <strong className="text-skin-text">Rp {formatHarga(qty * item.harga)}</strong>
        </span>
        {item.warna && (
          <button
            onClick={onEditWarna}
            className="text-sm text-[#CAB170] hover:text-[#A8925A] transition uppercase tracking-[0.08em] py-1 px-2"
          >
            Ubah Warna
          </button>
        )}
      </div>
    </div>
  );
}
