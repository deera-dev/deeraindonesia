/**
 * WarnaPanel.jsx
 * Bottom sheet (mobile) / modal (desktop) untuk memilih warna dan qty
 * sebelum menambahkan produk ke keranjang.
 *
 * Props:
 * - warnaPanel   : { product, variant } — data produk yang sedang dipilih
 * - selectedWarna: { [warnaName]: qty } — pilihan saat ini
 * - location     : string — lokasi pasar (untuk tampilkan stok)
 * - onClose      : () => void
 * - onConfirm    : () => void — panggil confirmWarna dari useCart
 * - onSelectAll  : () => void — panggil selectFullSeri dari useCart
 * - onReset      : () => void — reset selectedWarna ke {}
 * - onSetWarna   : (name, qty) => void — update qty satu warna
 */
import { formatHarga } from "@deera/shared/lib/constants";
import { getMarketLabel } from "@deera/shared/lib/marketDay";
import { getStokWarna } from "../../lib/salesUtils";

export default function WarnaPanel({
  warnaPanel,
  selectedWarna,
  location,
  onClose,
  onConfirm,
  onSelectAll,
  onReset,
  onSetWarna,
}) {
  if (!warnaPanel) return null;
  const { product, variant } = warnaPanel;
  const locLabel = getMarketLabel(location);

  const totalDipilih = Object.values(selectedWarna).reduce((s, q) => s + q, 0);
  const totalRp = totalDipilih * variant.harga;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/55" onClick={onClose} />

      <div className="relative bg-white w-full md:w-[460px] md:max-h-[90vh] overflow-y-auto border-t-2 md:border-2 border-[#E8E3DC] shadow-2xl">

        {/* Header sticky */}
        <div className="px-5 py-4 border-b-2 border-[#E8E3DC] flex items-start justify-between sticky top-0 bg-white z-10">
          <div>
            <p className="text-2xl text-[#CAB170] leading-none" style={{ fontFamily: "'Braise', serif" }}>
              {product.kode}
            </p>
            <p className="text-base text-[#6B6560] mt-1">
              {variant.size} · <strong>Rp {formatHarga(variant.harga)}</strong> / warna
            </p>
            <p className="text-sm text-[#9C9690] mt-0.5">
              HPP Rp {formatHarga(product.hpp)} · Stok di {locLabel}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-12 h-12 flex items-center justify-center text-[#9C9690] hover:text-[#1A1918] text-3xl leading-none"
            aria-label="Tutup"
          >
            ×
          </button>
        </div>

        {/* Tombol Seri Penuh + Reset */}
        <div className="px-5 pt-4 pb-3 flex gap-2">
          <button
            onClick={onSelectAll}
            className="flex-1 py-4 bg-[#FDF5E6] border-2 border-[#EDD9A3] text-base tracking-[0.08em] uppercase text-[#A8925A] hover:bg-[#CAB170] hover:text-white hover:border-[#CAB170] transition font-medium"
          >
            Seri Penuh ({product.warna.length} warna)
          </button>
          <button
            onClick={onReset}
            className="px-5 py-4 border-2 border-[#E8E3DC] text-base text-[#6B6560] hover:border-red-300 hover:text-red-500 transition"
          >
            Reset
          </button>
        </div>

        {/* List warna */}
        <div className="px-5 pb-2 space-y-2">
          {product.warna.map((w) => {
            const qty = selectedWarna[w] ?? 0;
            const isSelected = qty > 0;
            const stok = getStokWarna(product, variant.size, w, location);

            return (
              <div
                key={w}
                className={`border-2 transition rounded-sm ${
                  isSelected ? "border-[#CAB170] bg-[#FDF5E6]" : "border-[#E8E3DC] bg-white"
                }`}
              >
                <div className="flex items-center px-4 py-3 gap-3">
                  {/* Checkbox + nama warna */}
                  <button
                    onClick={() => onSetWarna(w, isSelected ? 0 : 1)}
                    className="flex items-center gap-3 flex-1 text-left min-w-0"
                  >
                    <div
                      className={`w-7 h-7 border-2 flex items-center justify-center flex-shrink-0 transition ${
                        isSelected ? "border-[#CAB170] bg-[#CAB170]" : "border-[#C8C4C0]"
                      }`}
                    >
                      {isSelected && <span className="text-white text-base font-bold leading-none">✓</span>}
                    </div>
                    <div className="min-w-0">
                      <span className={`text-base transition ${isSelected ? "text-[#1A1918] font-semibold" : "text-[#6B6560]"}`}>
                        {w}
                      </span>
                      <span className={`block text-sm mt-0.5 ${stok === 0 ? "text-red-600 font-semibold" : "text-[#6B6560]"}`}>
                        Stok: {stok} pcs
                      </span>
                    </div>
                  </button>

                  {/* Qty stepper (tampil jika dipilih) */}
                  {isSelected && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => onSetWarna(w, Math.max(0, qty - 1))}
                        className="w-12 h-12 border-2 border-[#E8E3DC] text-2xl text-[#6B6560] hover:border-red-300 hover:text-red-500 transition flex items-center justify-center"
                        aria-label="Kurangi"
                      >
                        −
                      </button>
                      <span className="text-xl font-bold text-[#1A1918] w-8 text-center">{qty}</span>
                      <button
                        onClick={() => onSetWarna(w, qty + 1)}
                        className="w-12 h-12 border-2 border-[#E8E3DC] text-2xl text-[#6B6560] hover:border-[#CAB170] hover:text-[#CAB170] transition flex items-center justify-center"
                        aria-label="Tambah"
                      >
                        +
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer sticky: total + tombol konfirmasi */}
        <div className="px-5 pb-6 pt-3 border-t-2 border-[#E8E3DC] mt-2 sticky bottom-0 bg-white">
          <div className="flex justify-between items-center mb-4">
            <span className="text-base text-[#6B6560]">
              {totalDipilih} warna dipilih
            </span>
            <span className="text-2xl text-[#1A1918] leading-none" style={{ fontFamily: "'Braise', serif" }}>
              {totalDipilih > 0 ? `Rp ${formatHarga(totalRp)}` : "—"}
            </span>
          </div>
          <button
            onClick={onConfirm}
            disabled={totalDipilih === 0}
            className="w-full py-5 bg-[#CAB170] text-white text-lg tracking-[0.2em] uppercase hover:bg-[#A8925A] transition disabled:opacity-40 disabled:cursor-not-allowed font-medium"
          >
            Tambah ke Pesanan
          </button>
        </div>
      </div>
    </div>
  );
}
