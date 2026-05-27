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
      <div className="border-t border-skin-bdr px-4 pt-4 pb-5 space-y-3 flex-shrink-0">
        {/* Input nama pembeli */}
        <BuyerInput
          value={buyerName}
          onChange={onBuyerNameChange}
          onSelect={onBuyerSelect}
          disabled={saving}
        />

        {/* Diskon */}
        {!showDiskon ? (
          <button
            onClick={onToggleDiskon}
            className="w-full py-2.5 text-sm text-skin-text3 border border-dashed border-skin-bdr hover:border-[#CAB170] hover:text-[#CAB170] transition rounded-sm"
          >
            Tambah Diskon
          </button>
        ) : (
          <DiskonInput
            diskonInput={diskonInput}
            diskonMode={diskonMode}
            diskon={diskon}
            onInputChange={onDiskonInputChange}
            onModeChange={onDiskonModeChange}
            onRemove={onRemoveDiskon}
          />
        )}

        {/* Subtotal + diskon */}
        {diskon > 0 && (
          <div className="space-y-1 text-sm">
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

        {/* Total */}
        <div className="flex justify-between items-baseline pt-1 border-t border-skin-bdr-lt">
          <span className="text-xs text-skin-text3 uppercase tracking-[0.15em] font-semibold">
            Total
          </span>
          <span className="text-3xl text-skin-text leading-none">
            Rp {formatHarga(total) || "0"}
          </span>
        </div>

        {/* Tombol Bayar */}
        <button
          onClick={onBayar}
          disabled={!cart.length || saving}
          className="w-full py-5 bg-[#CAB170] text-white text-base tracking-[0.25em] uppercase hover:bg-[#A8925A] active:bg-[#967D46] transition disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
        >
          {saving ? "Menyimpan..." : "Bayar"}
        </button>

        {cart.length > 0 && (
          <button
            onClick={onReset}
            className="w-full py-2 text-xs text-skin-text4 hover:text-red-400 transition tracking-wide uppercase"
          >
            Kosongkan pesanan
          </button>
        )}
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
