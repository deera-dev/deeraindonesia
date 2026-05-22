/**
 * EditSaleModal.jsx
 * Modal untuk mengedit transaksi yang sudah ada.
 *
 * Fitur:
 * - Hapus item dari transaksi
 * - Ubah harga satuan per item
 * - Ubah pembeli (nama + no HP)
 * - Ubah diskon (nominal)
 * - Total dihitung ulang otomatis
 *
 * Props:
 * - sale    : objek transaksi yang akan diedit
 * - onClose : () => void
 * - onSave  : (updatedSale) => void
 *
 * Catatan stok: saat ini perubahan item TIDAK otomatis membalikkan stok.
 * Tim direkomendasikan untuk melakukan stock opname terpisah jika ada perbedaan.
 */
import { useState } from "react";
import { formatHarga } from "@deera/shared/lib/constants";

function effectiveQty(item) {
  return item.warna
    ? item.warna.reduce((s, w) => s + w.qty, 0)
    : (item.qty ?? 0);
}

export default function EditSaleModal({ sale, onClose, onSave }) {
  const [items,      setItems]      = useState(() => (sale.items ?? []).map(i => ({ ...i })));
  const [buyerName,  setBuyerName]  = useState(sale.buyer_name ?? "");
  const [buyerHp,    setBuyerHp]    = useState(sale.buyer_hp   ?? "");
  const [discount,   setDiscount]   = useState(String(sale.discount ?? 0));
  const [editingHarga, setEditingHarga] = useState(null); // idx item yang sedang diedit harga
  const [hargaInput,   setHargaInput]   = useState("");
  const [saving,     setSaving]     = useState(false);
  const [note,       setNote]       = useState("");

  const discountNum = parseInt(discount.replace(/\D/g, ""), 10) || 0;
  const subtotal    = items.reduce((s, item) => s + effectiveQty(item) * item.harga, 0);
  const total       = Math.max(0, subtotal - discountNum);

  function removeItem(idx) {
    if (items.length === 1) {
      alert("Minimal 1 produk harus ada dalam transaksi.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function startEditHarga(idx) {
    setEditingHarga(idx);
    setHargaInput(String(items[idx].harga));
  }

  function saveHarga(idx) {
    const val = parseInt(hargaInput.replace(/\D/g, ""), 10);
    if (!isNaN(val) && val > 0) {
      setItems((prev) => prev.map((item, i) => i === idx ? { ...item, harga: val } : item));
    }
    setEditingHarga(null);
  }

  async function handleSave() {
    if (!note.trim()) {
      alert("Isi catatan alasan edit terlebih dahulu (untuk audit trail).");
      return;
    }
    setSaving(true);
    await onSave({
      ...sale,
      items,
      buyer_name: buyerName || null,
      buyer_hp:   buyerHp   || null,
      discount: discountNum,
      _editNote: note,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-white w-full max-w-md mx-auto border-t-2 md:border-2 border-[#E8E3DC] shadow-2xl flex flex-col max-h-[92dvh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-[#E8E3DC] flex-shrink-0">
          <h3 className="text-xl text-[#1A1918] font-semibold">Edit Transaksi</h3>
          <button onClick={onClose} className="text-[#9C9690] hover:text-[#1A1918] text-2xl leading-none">✕</button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">

          {/* ── Items ── */}
          <section>
            <p className="text-sm text-[#9C9690] uppercase tracking-[0.12em] font-semibold mb-3">Produk</p>
            <div className="space-y-2">
              {items.map((item, idx) => {
                const qty  = effectiveQty(item);
                const line = qty * item.harga;
                return (
                  <div key={idx} className="bg-[#F9F7F4] border-2 border-[#E8E3DC] p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[#1A1918]">{item.kode} — {item.size}</p>
                        <p className="text-sm text-[#6B6560] mt-0.5">{qty} pcs</p>
                      </div>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-red-500 hover:text-red-700 text-xl leading-none flex-shrink-0 p-1"
                        title="Hapus item"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Harga edit */}
                    {editingHarga === idx ? (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-[#9C9690]">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoFocus
                          value={hargaInput}
                          onChange={(e) => setHargaInput(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => { if (e.key === "Enter") saveHarga(idx); if (e.key === "Escape") setEditingHarga(null); }}
                          className="flex-1 border-2 border-[#CAB170] px-3 py-2 text-base text-[#1A1918] focus:outline-none"
                        />
                        <button onClick={() => saveHarga(idx)} className="bg-[#CAB170] text-white px-3 py-2 text-sm font-semibold">✓</button>
                        <button onClick={() => setEditingHarga(null)} className="border-2 border-[#E8E3DC] text-[#6B6560] px-3 py-2 text-sm">✕</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-base text-[#CAB170] font-semibold">Rp {formatHarga(item.harga)} /pcs</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-[#1A1918] font-bold">= Rp {formatHarga(line)}</p>
                          <button
                            onClick={() => startEditHarga(idx)}
                            className="text-xs text-[#CAB170] border border-[#EDD9A3] bg-[#FDF5E6] px-2 py-1 hover:bg-[#EDD9A3] transition"
                          >
                            Ubah harga
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Pembeli ── */}
          <section>
            <p className="text-sm text-[#9C9690] uppercase tracking-[0.12em] font-semibold mb-3">Pembeli</p>
            <div className="space-y-2">
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Nama pembeli (opsional)"
                className="w-full border-2 border-[#E8E3DC] px-4 py-3 text-base focus:outline-none focus:border-[#CAB170] transition"
              />
              <input
                type="tel"
                value={buyerHp}
                onChange={(e) => setBuyerHp(e.target.value)}
                placeholder="No HP (opsional)"
                className="w-full border-2 border-[#E8E3DC] px-4 py-3 text-base focus:outline-none focus:border-[#CAB170] transition"
              />
            </div>
          </section>

          {/* ── Diskon ── */}
          <section>
            <p className="text-sm text-[#9C9690] uppercase tracking-[0.12em] font-semibold mb-3">Diskon</p>
            <div className="flex items-center gap-2">
              <span className="text-base text-[#6B6560]">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={discount}
                onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="flex-1 border-2 border-[#E8E3DC] px-4 py-3 text-base focus:outline-none focus:border-[#CAB170] transition"
              />
            </div>
          </section>

          {/* ── Ringkasan total ── */}
          <section className="bg-[#F9F7F4] border-2 border-[#E8E3DC] p-4 space-y-2">
            <div className="flex justify-between text-base text-[#6B6560]">
              <span>Subtotal</span>
              <span>Rp {formatHarga(subtotal)}</span>
            </div>
            {discountNum > 0 && (
              <div className="flex justify-between text-base text-[#6B6560]">
                <span>Diskon</span>
                <span>- Rp {formatHarga(discountNum)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-[#1A1918] pt-2 border-t border-[#E8E3DC]">
              <span>Total</span>
              <span style={{ fontFamily: "'Braise', serif" }}>Rp {formatHarga(total)}</span>
            </div>
          </section>

          {/* ── Catatan audit ── */}
          <section>
            <p className="text-sm text-[#9C9690] uppercase tracking-[0.12em] font-semibold mb-2">
              Alasan Edit <span className="text-red-500">*</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: salah input harga, tambah pembeli..."
              rows={2}
              className="w-full border-2 border-[#E8E3DC] px-4 py-3 text-base focus:outline-none focus:border-[#CAB170] transition resize-none"
            />
            <p className="text-xs text-[#9C9690] mt-1">Catatan ini disimpan sebagai riwayat audit.</p>
          </section>
        </div>

        {/* Footer aksi */}
        <div className="flex gap-3 p-4 border-t-2 border-[#E8E3DC] flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-4 bg-[#CAB170] text-white text-base tracking-[0.1em] uppercase font-semibold hover:bg-[#A8925A] transition disabled:opacity-40"
          >
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-4 border-2 border-[#E8E3DC] text-[#6B6560] text-base uppercase hover:border-[#1A1918] transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
