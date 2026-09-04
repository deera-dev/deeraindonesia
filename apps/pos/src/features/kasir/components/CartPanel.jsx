/**
 * CartPanel.jsx
 * Panel keranjang belanja — tampil di kanan (desktop) atau fullscreen (mobile).
 */
import { formatHarga } from "@deera/shared/lib/constants";
import CartItem from "./CartItem";
import BuyerInput from "./BuyerInput";

export default function CartPanel({
  cart,
  subtotal,
  diskon,
  total,
  totalItems,
  editingPrice,
  buyerName,
  buyerHp,
  pelangganId,
  onBuyerNameChange,
  onBuyerSelect,
  showDiskon,
  diskonInput,
  diskonMode,
  onToggleDiskon,
  onRemoveDiskon,
  onDiskonInputChange,
  onDiskonModeChange,
  onSetEditingPrice,
  onSavePrice,
  onUpdateQty,
  onRemoveItem,
  onEditWarnaItem,
  onReset,
  onClose,
  saving,
  onBayar,
  // Tukar Tambah (permintaan Denny 2026-09) — `total` di atas SUDAH bersih
  // (dihitung KasirPage: total beli baru − exchange.total) kalau `exchange`
  // aktif, CartPanel sendiri tidak menghitung ulang. Entry point utk MEMULAI
  // & banner status + Batal SENGAJA tidak lagi di sini — dulu status cuma
  // kelihatan di panel Pesanan, bikin kasir tidak sadar ada Tukar Tambah
  // aktif kalau lagi lihat daftar produk saat pasar rame. Sekarang keduanya
  // di baris tersendiri yang SELALU kelihatan di KasirPage (permintaan Denny
  // 2026-09). CartPanel cuma menampilkan baris breakdown "Retur" di atas
  // Total (bagian dari rincian harga, bukan status/kontrol).
  exchange,
}) {
  return (
    <div className="flex flex-col h-full bg-skin-card">
      {/* Header panel */}
      <div className="px-4 py-3 border-b border-skin-bdr flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold tracking-[0.12em] text-skin-text2 uppercase">
            Pesanan
          </h2>
          {totalItems > 0 && (
            <span className="text-xs bg-[#CAB170] text-white font-bold px-2 py-0.5 rounded-full">
              {totalItems}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="md:hidden text-sm text-skin-text3 hover:text-[#CAB170] transition px-2 py-1"
        >
          ← Produk
        </button>
      </div>

      {/* List item */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {cart.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-3xl text-[#E8E3DC] mb-3">◻</p>
            <p className="text-sm text-skin-text4 tracking-wide">Belum ada pesanan</p>
            <p className="text-xs text-skin-text4 mt-1">Tap produk untuk menambahkan</p>
          </div>
        )}
        {cart.map((item) => (
          <CartItem
            key={item.key}
            item={item}
            isEditingPrice={editingPrice === item.key}
            onEditPrice={() => onSetEditingPrice(item.key)}
            onSavePrice={(v) => onSavePrice(item.key, v)}
            onCancelPrice={() => onSetEditingPrice(null)}
            onUpdateQty={(delta) => onUpdateQty(item.key, delta)}
            onRemove={() => onRemoveItem(item.key)}
            onEditWarna={() => onEditWarnaItem(item)}
          />
        ))}
      </div>

      {/* Footer: pembeli + diskon + total + bayar */}
      <div className="border-t border-skin-bdr px-3 pt-2.5 pb-3 space-y-2 flex-shrink-0">
        {/* Row 1: Buyer + diskon toggle icon */}
        <div className="flex items-center gap-1.5">
          <div className="flex-1 min-w-0">
            <BuyerInput
              value={buyerName}
              onChange={onBuyerNameChange}
              onSelect={onBuyerSelect}
              disabled={saving}
            />
          </div>
          <button
            onClick={showDiskon ? onRemoveDiskon : onToggleDiskon}
            title={showDiskon ? "Hapus diskon" : "Tambah diskon"}
            className={`flex-shrink-0 w-10 h-10 border-2 transition flex items-center justify-center text-sm font-bold ${
              showDiskon
                ? "border-green-500 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/50"
                : "border-skin-bdr text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170]"
            }`}
          >
            %
          </button>
        </div>

        {/* Diskon expanded */}
        {showDiskon && (
          <DiskonInput
            diskonInput={diskonInput}
            diskonMode={diskonMode}
            diskon={diskon}
            onInputChange={onDiskonInputChange}
            onModeChange={onDiskonModeChange}
            onRemove={onRemoveDiskon}
          />
        )}

        {/* Subtotal + diskon (only when diskon active) */}
        {diskon > 0 && (
          <div className="space-y-0.5 text-sm">
            <div className="flex justify-between text-skin-text3">
              <span>Subtotal</span>
              <span>Rp {formatHarga(subtotal)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Diskon</span>
              <span>− Rp {formatHarga(diskon)}</span>
            </div>
          </div>
        )}

        {/* Retur (Tukar Tambah aktif) — total di bawah SUDAH bersih, baris ini
            cuma penjelas dari mana potongannya */}
        {exchange && (
          <div className="flex justify-between text-sm text-orange-500">
            <span>Retur</span>
            <span>− Rp {formatHarga(exchange.total)}</span>
          </div>
        )}

        {/* Total — right aligned */}
        <div className="pt-1 border-t border-skin-bdr-lt text-right">
          <p className="text-[10px] text-skin-text3 uppercase tracking-[0.15em] font-semibold leading-none mb-0.5">Total</p>
          <p className="text-2xl text-skin-text leading-none font-headline">
            {formatHarga(total) || "0"}
          </p>
        </div>

        {/* Kosongkan — kecil di atas Bayar, rata kanan */}
        {cart.length > 0 && (
          <div className="text-right -mb-1">
            <button
              onClick={onReset}
              className="text-xs text-skin-text4 hover:text-red-400 transition tracking-wide uppercase"
            >
              Kosongkan pesanan
            </button>
          </div>
        )}

        {/* Bayar full-width */}
        <button
          onClick={onBayar}
          disabled={!cart.length || saving}
          className="w-full py-3.5 bg-[#CAB170] text-white text-sm tracking-[0.2em] uppercase hover:bg-[#A8925A] active:bg-[#967D46] transition disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
        >
          {saving ? "..." : exchange ? "Proses Tukar Tambah" : "Bayar"}
        </button>
      </div>
    </div>
  );
}

// ── Diskon input ──────────────────────────────────────────────────────────────
function DiskonInput({ diskonInput, diskonMode, diskon, onInputChange, onModeChange, onRemove }) {
  return (
    <div className="bg-skin-card border border-skin-bdr p-3 space-y-2.5 rounded-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-skin-text3 uppercase tracking-[0.12em] font-semibold">
          Diskon
        </span>
        <button
          onClick={onRemove}
          className="text-xs text-skin-text4 hover:text-red-400 transition"
        >
          Hapus
        </button>
      </div>
      <div className="flex gap-2">
        <div className="flex border border-skin-bdr overflow-hidden rounded-sm flex-shrink-0">
          <button
            onClick={() => onModeChange("rp")}
            className={`px-3 py-2.5 text-sm font-medium transition ${diskonMode === "rp" ? "bg-[#CAB170] text-white" : "bg-skin-card text-skin-text2"}`}
          >
            Rp
          </button>
          <button
            onClick={() => onModeChange("persen")}
            className={`px-3 py-2.5 text-sm font-medium transition border-l border-skin-bdr ${diskonMode === "persen" ? "bg-[#CAB170] text-white" : "bg-skin-card text-skin-text2"}`}
          >
            %
          </button>
        </div>
        <input
          type="text"
          inputMode="numeric"
          value={diskonInput}
          onChange={(e) => onInputChange(e.target.value.replace(/\D/g, ""))}
          placeholder={diskonMode === "rp" ? "Jumlah diskon" : "Persentase"}
          className="flex-1 bg-skin-card border border-skin-bdr px-3 py-2.5 text-base text-skin-text text-right focus:outline-none focus:border-[#CAB170] transition rounded-sm"
        />
      </div>
      {diskon > 0 && (
        <p className="text-sm text-green-600 font-medium">Hemat Rp {formatHarga(diskon)}</p>
      )}
    </div>
  );
}
