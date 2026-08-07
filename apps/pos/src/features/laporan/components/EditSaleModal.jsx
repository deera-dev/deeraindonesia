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
import BuyerInput from "../../kasir/components/BuyerInput";
import { useProducts } from "../../../hooks/useProducts";
import { getStokWarna } from "../../../shared/lib/salesUtils";
import EditAddItemWarnaPicker from "./EditAddItemWarnaPicker";

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
  const [addWarnaQty, setAddWarnaQty] = useState({});
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
    setAddWarnaQty({});
  }

  function selectAddSize(p, v) {
    setAddSize(v.size);
    setAddHarga(String(v.harga ?? ""));
    setAddQty(1);
    setAddWarnaQty({});
  }

  // Qty ASLI (saat modal dibuka) untuk kode+size+warna tertentu — dipakai
  // sebagai basis batas atas, BUKAN qty yang sedang diedit di state `items`.
  // Kalau item ini baru ditambah di sesi edit ini (belum ada di sale.items
  // asli), originalQty = 0 (belum pernah dikurangi dari stok).
  function findOriginalQty(kode, size, warnaName) {
    const orig = (sale.items ?? []).find((i) => {
      if (i.kode !== kode || i.size !== size) return false;
      return warnaName === "_" ? !Array.isArray(i.warna) : Array.isArray(i.warna);
    });
    if (!orig) return 0;
    if (warnaName === "_") return orig.qty ?? 0;
    return (orig.warna ?? []).find((w) => w.nama === warnaName)?.qty ?? 0;
  }

  // Batas atas qty untuk kode+size+warna = qty asli (yang sudah "dijamin"
  // sejak modal dibuka) + stok yang MASIH tersedia sekarang. Basis-nya
  // SELALU qty asli (bukan qty live di state `items`) supaya batas ini tetap
  // sebagai garis tetap, tidak ikut naik setiap kali user menekan tombol +.
  function maxQtyFor(kode, size, warnaName) {
    const p = allProducts.find((x) => x.kode === kode);
    if (!p) return Infinity;
    const originalQty = findOriginalQty(kode, size, warnaName);
    return originalQty + getStokWarna(p, size, warnaName, saleLocation);
  }

  function setAddWarnaQtyFor(warnaName, qty) {
    setAddWarnaQty((prev) => {
      if (qty <= 0) {
        const next = { ...prev };
        delete next[warnaName];
        return next;
      }
      return { ...prev, [warnaName]: qty };
    });
  }

  function selectAllAddWarna(p) {
    setAddWarnaQty((prev) => {
      const next = { ...prev };
      for (const w of p.warna) {
        const stok = getStokWarna(p, addSize, w, saleLocation);
        if (stok <= 0) continue;
        next[w] = Math.min(stok, (prev[w] ?? 0) + 1);
      }
      return next;
    });
  }

  function resetAddWarna() {
    setAddWarnaQty({});
  }

  function confirmAddItem() {
    const p = allProducts.find((x) => x.kode === addKode);
    if (!p || !addSize) return;
    const harga = parseInt(addHarga) || 0;
    const isWarnaProduct = Array.isArray(p.warna) && p.warna.length > 0;

    if (isWarnaProduct) {
      const chosen = Object.entries(addWarnaQty).filter(([, q]) => q > 0);
      if (chosen.length === 0) return;
      setItems((prev) => {
        const idx = prev.findIndex(
          (i) => i.kode === p.kode && i.size === addSize && Array.isArray(i.warna),
        );
        if (idx >= 0) {
          const existing = prev[idx];
          const nextWarna = [...existing.warna];
          for (const [nama, qty] of chosen) {
            const wIdx = nextWarna.findIndex((w) => w.nama === nama);
            if (wIdx >= 0) {
              nextWarna[wIdx] = { ...nextWarna[wIdx], qty: nextWarna[wIdx].qty + qty };
            } else {
              nextWarna.push({ nama, qty });
            }
          }
          return prev.map((i, ii) => (ii === idx ? { ...i, warna: nextWarna } : i));
        }
        return [
          ...prev,
          {
            kode: p.kode,
            nama: p.nama,
            size: addSize,
            harga,
            warna: chosen.map(([nama, qty]) => ({ nama, qty })),
            hpp: p.hpp ?? 0,
          },
        ];
      });
    } else {
      setItems((prev) => {
        // kalau kode+size sudah ada, tambah qty
        const idx = prev.findIndex((i) => i.kode === p.kode && i.size === addSize && !Array.isArray(i.warna));
        if (idx >= 0) {
          return prev.map((i, ii) => ii === idx ? { ...i, qty: (i.qty ?? 1) + addQty } : i);
        }
        return [...prev, { kode: p.kode, nama: p.nama, size: addSize, harga, qty: addQty, hpp: p.hpp ?? 0 }];
      });
    }

    setAddKode(null);
    setAddSize(null);
    setAddSearch("");
    setAddQty(1);
    setAddHarga("");
    setAddWarnaQty({});
    setShowAddProduct(false);
  }

  const discountNum = parseInt(discount.replace(/\D/g, ""), 10) || 0;
  const subtotal = items.reduce((s, item) => s + effectiveQty(item) * item.harga, 0);
  const total = Math.max(0, subtotal - discountNum);

  // ── Hapus produk/warna — SELALU lewat konfirmasi ────────────────────────────
  // Setiap aksi yang berujung menghapus (✕ item, tempat sampah warna, atau
  // stepper "−" yang nyampe ke 0) TIDAK langsung menghapus — cuma membuka
  // modal konfirmasi (pendingRemove). Penghapusan sungguhan baru terjadi di
  // confirmPendingRemove(), supaya tap yang gak sengaja tidak langsung
  // menghilangkan produk/warna dari transaksi (CLAUDE.md §13: jangan pakai
  // window.confirm — modal konfirmasi sendiri).
  const [pendingRemove, setPendingRemove] = useState(null);
  // { kind: "item", idx, label } | { kind: "warna", itemIdx, warnaName, label }

  function requestRemoveItem(idx) {
    const item = items[idx];
    if (!item) return;
    setPendingRemove({ kind: "item", idx, label: `${item.kode} — ${item.size}` });
  }

  function requestRemoveWarna(itemIdx, warnaName) {
    const item = items[itemIdx];
    if (!item) return;
    setPendingRemove({
      kind: "warna",
      itemIdx,
      warnaName,
      label: `${warnaName} (${item.kode} — ${item.size})`,
    });
  }

  function cancelPendingRemove() {
    setPendingRemove(null);
  }

  // Kalau baris yang dihapus adalah satu-satunya (warna terakhir suatu
  // item, atau item terakhir di transaksi), seluruh item ikut hilang —
  // dengan aturan minimal 1 produk per transaksi tetap dijaga.
  function removeItemAt(prev, idx) {
    if (prev.length === 1) {
      alert("Minimal 1 produk harus ada dalam transaksi.");
      return prev;
    }
    return prev.filter((_, i) => i !== idx);
  }

  function applyWarnaChange(prev, itemIdx, newWarna) {
    if (newWarna.length === 0) return removeItemAt(prev, itemIdx);
    return prev.map((it, i) => (i === itemIdx ? { ...it, warna: newWarna } : it));
  }

  function confirmPendingRemove() {
    if (!pendingRemove) return;
    if (pendingRemove.kind === "item") {
      setItems((prev) => removeItemAt(prev, pendingRemove.idx));
    } else {
      setItems((prev) => {
        const item = prev[pendingRemove.itemIdx];
        if (!item || !item.warna) return prev;
        const newWarna = item.warna.filter((w) => w.nama !== pendingRemove.warnaName);
        return applyWarnaChange(prev, pendingRemove.itemIdx, newWarna);
      });
    }
    setPendingRemove(null);
  }

  // ── Qty editing ─────────────────────────────────────────────────────────────
  // Kalau qty diturunkan sampai 0 (bukan cuma tempat sampah), itu berarti
  // menghapus baris/item — lewat requestRemove*() (konfirmasi dulu), BUKAN
  // langsung diclamp ke 1 seperti sebelumnya. Ini memperbaiki kasus
  // "pembeli batal pilih warna A": sebelumnya qty tidak pernah bisa turun
  // di bawah 1, jadi warna yang dibatalkan tidak mungkin hilang dari struk
  // edit.
  function updateSimpleQty(idx, delta) {
    const item = items[idx];
    if (!item || item.warna) return;
    const current = item.qty ?? 1;
    if (delta < 0 && current + delta <= 0) {
      requestRemoveItem(idx);
      return;
    }
    const newQty =
      delta > 0
        ? Math.min(maxQtyFor(item.kode, item.size, "_"), current + delta)
        : current + delta;
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, qty: newQty } : it)));
  }

  function updateWarnaQty(itemIdx, warnaName, delta) {
    const item = items[itemIdx];
    if (!item || !item.warna) return;
    const current = item.warna.find((w) => w.nama === warnaName)?.qty ?? 0;
    if (delta < 0 && current + delta <= 0) {
      requestRemoveWarna(itemIdx, warnaName);
      return;
    }
    const newQty =
      delta > 0
        ? Math.min(maxQtyFor(item.kode, item.size, warnaName), current + delta)
        : current + delta;
    setItems((prev) =>
      prev.map((it, i) =>
        i === itemIdx
          ? { ...it, warna: it.warna.map((w) => (w.nama === warnaName ? { ...w, qty: newQty } : w)) }
          : it,
      ),
    );
  }

  // Tempat sampah per-warna — TANPA harus menekan "−" berkali-kali kalau
  // qty-nya besar. Sama-sama lewat requestRemoveWarna (konfirmasi dulu).
  function removeWarnaLine(itemIdx, warnaName) {
    requestRemoveWarna(itemIdx, warnaName);
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
                        onClick={() => requestRemoveItem(idx)}
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
                                disabled={w.qty >= maxQtyFor(item.kode, item.size, w.nama)}
                                className="w-8 h-8 border border-skin-bdr text-skin-text3 text-lg flex items-center justify-center hover:border-[#CAB170] hover:text-[#CAB170] transition disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                +
                              </button>
                              <button
                                onClick={() => removeWarnaLine(idx, w.nama)}
                                className="w-8 h-8 flex items-center justify-center text-skin-text4 hover:text-red-500 transition"
                                title="Hapus warna ini"
                              >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <line x1="10" y1="11" x2="10" y2="17" />
                                  <line x1="14" y1="11" x2="14" y2="17" />
                                </svg>
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
                          disabled={(item.qty ?? 0) >= maxQtyFor(item.kode, item.size, "_")}
                          className="w-9 h-9 border border-skin-bdr text-skin-text3 text-xl flex items-center justify-center hover:border-[#CAB170] hover:text-[#CAB170] transition disabled:opacity-30 disabled:cursor-not-allowed"
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
                          className="flex-1 bg-skin-page border-2 border-[#CAB170] px-3 py-2 text-base text-skin-text focus:outline-none"
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
                  className="w-full bg-skin-page border-2 border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4"
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
                  const isWarnaProduct = Array.isArray(p.warna) && p.warna.length > 0;
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
                            {!isWarnaProduct && (
                              <div className="flex items-center gap-1">
                                <button type="button" onClick={() => setAddQty((q) => Math.max(1, q - 1))}
                                  className="w-8 h-8 border border-skin-bdr flex items-center justify-center text-lg">−</button>
                                <span className="w-8 text-center font-bold">{addQty}</span>
                                <button type="button" onClick={() => setAddQty((q) => q + 1)}
                                  className="w-8 h-8 border border-skin-bdr flex items-center justify-center text-lg">+</button>
                              </div>
                            )}
                            <div className="flex items-center gap-1 flex-1">
                              <span className="text-xs text-skin-text3">Rp</span>
                              <input type="number" value={addHarga} onChange={(e) => setAddHarga(e.target.value)}
                                className="flex-1 bg-skin-page border border-skin-bdr px-2 py-1.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170]" />
                            </div>
                          </div>
                          {isWarnaProduct && (
                            <EditAddItemWarnaPicker
                              product={p}
                              size={addSize}
                              location={saleLocation}
                              selected={addWarnaQty}
                              onSetQty={setAddWarnaQtyFor}
                              onSelectAll={() => selectAllAddWarna(p)}
                              onReset={resetAddWarna}
                            />
                          )}
                          <div className="flex gap-2">
                            <button type="button" onClick={confirmAddItem}
                              disabled={isWarnaProduct && Object.values(addWarnaQty).every((q) => !q)}
                              className="flex-1 py-2 bg-[#CAB170] text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">+ Tambahkan</button>
                            <button type="button" onClick={() => { setAddSize(null); setAddKode(null); setAddWarnaQty({}); }}
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
                className="w-full bg-skin-page border-2 border-skin-bdr px-4 py-3 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4"
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
                className="flex-1 bg-skin-page border-2 border-skin-bdr px-4 py-3 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition placeholder:text-skin-text4"
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
              className="w-full bg-skin-page border-2 border-skin-bdr px-4 py-3 text-base text-skin-text focus:outline-none focus:border-[#CAB170] transition resize-none placeholder:text-skin-text4"
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

      {/* ── Konfirmasi hapus (item / warna) ── */}
      {pendingRemove && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={cancelPendingRemove} />
          <div className="relative bg-skin-card border-2 border-red-500/40 w-full max-w-sm p-6 space-y-4">
            <p className="text-sm text-red-500 uppercase tracking-[0.12em] font-semibold">
              {pendingRemove.kind === "item" ? "Hapus Produk?" : "Hapus Warna?"}
            </p>
            <p className="text-base text-skin-text">
              {pendingRemove.kind === "item"
                ? `${pendingRemove.label} akan dihapus dari transaksi ini.`
                : `Warna ${pendingRemove.label} akan dihapus dari item ini.`}
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelPendingRemove}
                className="flex-1 py-3 border-2 border-skin-bdr text-skin-text2 text-sm uppercase tracking-[0.1em] hover:border-[#1A1918] transition"
              >
                Batal
              </button>
              <button
                onClick={confirmPendingRemove}
                className="flex-1 py-3 bg-red-500 text-white text-sm uppercase tracking-[0.1em] font-semibold hover:bg-red-600 transition"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
