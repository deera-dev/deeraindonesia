/**
 * EditSaleModal.jsx
 * Modal untuk mengedit transaksi yang sudah ada.
 *
 * Fitur:
 * - Hapus item dari transaksi
 * - Ubah harga satuan per item
 * - Ubah qty per item (simple: stepper; warna: per-warna stepper)
 * - Ubah pembeli (nama + no HP, dengan autocomplete pelanggan)
 * - Ubah diskon (nominal)
 * - Total dihitung ulang otomatis
 */
import { useState, useMemo } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import BuyerInput from "../kasir/BuyerInput";
import { useProducts } from "../../hooks/useProducts";

function effectiveQty(item) {
  return Array.isArray(item.warna) ? item.warna.reduce((s, w) => s + (w.qty ?? 0), 0) : (item.qty ?? 0);
}

export default function EditSaleModal({ sale, onClose, onSave }) {
  const [items, setItems] = useState(() => (sale.items ?? []).map((i) => ({ ...i })));
  const [buyerName, setBuyerName] = useState(sale.buyer_name ?? "");
  const [buyerHp, setBuyerHp] = useState(sale.buyer_hp ?? "");
  const [pelangganId, setPelangganId] = useState(sale.pelanggan_id ?? null);
  const [discount, setDiscount] = useState(String(sale.discount ?? 0));
  const [editingHarga, setEditingHarga] = useState(null);
  const [hargaInput, setHargaInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState("");
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [addSearch, setAddSearch] = useState("");
  const [addKode, setAddKode] = useState(null);    // produk terpilih
  const [addSize, setAddSize] = useState(null);     // size terpilih
  const [addQty, setAddQty] = useState(1);
  const [addHarga, setAddHarga] = useState("");
  const saleLocation = sale.location ?? "gudang";

  const { products: allProducts } = useProducts();
  const filteredProducts = useMemo(() => {
    const q = addSearch.trim().toLowerCase();
    if (!q) return allProducts.slice(0, 30);
    return allProducts.filter((p) =>
      p.kode.toLowerCase().includes(q) || (p.nama ?? "").toLowerCase().includes(q)
    ).slice(0, 20);
  }, [allProducts, addSearch]);

  function selectAddKode(kode) {
    setAddKode(kode);
    setAddSize(null);
    setAddQty(1);
    setAddHarga("");
  }

  function selectAddSize(p, v) {
    setAddSize(v.size);
    setAddHarga(String(v.harga ?? ""));
    setAddQty(1);
  }

  function confirmAddItem() {
    const p = allProducts.find((x) => x.kode === addKode);
    if (!p || !addSize) return;
    const harga = parseInt(addHarga) || 0;
    setItems((prev) => {
      // kalau kode+size sudah ada, tambah qty
      const idx = prev.findIndex((i) => i.kode === p.kode && i.size === addSize && !Array.isArray(i.warna));
      if (idx >= 0) {
        return prev.map((i, ii) => ii === idx ? { ...i, qty: (i.qty ?? 1) + addQty } : i);
      }
      return [...prev, { kode: p.kode, nama: p.nama, size: addSize, harga, qty: addQty, hpp: p.hpp ?? 0 }];
    });
    setAddKode(null);
    setAddSize(null);
    setAddSearch("");
    setAddQty(1);
    setAddHarga("");
    setShowAddProduct(false);
  }

  const discountNum = parseInt(discount.replace(/\D/g, ""), 10) || 0;
  const subtotal = items.reduce((s, item) => s + effectiveQty(item) * item.harga, 0);
  const total = Math.max(0, subtotal - discountNum);

  function removeItem(idx) {
    if (items.length === 1) {
      alert("Minimal 1 produk harus ada dalam transaksi.");
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // ── Qty editing ─────────────────────────────────────────────────────────────
  function updateSimpleQty(idx, delta) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx || item.warna) return item;
        const newQty = Math.max(1, (item.qty ?? 1) + delta);
        return { ...item, qty: newQty };
      }),
    );
  }

  function updateWarnaQty(itemIdx, warnaName, delta) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== itemIdx || !item.warna) return item;
        const newWarna = item.warna
          .map((w) =>
            w.nama === warnaName ? { ...w, qty: Math.max(1, w.qty + delta) } : w,
          )
          .filter((w) => w.qty > 0);
        if (!newWarna.length) return item; // jangan hapus semua warna
        return { ...item, warna: newWarna };
      }),
    );
  }

  // ── Harga editing ───────────────────────────────────────────────────────────
  function startEditHarga(idx) {
    setEditingHarga(idx);
    setHargaInput(String(items[idx].harga));
  }

  function saveHarga(idx) {
    const val = parseInt(hargaInput.replace(/\D/g, ""), 10);
    if (!isNaN(val) && val > 0) {
      setItems((prev) => prev.map((item, i) => (i === idx ? { ...item, harga: val } : item)));
    }
    setEditingHarga(null);
  }

  // ── Buyer ────────────────────────────────────────────────────────────────────
  function handleBuyerSelect(p) {
    setBuyerName(p.nama);
    setBuyerHp(p.no_hp ?? "");
    setPelangganId(p.id);
  }

  // ── Save ─────────────────────────────────────────────────────────────────────
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
      buyer_hp: buyerHp || null,
      pelanggan_id: pelangganId || null,
      discount: discountNum,
      _editNote: note,
    });
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-skin-card w-full max-w-md mx-auto border-t-2 md:border-2 border-skin-bdr shadow-2xl flex flex-col max-h-[92dvh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-skin-bdr flex-shrink-0">
          <h3 className="text-xl text-skin-text font-semibold">Edit Transaksi</h3>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* ── Items ── */}
          <section>
            <p className="text-sm text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-3">
              Produk
            </p>
            <div className="space-y-2">
              {items.map((item, idx) => {
                const qty = effectiveQty(item);
                const line = qty * item.harga;
                const isWarna = Array.isArray(item.warna) && item.warna.length > 0;
                return (
                  <div key={idx} className="bg-skin-page border-2 border-skin-bdr p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-skin-text">
                          {item.kode} — {item.size}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-red-500 hover:text-red-700 text-xl leading-none flex-shrink-0 p-1"
                        title="Hapus item"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Qty editor */}
                    {isWarna ? (
                      <div className="mt-2 space-y-1.5">
                        {item.warna.map((w) => (
                          <div key={w.nama} className="flex items-center justify-between gap-2">
                            <span className="text-sm text-skin-text2 min-w-0 truncate">{w.nama}</span>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                onClick={() => updateWarnaQty(idx, w.nama, -1)}
                                className="w-8 h-8 border border-skin-bdr text-skin-text3 text-lg flex items-center justify-center hover:border-red-300 hover:text-red-500 transition"
                              >
                                −
                              </button>
                              <span className="text-base font-bold text-skin-text w-7 text-center">{w.qty}</span>
                              <button
                                onClick={() => updateWarnaQty(idx, w.nama, +1)}
                                className="w-8 h-8 border border-skin-bdr text-skin-text3 text-lg flex items-center justify-center hover:border-[#CAB170] hover:text-[#CAB170] transition"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateSimpleQty(idx, -1)}
                          className="w-9 h-9 border border-skin-bdr text-skin-text3 text-xl flex items-center justify-center hover:border-red-300 hover:text-red-500 transition"
                        >
                          −
                        </button>
                        <span className="text-lg font-bold text-skin-text w-8 text-center">{item.qty ?? 0}</span>
                        <button
                          onClick={() => updateSimpleQty(idx, +1)}
                          className="w-9 h-9 border border-skin-bdr text-skin-text3 text-xl flex items-center justify-center hover:border-[#CAB170] hover:text-[#CAB170] transition"
                        >
                          +
                        </button>
                        <span className="text-sm text-skin-text3 ml-1">pcs</span>
                      </div>
                    )}

                    {/* Harga edit */}
                    {editingHarga === idx ? (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-sm text-skin-text3">Rp</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoFocus
                          value={hargaInput}
                          onChange={(e) => setHargaInput(e.target.value.replace(/\D/g, ""))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveHarga(idx);
                            if (e.key === "Escape") setEditingHarga(null);
                          }}
                          className="flex-1 border-2 border-[#CAB170] px-3 py-2 text-base text-skin-text focus:outline-none"
                        />
                        <button
                          onClick={() => saveHarga(idx)}
                          className="bg-[#CAB170] text-white px-3 py-2 text-sm font-semibold"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setEditingHarga(null)}
                          className="border-2 border-skin-bdr text-skin-text2 px-3 py-2 text-sm"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mt-2">
                        <p className="text-base text-[#CAB170] font-semibold">
                          Rp {formatHarga(item.harga)} /pcs
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-skin-text font-bold">
                            = Rp {formatHarga(line)}
                          </p>
                          <button
                            onClick={() => startEditHarga(idx)}
                            className="text-xs text-[#CAB170] border border-skin-bdr-gold bg-skin-gold px-2 py-1 hover:bg-skin-gold-deep transition"
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

            {/* Tombol + panel tambah produk */}
            {showAddProduct ? (
              <div className="border-2 border-skin-bdr mt-3 p-3 space-y-3 bg-skin-raised">
                <p className="text-sm font-semibold text-skin-text2">Tambah Produk</p>
                <input
                  type="text"
                  value={addSearch}
                  onChange={(e) => { setAddSearch(e.target.value); setAddKode(null); setAddSize(null); }}
                  placeholder="Cari kode atau nama produk..."
                  className="w-full border-2 border-skin-bdr px-3 py-2 text-sm focus:outline-none focus:border-[#CAB170] transition"
                />
                {!addKode && filteredProducts.length > 0 && (
                  <div className="max-h-40 overflow-y-auto border border-skin-bdr divide-y divide-skin-bdr-lt">
                    {filteredProducts.map((p) => (
                      <button key={p.kode} type="button" onClick={() => selectAddKode(p.kode)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-skin-gold transition">
                        <span className="font-mono font-bold text-skin-text">{p.kode}</span>
                        {p.nama && <span className="text-skin-text3 ml-2 text-xs">{p.nama}</span>}
                      </button>
                    ))}
                  </div>
                )}
                {addKode && (() => {
                  const p = allProducts.find((x) => x.kode === addKode);
                  if (!p) return null;
                  return (
                    <div className="space-y-2">
                      <p className="text-sm font-bold text-[#CAB170]">{p.kode}</p>
                      {!addSize ? (
                        <div className="grid grid-cols-2 gap-1.5">
                          {(p.variants ?? []).map((v) => {
                            const stok = p.stokByWarna?.[v.size] ?? {};
                            const totalStok = Object.values(stok).reduce((s, loc) =>
                              typeof loc === "object" ? s + Object.values(loc).reduce((a, b) => a + (b ?? 0), 0)
                              : s + (loc?.[saleLocation] ?? 0), 0);
                            return (
                              <button key={v.size} type="button" onClick={() => selectAddSize(p, v)}
                                className="border border-skin-bdr px-3 py-2 text-sm text-left hover:border-[#CAB170] transition">
                                <span className="font-semibold">{v.size}</span>
                                <span className="text-xs text-skin-text3 ml-1">Rp {(v.harga ?? 0).toLocaleString("id-ID")}</span>
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-xs text-skin-text3">{addSize}</p>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <button type="button" onClick={() => setAddQty((q) => Math.max(1, q - 1))}
                                className="w-8 h-8 border border-skin-bdr flex items-center justify-center text-lg">−</button>
                              <span className="w-8 text-center font-bold">{addQty}</span>
                              <button type="button" onClick={() => setAddQty((q) => q + 1)}
                                className="w-8 h-8 border border-skin-bdr flex items-center justify-center text-lg">+</button>
                            </div>
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-xs text-skin-text3">Rp</span>
                              <input type="number" value={addHarga} onChange={(e) => setAddHarga(e.target.value)}
                                className="flex-1 border border-skin-bdr px-2 py-1.5 text-sm focus:outline-none focus:border-[#CAB170]" />
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button type="button" onClick={confirmAddItem}
                              className="flex-1 py-2 bg-[#CAB170] text-white text-sm font-semibold">+ Tambahkan</button>
                            <button type="button" onClick={() => { setAddSize(null); setAddKode(null); }}
                              className="px-3 py-2 border border-skin-bdr text-sm text-skin-text3">Batal</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <button type="button" onClick={() => { setShowAddProduct(false); setAddKode(null); setAddSearch(""); }}
                  className="text-xs text-skin-text3 underline">Tutup</button>
              </div>
            ) : (
              <button type="button" onClick={() => setShowAddProduct(true)}
                className="mt-3 w-full py-2.5 border-2 border-dashed border-skin-bdr text-sm text-skin-text3 hover:border-[#CAB170] hover:text-[#CAB170] transition">
                + Tambah Produk
              </button>
            )}
          </section>

          {/* ── Pembeli ── */}
          <section>
            <p className="text-sm text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-3">
              Pembeli
            </p>
            <div className="space-y-2">
              <BuyerInput
                value={buyerName}
                onChange={(v) => {
                  setBuyerName(v);
                  setPelangganId(null);
                }}
                onSelect={handleBuyerSelect}
                disabled={saving}
              />
              <input
                type="tel"
                value={buyerHp}
                onChange={(e) => setBuyerHp(e.target.value)}
                placeholder="No HP (opsional)"
                className="w-full border-2 border-skin-bdr px-4 py-3 text-base focus:outline-none focus:border-[#CAB170] transition"
              />
            </div>
          </section>

          {/* ── Diskon ── */}
          <section>
            <p className="text-sm text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-3">
              Diskon
            </p>
            <div className="flex items-center gap-2">
              <span className="text-base text-skin-text2">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={discount}
                onChange={(e) => setDiscount(e.target.value.replace(/\D/g, ""))}
                placeholder="0"
                className="flex-1 border-2 border-skin-bdr px-4 py-3 text-base focus:outline-none focus:border-[#CAB170] transition"
              />
            </div>
          </section>

          {/* ── Ringkasan total ── */}
          <section className="bg-skin-page border-2 border-skin-bdr p-4 space-y-2">
            <div className="flex justify-between text-base text-skin-text2">
              <span>Subtotal</span>
              <span>Rp {formatHarga(subtotal)}</span>
            </div>
            {discountNum > 0 && (
              <div className="flex justify-between text-base text-skin-text2">
                <span>Diskon</span>
                <span>- Rp {formatHarga(discountNum)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold text-skin-text pt-2 border-t border-skin-bdr">
              <span>Total</span>
              <span>Rp {formatHarga(total)}</span>
            </div>
          </section>

          {/* ── Catatan audit ── */}
          <section>
            <p className="text-sm text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-2">
              Alasan Edit <span className="text-red-500">*</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: salah input harga, koreksi jumlah barang..."
              rows={2}
              className="w-full border-2 border-skin-bdr px-4 py-3 text-base focus:outline-none focus:border-[#CAB170] transition resize-none"
            />
            <p className="text-xs text-skin-text3 mt-1">
              Catatan ini disimpan sebagai riwayat audit.
            </p>
          </section>
        </div>

        {/* Footer aksi */}
        <div className="flex gap-3 p-4 border-t-2 border-skin-bdr flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-4 bg-[#CAB170] text-white text-base tracking-[0.1em] uppercase font-semibold hover:bg-[#A8925A] transition disabled:opacity-40"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-4 border-2 border-skin-bdr text-skin-text2 text-base uppercase hover:border-[#1A1918] transition"
          >
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}
