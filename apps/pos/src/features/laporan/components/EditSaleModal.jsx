import { useState, useMemo } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import BuyerInput from "../../kasir/components/BuyerInput";
import { useProducts } from "../../../hooks/useProducts";
import {
  getStokWarna,
  getStokAllLocations,
  getCombinedStok,
  allocateAcrossLocations,
} from "../../../shared/lib/salesUtils";
import { LOCATION_LABELS } from "@deera/shared/lib/marketDay";
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
  const [addKode, setAddKode] = useState(null);
  const [addSize, setAddSize] = useState(null);
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

  function findOriginalQty(kode, size, warnaName) {
    const orig = (sale.items ?? []).find((i) => {
      if (i.kode !== kode || i.size !== size) return false;
      return warnaName === "_" ? !Array.isArray(i.warna) : Array.isArray(i.warna);
    });
    if (!orig) return 0;
    if (warnaName === "_") return orig.qty ?? 0;
    return (orig.warna ?? []).find((w) => w.nama === warnaName)?.qty ?? 0;
  }

  function maxQtyFor(kode, size, warnaName) {
    const p = allProducts.find((x) => x.kode === kode);
    if (!p) return Infinity;
    const originalQty = findOriginalQty(kode, size, warnaName);
    return originalQty + getCombinedStok(p, size, warnaName);
  }

  function recomputeBreakdown(currentBreakdown, kode, size, warnaName, newQty) {
    const p = allProducts.find((x) => x.kode === kode);
    if (!p) return [{ location: saleLocation, qty: newQty }];
    const stokByLoc = getStokAllLocations(p, size, warnaName);
    return allocateAcrossLocations({
      stokByLoc,
      primaryLocation: saleLocation,
      currentBreakdown: currentBreakdown ?? [],
      want: newQty,
    });
  }

  // BUG FIX (laporan: "edit struk tambah produk, harusnya ambil dari lokasi
  // yang sama, sekarang malah ambil dr gudang dan jadi gabungan") —
  // allocateAcrossLocations tetap boleh ambil dari lokasi lain kalau lokasi
  // sale sendiri kurang (supaya admin tidak "macet" saat edit cuma krn
  // lokasi itu kebetulan kosong), TAPI sekarang itu harus persetujuan
  // eksplisit admin dulu (lihat pendingCrossLocation), bukan diam-diam.
  // Fungsi ini membandingkan breakdown LAMA vs breakdown BARU hasil hitung,
  // cuma utk lokasi SELAIN saleLocation -- kalau ada tambahan qty di situ,
  // itu artinya kenaikan qty ini butuh ambil dari lokasi lain.
  function extraFromOtherLocations(oldBreakdown, newBreakdown) {
    const oldMap = {};
    for (const b of oldBreakdown ?? []) oldMap[b.location] = b.qty;
    const newMap = {};
    for (const b of newBreakdown ?? []) newMap[b.location] = b.qty;
    const extras = [];
    for (const loc of Object.keys(newMap)) {
      if (loc === saleLocation) continue;
      const diff = (newMap[loc] ?? 0) - (oldMap[loc] ?? 0);
      if (diff > 0) extras.push({ location: loc, qty: diff });
    }
    return extras;
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

  function aggregateExtras(extras) {
    const map = {};
    for (const e of extras) map[e.location] = (map[e.location] ?? 0) + e.qty;
    return Object.entries(map).map(([location, qty]) => ({ location, qty }));
  }

  function resetAddProductForm() {
    setAddKode(null);
    setAddSize(null);
    setAddSearch("");
    setAddQty(1);
    setAddHarga("");
    setAddWarnaQty({});
    setShowAddProduct(false);
  }

  // Dipakai confirmAddItem: hitung items BARU tanpa langsung commit ke
  // state, supaya kita bisa cek dulu apakah "nambah qty ke warna/produk yg
  // SUDAH ADA di keranjang" ini butuh ambil dari lokasi lain (sama seperti
  // tombol +/- di updateSimpleQty/updateWarnaQty).
  function buildAddedItems() {
    const p = allProducts.find((x) => x.kode === addKode);
    if (!p || !addSize) return null;
    const harga = parseInt(addHarga) || 0;
    const isWarnaProduct = Array.isArray(p.warna) && p.warna.length > 0;
    const extras = [];

    if (isWarnaProduct) {
      const chosen = Object.entries(addWarnaQty).filter(([, q]) => q > 0);
      if (chosen.length === 0) return null;
      const idx = items.findIndex((i) => i.kode === p.kode && i.size === addSize && Array.isArray(i.warna));
      if (idx >= 0) {
        const existing = items[idx];
        const nextWarna = [...existing.warna];
        for (const [nama, qty] of chosen) {
          const wIdx = nextWarna.findIndex((w) => w.nama === nama);
          if (wIdx >= 0) {
            const newQty = nextWarna[wIdx].qty + qty;
            const newBreakdown = recomputeBreakdown(
              nextWarna[wIdx].breakdown, existing.kode, existing.size, nama, newQty,
            );
            extras.push(...extraFromOtherLocations(nextWarna[wIdx].breakdown, newBreakdown));
            nextWarna[wIdx] = { ...nextWarna[wIdx], qty: newQty, breakdown: newBreakdown };
          } else {
            nextWarna.push({ nama, qty });
          }
        }
        return { nextItems: items.map((i, ii) => (ii === idx ? { ...i, warna: nextWarna } : i)), extras };
      }
      return {
        nextItems: [
          ...items,
          {
            kode: p.kode,
            nama: p.nama,
            size: addSize,
            harga,
            warna: chosen.map(([nama, qty]) => ({ nama, qty })),
            hpp: p.hpp ?? 0,
          },
        ],
        extras,
      };
    }

    const idx = items.findIndex((i) => i.kode === p.kode && i.size === addSize && !Array.isArray(i.warna));
    if (idx >= 0) {
      const existing = items[idx];
      const newQty = (existing.qty ?? 1) + addQty;
      const newBreakdown = recomputeBreakdown(existing.breakdown, existing.kode, existing.size, "_", newQty);
      extras.push(...extraFromOtherLocations(existing.breakdown, newBreakdown));
      return {
        nextItems: items.map((i, ii) => (ii === idx ? { ...i, qty: newQty, breakdown: newBreakdown } : i)),
        extras,
      };
    }
    return {
      nextItems: [...items, { kode: p.kode, nama: p.nama, size: addSize, harga, qty: addQty, hpp: p.hpp ?? 0 }],
      extras,
    };
  }

  function confirmAddItem() {
    const built = buildAddedItems();
    if (!built) return;
    const extras = aggregateExtras(built.extras);
    if (extras.length > 0) {
      setPendingCrossLocation({
        kind: "add",
        nextItems: built.nextItems,
        extras,
        label: `${addKode} — ${addSize}`,
      });
      return;
    }
    setItems(built.nextItems);
    resetAddProductForm();
  }

  const discountNum = parseInt(discount.replace(/\D/g, ""), 10) || 0;
  const subtotal = items.reduce((s, item) => s + effectiveQty(item) * item.harga, 0);
  const total = Math.max(0, subtotal - discountNum);

  const [pendingRemove, setPendingRemove] = useState(null);
  const [pendingCrossLocation, setPendingCrossLocation] = useState(null);

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

  function applySimpleQty(idx, newQty, newBreakdown) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, qty: newQty, breakdown: newBreakdown } : it)),
    );
  }

  function applyWarnaQty(itemIdx, warnaName, newQty, newBreakdown) {
    setItems((prev) =>
      prev.map((it, i) =>
        i === itemIdx
          ? {
              ...it,
              warna: it.warna.map((w) =>
                w.nama === warnaName ? { ...w, qty: newQty, breakdown: newBreakdown } : w,
              ),
            }
          : it,
      ),
    );
  }

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
    const newBreakdown = recomputeBreakdown(item.breakdown, item.kode, item.size, "_", newQty);
    if (delta > 0) {
      const extras = aggregateExtras(extraFromOtherLocations(item.breakdown, newBreakdown));
      if (extras.length > 0) {
        setPendingCrossLocation({
          kind: "simple",
          idx,
          newQty,
          newBreakdown,
          extras,
          label: `${item.kode} — ${item.size}`,
        });
        return;
      }
    }
    applySimpleQty(idx, newQty, newBreakdown);
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
    const oldBreakdown = item.warna.find((w) => w.nama === warnaName)?.breakdown;
    const newBreakdown = recomputeBreakdown(oldBreakdown, item.kode, item.size, warnaName, newQty);
    if (delta > 0) {
      const extras = aggregateExtras(extraFromOtherLocations(oldBreakdown, newBreakdown));
      if (extras.length > 0) {
        setPendingCrossLocation({
          kind: "warna",
          itemIdx,
          warnaName,
          newQty,
          newBreakdown,
          extras,
          label: `${warnaName} (${item.kode} — ${item.size})`,
        });
        return;
      }
    }
    applyWarnaQty(itemIdx, warnaName, newQty, newBreakdown);
  }

  function confirmCrossLocation() {
    if (!pendingCrossLocation) return;
    const { kind, idx, itemIdx, warnaName, newQty, newBreakdown, nextItems } = pendingCrossLocation;
    if (kind === "simple") {
      applySimpleQty(idx, newQty, newBreakdown);
    } else if (kind === "warna") {
      applyWarnaQty(itemIdx, warnaName, newQty, newBreakdown);
    } else if (kind === "add") {
      setItems(nextItems);
      resetAddProductForm();
    }
    setPendingCrossLocation(null);
  }

  function cancelCrossLocation() {
    setPendingCrossLocation(null);
  }

  function removeWarnaLine(itemIdx, warnaName) {
    requestRemoveWarna(itemIdx, warnaName);
  }

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

  function handleBuyerSelect(p) {
    setBuyerName(p.nama);
    setBuyerHp(p.no_hp ?? "");
    setPelangganId(p.id);
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
        <div className="flex items-center justify-between px-5 py-4 border-b-2 border-skin-bdr flex-shrink-0">
          <h3 className="text-xl text-skin-text font-semibold">Edit Transaksi</h3>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-skin-text text-2xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
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
                                className="w-8 h-8 border border-skin-bdr text-skin-text3 text-lg flex items-center justify-center hover:border-skin-accent hover:text-skin-accent-text transition disabled:opacity-30 disabled:cursor-not-allowed"
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
                          className="w-9 h-9 border border-skin-bdr text-skin-text3 text-xl flex items-center justify-center hover:border-skin-accent hover:text-skin-accent-text transition disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          +
                        </button>
                        <span className="text-sm text-skin-text3 ml-1">pcs</span>
                      </div>
                    )}

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
                          className="flex-1 bg-skin-page border-2 border-skin-accent px-3 py-2 text-base text-skin-text focus:outline-none"
                        />
                        <button
                          onClick={() => saveHarga(idx)}
                          className="bg-skin-accent text-skin-on-accent px-3 py-2 text-sm font-semibold"
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
                        <p className="text-base text-skin-accent-text font-semibold">
                          Rp {formatHarga(item.harga)} /pcs
                        </p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-skin-text font-bold">
                            = Rp {formatHarga(line)}
                          </p>
                          <button
                            onClick={() => startEditHarga(idx)}
                            className="text-xs text-skin-accent-text border border-skin-bdr-gold bg-skin-gold px-2 py-1 hover:bg-skin-gold-deep transition"
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

            {showAddProduct ? (
              <div className="border-2 border-skin-bdr mt-3 p-3 space-y-3 bg-skin-raised">
                <p className="text-sm font-semibold text-skin-text2">Tambah Produk</p>
                <input
                  type="text"
                  value={addSearch}
                  onChange={(e) => { setAddSearch(e.target.value); setAddKode(null); setAddSize(null); }}
                  placeholder="Cari kode atau nama produk..."
                  className="w-full bg-skin-page border-2 border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition placeholder:text-skin-text4"
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
                      <p className="text-sm font-bold text-skin-accent-text">{p.kode}</p>
                      {!addSize ? (
                        <div className="grid grid-cols-2 gap-1.5">
                          {(p.variants ?? []).map((v) => {
                            return (
                              <button key={v.size} type="button" onClick={() => selectAddSize(p, v)}
                                className="border border-skin-bdr px-3 py-2 text-sm text-left hover:border-skin-accent transition">
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
                                className="flex-1 bg-skin-page border border-skin-bdr px-2 py-1.5 text-sm text-skin-text focus:outline-none focus:border-skin-accent" />
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
                              className="flex-1 py-2 bg-skin-accent text-skin-on-accent text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed">+ Tambahkan</button>
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
                className="mt-3 w-full py-2.5 border-2 border-dashed border-skin-bdr text-sm text-skin-text3 hover:border-skin-accent hover:text-skin-accent-text transition">
                + Tambah Produk
              </button>
            )}
          </section>

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
                className="w-full bg-skin-page border-2 border-skin-bdr px-4 py-3 text-base text-skin-text focus:outline-none focus:border-skin-accent transition placeholder:text-skin-text4"
              />
            </div>
          </section>

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
                className="flex-1 bg-skin-page border-2 border-skin-bdr px-4 py-3 text-base text-skin-text focus:outline-none focus:border-skin-accent transition placeholder:text-skin-text4"
              />
            </div>
          </section>

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

          <section>
            <p className="text-sm text-skin-text3 uppercase tracking-[0.12em] font-semibold mb-2">
              Alasan Edit <span className="text-red-500">*</span>
            </p>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Contoh: salah input harga, koreksi jumlah barang..."
              rows={2}
              className="w-full bg-skin-page border-2 border-skin-bdr px-4 py-3 text-base text-skin-text focus:outline-none focus:border-skin-accent transition resize-none placeholder:text-skin-text4"
            />
            <p className="text-xs text-skin-text3 mt-1">
              Catatan ini disimpan sebagai riwayat audit.
            </p>
          </section>
        </div>

        <div className="flex gap-3 p-4 border-t-2 border-skin-bdr flex-shrink-0">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-4 bg-skin-accent text-skin-on-accent text-base tracking-[0.1em] uppercase font-semibold hover:bg-skin-accent-hover transition disabled:opacity-40"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-4 border-2 border-skin-bdr text-skin-text2 text-base uppercase hover:border-skin-text transition"
          >
            Batal
          </button>
        </div>
      </div>

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
                className="flex-1 py-3 border-2 border-skin-bdr text-skin-text2 text-sm uppercase tracking-[0.1em] hover:border-skin-text transition"
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

      {pendingCrossLocation && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={cancelCrossLocation} />
          <div className="relative bg-skin-card border-2 border-skin-accent/40 w-full max-w-sm p-6 space-y-4">
            <p className="text-sm text-skin-accent-text uppercase tracking-[0.12em] font-semibold">
              Stok {LOCATION_LABELS[saleLocation] ?? saleLocation} Tidak Cukup
            </p>
            <p className="text-base text-skin-text">
              {pendingCrossLocation.label}: stok {LOCATION_LABELS[saleLocation] ?? saleLocation} sudah habis. Ambil{" "}
              {pendingCrossLocation.extras
                .map((e) => `${e.qty} pcs dari ${LOCATION_LABELS[e.location] ?? e.location}`)
                .join(" + ")}
              ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelCrossLocation}
                className="flex-1 py-3 border-2 border-skin-bdr text-skin-text2 text-sm uppercase tracking-[0.1em] hover:border-skin-text transition"
              >
                Batal
              </button>
              <button
                onClick={confirmCrossLocation}
                className="flex-1 py-3 bg-skin-accent text-skin-on-accent text-sm uppercase tracking-[0.1em] font-semibold hover:bg-skin-accent-hover transition"
              >
                Ya, Ambil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
