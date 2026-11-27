import { useState, useMemo } from "react";
import { formatHarga } from "@deera/shared/lib/constants";
import BuyerInput from "../../kasir/components/BuyerInput";
import { useProducts } from "../../../hooks/useProducts";
import { getStokWarna, getStokAllLocations } from "../../../shared/lib/salesUtils";
import { LOCATIONS } from "@deera/shared/lib/marketDay";
import EditAddItemWarnaPicker from "./EditAddItemWarnaPicker";
import LocationQtyRow from "./LocationQtyRow";

function effectiveQty(item) {
  return Array.isArray(item.warna) ? item.warna.reduce((s, w) => s + (w.qty ?? 0), 0) : (item.qty ?? 0);
}

// Kalau baris belum punya breakdown (item lama/baru ditambah), anggap
// semuanya ada di lokasi sale sendiri -- titik awal yang aman sebelum admin
// pilih sendiri mau nambah/kurangi dari lokasi mana (lihat LocationQtyRow).
function breakdownOf(breakdown, qty, saleLocation) {
  return Array.isArray(breakdown) && breakdown.length > 0 ? breakdown : [{ location: saleLocation, qty: qty ?? 0 }];
}

function setBreakdownLocQty(breakdown, loc, newQty) {
  const map = {};
  for (const b of breakdown) map[b.location] = b.qty;
  if (newQty > 0) map[loc] = newQty;
  else delete map[loc];
  return Object.entries(map).map(([location, qty]) => ({ location, qty }));
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

  // BUG FIX (laporan: "edit struk tambah produk, harusnya ambil dari lokasi
  // yang sama, sekarang malah ambil dr gudang dan jadi gabungan") — batas
  // maksimal SEMPAT pakai stok gabungan 3 lokasi, jadi allocateAcrossLocations
  // bisa diam-diam ambil dari lokasi lain tanpa admin sadar. Sekarang per
  // lokasi punya batas & tombol +/- sendiri (sama gayanya dengan mode
  // gabungan di kasir/WarnaPanel.jsx) -- admin yang pilih sendiri lokasi
  // mana yang mau ditambah/dikurangi, bukan otomatis.
  // Batas per lokasi HARUS dihitung dari breakdown ASLI (sebelum sesi edit
  // ini mulai, dari prop `sale`), bukan breakdown yang sedang di-edit --
  // kalau pakai yang sedang di-edit, batasnya ikut naik tiap kali qty
  // ditambah (jumlah yang baru saja ditambahkan dihitung lagi seolah
  // "sudah ada dari awal"), jadi tombol + tidak pernah benar2 nonaktif.
  function findOriginalBreakdown(kode, size, warnaName) {
    const orig = (sale.items ?? []).find((i) => {
      if (i.kode !== kode || i.size !== size) return false;
      return warnaName === "_" ? !Array.isArray(i.warna) : Array.isArray(i.warna);
    });
    if (!orig) return [];
    if (warnaName === "_") return breakdownOf(orig.breakdown, orig.qty, saleLocation);
    const w = (orig.warna ?? []).find((x) => x.nama === warnaName);
    return w ? breakdownOf(w.breakdown, w.qty, saleLocation) : [];
  }

  function maxByLocFor(kode, size, warnaName) {
    const p = allProducts.find((x) => x.kode === kode);
    if (!p) {
      // Produk belum ketemu di data (mis. masih loading) -- jangan blokir
      // edit, sama seperti fallback Infinity di versi lama.
      const max = {};
      for (const loc of LOCATIONS) max[loc] = Infinity;
      return max;
    }
    const stokByLoc = getStokAllLocations(p, size, warnaName);
    const originalBreakdown = findOriginalBreakdown(kode, size, warnaName);
    const max = {};
    for (const loc of LOCATIONS) {
      const already = originalBreakdown.find((b) => b.location === loc)?.qty ?? 0;
      max[loc] = already + (stokByLoc[loc] ?? 0);
    }
    return max;
  }

  function updateSimpleLocQty(idx, loc, newLocQty) {
    const item = items[idx];
    if (!item || item.warna) return;
    const breakdown = breakdownOf(item.breakdown, item.qty, saleLocation);
    const nextBreakdown = setBreakdownLocQty(breakdown, loc, newLocQty);
    const totalQty = nextBreakdown.reduce((s, b) => s + b.qty, 0);
    if (totalQty <= 0) {
      requestRemoveItem(idx);
      return;
    }
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, qty: totalQty, breakdown: nextBreakdown } : it)),
    );
  }

  function updateWarnaLocQty(itemIdx, warnaName, loc, newLocQty) {
    const item = items[itemIdx];
    if (!item || !item.warna) return;
    const w = item.warna.find((x) => x.nama === warnaName);
    if (!w) return;
    const breakdown = breakdownOf(w.breakdown, w.qty, saleLocation);
    const nextBreakdown = setBreakdownLocQty(breakdown, loc, newLocQty);
    const totalQty = nextBreakdown.reduce((s, b) => s + b.qty, 0);
    if (totalQty <= 0) {
      requestRemoveWarna(itemIdx, warnaName);
      return;
    }
    setItems((prev) =>
      prev.map((it, i) =>
        i === itemIdx
          ? {
              ...it,
              warna: it.warna.map((x) =>
                x.nama === warnaName ? { ...x, qty: totalQty, breakdown: nextBreakdown } : x,
              ),
            }
          : it,
      ),
    );
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

  function resetAddProductForm() {
    setAddKode(null);
    setAddSize(null);
    setAddSearch("");
    setAddQty(1);
    setAddHarga("");
    setAddWarnaQty({});
    setShowAddProduct(false);
  }

  // "Tambah Produk" (produk BARU di keranjang) selalu masuk ke lokasi sale
  // sendiri -- EditAddItemWarnaPicker sudah membatasi pilihan warna ke stok
  // lokasi itu saja, jadi aman tanpa perlu allocateAcrossLocations.
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
              const prevBreakdown = breakdownOf(nextWarna[wIdx].breakdown, nextWarna[wIdx].qty, saleLocation);
              const prevSaleQty = prevBreakdown.find((b) => b.location === saleLocation)?.qty ?? 0;
              nextWarna[wIdx] = {
                ...nextWarna[wIdx],
                qty: nextWarna[wIdx].qty + qty,
                breakdown: setBreakdownLocQty(prevBreakdown, saleLocation, prevSaleQty + qty),
              };
            } else {
              nextWarna.push({ nama, qty, breakdown: [{ location: saleLocation, qty }] });
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
            warna: chosen.map(([nama, qty]) => ({ nama, qty, breakdown: [{ location: saleLocation, qty }] })),
            hpp: p.hpp ?? 0,
          },
        ];
      });
    } else {
      setItems((prev) => {
        const idx = prev.findIndex((i) => i.kode === p.kode && i.size === addSize && !Array.isArray(i.warna));
        if (idx >= 0) {
          const existing = prev[idx];
          const prevBreakdown = breakdownOf(existing.breakdown, existing.qty, saleLocation);
          const prevSaleQty = prevBreakdown.find((b) => b.location === saleLocation)?.qty ?? 0;
          return prev.map((i, ii) =>
            ii === idx
              ? {
                  ...i,
                  qty: existing.qty + addQty,
                  breakdown: setBreakdownLocQty(prevBreakdown, saleLocation, prevSaleQty + addQty),
                }
              : i,
          );
        }
        return [
          ...prev,
          {
            kode: p.kode, nama: p.nama, size: addSize, harga, qty: addQty, hpp: p.hpp ?? 0,
            breakdown: [{ location: saleLocation, qty: addQty }],
          },
        ];
      });
    }

    resetAddProductForm();
  }

  const discountNum = parseInt(discount.replace(/\D/g, ""), 10) || 0;
  const subtotal = items.reduce((s, item) => s + effectiveQty(item) * item.harga, 0);
  const total = Math.max(0, subtotal - discountNum);

  const [pendingRemove, setPendingRemove] = useState(null);

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
                      <div className="mt-2 space-y-2.5">
                        {item.warna.map((w) => {
                          const breakdown = breakdownOf(w.breakdown, w.qty, saleLocation);
                          const maxByLoc = maxByLocFor(item.kode, item.size, w.nama);
                          return (
                            <div key={w.nama} className="space-y-1.5" data-testid={`warna-row-${w.nama}`}>
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-baseline gap-1.5 min-w-0">
                                  <span className="text-sm text-skin-text font-semibold truncate">{w.nama}</span>
                                  <span className="text-xs text-skin-text3 flex-shrink-0">{w.qty} pcs</span>
                                </span>
                                <button
                                  onClick={() => removeWarnaLine(idx, w.nama)}
                                  className="w-7 h-7 flex items-center justify-center text-skin-text4 hover:text-red-500 transition flex-shrink-0"
                                  title="Hapus warna ini"
                                >
                                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 6h18" />
                                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                    <line x1="10" y1="11" x2="10" y2="17" />
                                    <line x1="14" y1="11" x2="14" y2="17" />
                                  </svg>
                                </button>
                              </div>
                              <LocationQtyRow
                                breakdown={breakdown}
                                maxByLoc={maxByLoc}
                                onChange={(loc, newQty) => updateWarnaLocQty(idx, w.nama, loc, newQty)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mt-2 space-y-1.5">
                        <p className="text-sm text-skin-text font-semibold">{item.qty ?? 0} pcs</p>
                        <LocationQtyRow
                          breakdown={breakdownOf(item.breakdown, item.qty, saleLocation)}
                          maxByLoc={maxByLocFor(item.kode, item.size, "_")}
                          onChange={(loc, newQty) => updateSimpleLocQty(idx, loc, newQty)}
                        />
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
    </div>
  );
}
