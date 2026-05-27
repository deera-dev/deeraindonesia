/**
 * TransferForm.jsx
 * Form buat transfer stok baru.
 * Barang dipilih dari daftar stok nyata di lokasi asal — bukan input manual.
 *
 * Props:
 * - onClose    : () => void
 * - onSaved    : (transfer) => void
 * - initialData: object | null — kalau ada, mode edit (pre-fill)
 */
import { useState, useMemo } from "react";
import { useCreateTransfer } from "@deera/shared/hooks/useTransfers";
import { useStokByLocation } from "@deera/shared/hooks/useStokByLocation";
import { LOCATIONS, LOCATION_LABELS } from "@deera/shared/lib/marketDay";

export default function TransferForm({ onClose, onSaved, initialData = null }) {
  const isEdit = !!initialData;

  const [fromLoc, setFromLoc] = useState(initialData?.from_location ?? "gudang");
  const [toLoc, setToLoc] = useState(initialData?.to_location ?? "cideng");
  const [notes, setNotes] = useState(initialData?.notes ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  // Barang yang sudah dipilih: { [stokRowId]: qty }
  const [selected, setSelected] = useState(() => {
    if (!initialData?.items) return {};
    // Untuk edit: praisi dari items existing (belum ada stok row id, pakai kode+size+warna sebagai key)
    const init = {};
    for (const item of initialData.items) {
      const k = `${item.kode}__${item.size}__${item.warna ?? ""}`;
      init[k] = item.qty;
    }
    return init;
  });

  const { items: stokItems, loading: stokLoading } = useStokByLocation(fromLoc);

  const createTransfer = useCreateTransfer();

  // ── Reset pilihan saat fromLoc berubah ────────────────────────────────────
  function handleFromLocChange(loc) {
    setFromLoc(loc);
    setSelected({});
    setSearch("");
  }

  // ── Filtered + grouped by kode ────────────────────────────────────────────
  const groupedItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    // Filter: kalau search ada, tampilkan seluruh kode group jika kode cocok,
    // atau hanya baris size/warna yang cocok jika kode tidak cocok tapi size/warna cocok
    const groups = {};
    for (const item of stokItems) {
      const kodeMatch = item.kode.toLowerCase().includes(q);
      const sizeMatch = (item.size?.toLowerCase() ?? "").includes(q);
      const warnaMatch = (item.warna?.toLowerCase() ?? "").includes(q);
      if (q && !kodeMatch && !sizeMatch && !warnaMatch) continue;

      if (!groups[item.kode]) groups[item.kode] = [];
      // Kalau search cocok di kode → tampilkan semua baris; kalau cocok di size/warna → filter baris
      if (q && !kodeMatch && (sizeMatch || warnaMatch)) {
        groups[item.kode].push(item);
      } else {
        groups[item.kode].push(item);
      }
    }

    // Sort kode alphabetically, sort rows within kode by size then warna
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([kode, items]) => ({
        kode,
        items: items.sort((a, b) => {
          const sizeCompare = (a.size ?? "").localeCompare(b.size ?? "");
          if (sizeCompare !== 0) return sizeCompare;
          return (a.warna ?? "").localeCompare(b.warna ?? "");
        }),
      }));
  }, [stokItems, search]);

  // Key unik per baris stok
  function itemKey(item) {
    return `${item.kode}__${item.size}__${item.warna ?? ""}`;
  }

  function getQty(item) {
    return selected[itemKey(item)] ?? 0;
  }

  function getAvailable(item) {
    return item[fromLoc] ?? 0;
  }

  function setQty(item, val) {
    const qty = parseInt(val) || 0;
    const max = getAvailable(item);
    const k = itemKey(item);
    setSelected((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[k];
      } else {
        next[k] = Math.min(qty, max);
      }
      return next;
    });
  }

  function addOne(item) {
    const current = getQty(item);
    const max = getAvailable(item);
    if (current < max) setQty(item, current + 1);
  }

  function removeOne(item) {
    const current = getQty(item);
    if (current > 0) setQty(item, current - 1);
  }

  // ── Daftar item yang dipilih untuk dikirim (dari semua stokItems) ─────────
  const selectedItems = useMemo(() => {
    return stokItems
      .map((item) => {
        const qty = selected[itemKey(item)] ?? 0;
        if (qty <= 0) return null;
        return {
          kode: item.kode,
          size: item.size,
          warna: item.warna ?? null,
          qty,
          stok_id: item.id,
        };
      })
      .filter(Boolean);
  }, [selected, stokItems]);

  const totalQty = selectedItems.reduce((s, i) => s + i.qty, 0);

  // ── Submit ─────────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e?.preventDefault();
    setError("");

    if (selectedItems.length === 0) {
      setError("Pilih minimal satu barang yang akan ditransfer.");
      return;
    }
    if (fromLoc === toLoc) {
      setError("Lokasi asal dan tujuan tidak boleh sama.");
      return;
    }

    setSaving(true);
    try {
      const transfer = await createTransfer({
        fromLocation: fromLoc,
        toLocation: toLoc,
        items: selectedItems.map(({ stok_id: _id, ...rest }) => rest),
        notes,
      });
      onSaved(transfer);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition";
  const labelCls = "block text-xs tracking-[0.12em] text-skin-text3 uppercase mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-skin-card w-full max-w-lg mx-auto border-t-2 md:border-2 border-skin-bdr shadow-2xl max-h-[95dvh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-[#1A1918] px-4 py-3 flex items-center justify-between">
          <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
            {isEdit ? "Edit Transfer" : "Buat Transfer Stok"}
          </span>
          <button onClick={onClose} className="text-white/60 hover:text-white transition text-xl">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="p-4 space-y-4">
            {/* Dari → Ke */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Dari Lokasi</label>
                <select
                  value={fromLoc}
                  onChange={(e) => handleFromLocChange(e.target.value)}
                  className={inputCls}
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {LOCATION_LABELS[loc]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelCls}>Ke Lokasi</label>
                <select
                  value={toLoc}
                  onChange={(e) => setToLoc(e.target.value)}
                  className={inputCls}
                >
                  {LOCATIONS.map((loc) => (
                    <option key={loc} value={loc}>
                      {LOCATION_LABELS[loc]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {fromLoc === toLoc && (
              <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2">
                ⚠ Lokasi asal dan tujuan tidak boleh sama.
              </p>
            )}

            {/* Arah visual */}
            <div className="flex items-center justify-center gap-3 bg-skin-raised border border-skin-bdr px-4 py-2.5">
              <span className="font-semibold text-skin-text text-sm">
                {LOCATION_LABELS[fromLoc]}
              </span>
              <span className="text-[#CAB170] font-bold text-xl">→</span>
              <span className="font-semibold text-skin-text text-sm">{LOCATION_LABELS[toLoc]}</span>
            </div>

            {/* Pilih barang dari stok */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className={labelCls}>Pilih Barang dari {LOCATION_LABELS[fromLoc]}</label>
                {totalQty > 0 && (
                  <span className="text-xs font-bold text-[#CAB170]">{totalQty} pcs dipilih</span>
                )}
              </div>

              {/* Search */}
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari kode, ukuran, warna..."
                className="w-full bg-skin-page border border-skin-bdr px-3 py-2 text-xs text-skin-text focus:outline-none focus:border-[#CAB170] transition mb-2"
              />

              {stokLoading ? (
                <p className="text-xs text-skin-text3 py-4 text-center">Memuat stok...</p>
              ) : groupedItems.length === 0 ? (
                <p className="text-xs text-skin-text4 py-4 text-center">
                  {stokItems.length === 0
                    ? `Tidak ada stok di ${LOCATION_LABELS[fromLoc]}`
                    : "Tidak ada hasil pencarian"}
                </p>
              ) : (
                <div className="border border-skin-bdr max-h-72 overflow-y-auto">
                  {groupedItems.map(({ kode, items: kodeItems }) => {
                    const kodeQtyTotal = kodeItems.reduce(
                      (s, item) => s + (selected[itemKey(item)] ?? 0),
                      0,
                    );
                    return (
                      <div key={kode} className="border-b border-skin-bdr last:border-b-0">
                        {/* Header kode */}
                        <div className="flex items-center justify-between px-3 py-2 bg-skin-raised border-b border-skin-bdr-lt sticky top-0 z-10">
                          <span className="font-mono font-bold text-sm text-skin-text">{kode}</span>
                          {kodeQtyTotal > 0 && (
                            <span className="text-xs font-bold text-[#CAB170]">
                              {kodeQtyTotal} pcs
                            </span>
                          )}
                        </div>

                        {/* Baris size + warna */}
                        {kodeItems.map((item) => {
                          const qty = getQty(item);
                          const avail = getAvailable(item);
                          const isSelected = qty > 0;
                          return (
                            <div
                              key={item.id}
                              className={`flex items-center gap-3 pl-5 pr-3 py-2.5 border-b border-skin-bdr-lt last:border-b-0 transition ${
                                isSelected ? "bg-skin-gold" : "hover:bg-skin-raised"
                              }`}
                            >
                              {/* Info size + warna */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-skin-text">
                                    {item.size}
                                  </span>
                                  {item.warna && (
                                    <span className="text-xs text-skin-text3 bg-skin-page border border-skin-bdr px-1.5 py-0.5">
                                      {item.warna}
                                    </span>
                                  )}
                                </div>
                                <p
                                  className={`text-xs mt-0.5 font-medium ${avail === 0 ? "text-red-500" : avail < 3 ? "text-amber-600" : "text-green-600"}`}
                                >
                                  {avail} pcs tersedia
                                </p>
                              </div>

                              {/* Stepper */}
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                <button
                                  type="button"
                                  onClick={() => removeOne(item)}
                                  disabled={qty === 0}
                                  className="w-7 h-7 flex items-center justify-center border border-skin-bdr bg-skin-card text-skin-text2 hover:bg-skin-raised disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold"
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={avail}
                                  value={qty || ""}
                                  placeholder="0"
                                  onChange={(e) => setQty(item, e.target.value)}
                                  className="w-10 text-center border border-skin-bdr bg-skin-card text-skin-text text-sm py-1 focus:outline-none focus:border-[#CAB170]"
                                />
                                <button
                                  type="button"
                                  onClick={() => addOne(item)}
                                  disabled={qty >= avail || avail === 0}
                                  className="w-7 h-7 flex items-center justify-center border border-skin-bdr bg-skin-card text-skin-text2 hover:bg-skin-raised disabled:opacity-30 disabled:cursor-not-allowed text-base font-bold"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ringkasan barang yang dipilih */}
            {selectedItems.length > 0 && (
              <div className="bg-skin-gold border border-skin-bdr-gold p-3">
                <p className="text-xs font-semibold text-skin-text2 uppercase tracking-[0.1em] mb-2">
                  Ringkasan Transfer ({totalQty} pcs)
                </p>
                <div className="space-y-1">
                  {selectedItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-skin-text2">
                        <span className="font-semibold">{item.kode}</span> {item.size}
                        {item.warna && <span className="text-skin-text3"> · {item.warna}</span>}
                      </span>
                      <span className="font-bold text-skin-text">{item.qty} pcs</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Keterangan */}
            <div>
              <label className={labelCls}>Keterangan (opsional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Untuk event weekend Cideng..."
                rows={2}
                className={inputCls + " resize-none"}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">
                {error}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-skin-bdr grid grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="py-4 text-sm tracking-[0.08em] uppercase font-semibold text-skin-text3 hover:text-skin-text transition border-r border-skin-bdr"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || fromLoc === toLoc || selectedItems.length === 0}
            className="py-4 text-sm tracking-[0.08em] uppercase font-semibold text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50"
          >
            {saving ? "Menyimpan..." : isEdit ? "Simpan Perubahan" : "Buat Surat Jalan"}
          </button>
        </div>
      </div>
    </div>
  );
}
