import { useProducts } from "@deera/shared/features/products/hooks";
import { useStokByLocation } from "@deera/shared/features/stok/hooks";
import { useCreateTransfer } from "@deera/shared/features/transfers/hooks";
import { LOCATION_LABELS, LOCATIONS } from "@deera/shared/lib/marketDay";
import { useEffect, useMemo, useState } from "react";
import { readTransferDraft, useTransferDraftActions } from "../hooks";

function compareKodeByProductOrder(a, b, kodeOrderIndex) {
  const ia = kodeOrderIndex.has(a) ? kodeOrderIndex.get(a) : Infinity;
  const ib = kodeOrderIndex.has(b) ? kodeOrderIndex.get(b) : Infinity;
  if (ia !== ib) return ia - ib;
  return a.localeCompare(b);
}

function RingkasanAccordion({ selectedItems, totalQty, kodeOrderIndex }) {
  const [open, setOpen] = useState(false);
  const byKode = selectedItems.reduce((acc, item) => {
    acc[item.kode] = (acc[item.kode] ?? 0) + item.qty;
    return acc;
  }, {});
  const grouped = Object.entries(byKode).sort(([a], [b]) =>
    compareKodeByProductOrder(a, b, kodeOrderIndex),
  );
  return (
    <div className="border border-skin-bdr-gold bg-skin-gold">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-xs font-semibold text-skin-text2 uppercase tracking-[0.1em]"
      >
        <span>Ringkasan Transfer ({totalQty} pcs)</span>
        <span className="text-skin-text3 text-base leading-none">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-skin-bdr-gold px-3 pb-3 pt-2 space-y-1">
          {grouped.map(([kode, qty]) => (
            <div key={kode} className="flex justify-between text-xs">
              <span className="font-semibold text-skin-text2">{kode}</span>
              <span className="font-bold text-skin-text">{qty} pcs</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TransferForm({
  onClose,
  onSaved,
  initialData = null,
  duplicateData = null,
}) {
  const isEdit = !!initialData;
  const isDuplicate = !!duplicateData;

  const draft = !isEdit && !isDuplicate ? readTransferDraft() : null;
  const { saveDraft, clearDraft: clearDraftStorage } = useTransferDraftActions();

  const [fromLoc, setFromLoc] = useState(
    draft?.fromLoc ?? initialData?.from_location ?? duplicateData?.from_location ?? "gudang",
  );
  const [toLoc, setToLoc] = useState(() => {
    const saved =
      draft?.toLoc ?? initialData?.to_location ?? duplicateData?.to_location ?? "cideng";
    return LOCATIONS.includes(saved) ? saved : "cideng";
  });
  const [useCustomToLoc, setUseCustomToLoc] = useState(() => {
    const saved = draft?.useCustomToLoc;
    if (saved !== undefined) return saved;
    if (isEdit && initialData?.to_location && !LOCATIONS.includes(initialData.to_location))
      return true;
    return false;
  });
  const [customToLocText, setCustomToLocText] = useState(() => {
    if (draft?.customToLocText !== undefined) return draft.customToLocText;
    if (isEdit && initialData?.to_location && !LOCATIONS.includes(initialData.to_location))
      return initialData.to_location;
    return "";
  });
  const [notes, setNotes] = useState(
    draft?.notes ?? initialData?.notes ?? duplicateData?.notes ?? "",
  );

  const effectiveToLoc = useCustomToLoc ? customToLocText.trim() : toLoc;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [hasDraft, setHasDraft] = useState(
    !isEdit && !isDuplicate && !!draft && Object.keys(draft?.selected ?? {}).length > 0,
  );

  const [selected, setSelected] = useState(() => {
    if (isEdit) {
      if (!initialData?.items) return {};
      const init = {};
      for (const item of initialData.items) {
        const k = `${item.kode}__${item.size}__${item.warna ?? ""}`;
        init[k] = item.qty;
      }
      return init;
    }
    if (isDuplicate) return {};
    return draft?.selected ?? {};
  });
  const [duplicateSeeded, setDuplicateSeeded] = useState(false);
  const [duplicateDropped, setDuplicateDropped] = useState(0);

  useEffect(() => {
    if (isEdit || isDuplicate) return;
    saveDraft({ fromLoc, toLoc, notes, selected, useCustomToLoc, customToLocText });
  }, [fromLoc, toLoc, notes, selected, useCustomToLoc, customToLocText, isEdit, isDuplicate]);

  function clearDraft() {
    clearDraftStorage();
    setHasDraft(false);
  }

  const { items: stokItems, loading: stokLoading } = useStokByLocation(fromLoc);
  const { products } = useProducts();

  useEffect(() => {
    if (!isDuplicate || duplicateSeeded || stokLoading) return;
    const seeded = {};
    let dropped = 0;
    for (const di of duplicateData.items ?? []) {
      const stockRow = stokItems.find(
        (it) => it.kode === di.kode && it.size === di.size && (it.warna ?? "") === (di.warna ?? ""),
      );
      const avail = stockRow ? (stockRow[fromLoc] ?? 0) : 0;
      const qty = Math.min(di.qty, avail);
      if (qty > 0) {
        seeded[`${di.kode}__${di.size}__${di.warna ?? ""}`] = qty;
      } else {
        dropped += 1;
      }
    }
    setSelected(seeded);
    setDuplicateDropped(dropped);
    setDuplicateSeeded(true);
  }, [isDuplicate, duplicateSeeded, stokLoading, stokItems, fromLoc, duplicateData]);

  const kodeOrderIndex = useMemo(() => {
    const map = new Map();
    (products ?? []).forEach((p, i) => map.set(p.kode, i));
    return map;
  }, [products]);

  const createTransfer = useCreateTransfer();

  function handleFromLocChange(loc) {
    setFromLoc(loc);
    setSelected({});
    setSearch("");
  }

  function swapLocations() {
    if (useCustomToLoc) return;
    const newFrom = toLoc;
    const newTo = fromLoc;
    handleFromLocChange(newFrom);
    setToLoc(newTo);
  }

  const groupedItems = useMemo(() => {
    const q = search.trim().toLowerCase();

    const groups = {};
    for (const item of stokItems) {
      const kodeMatch = item.kode.toLowerCase().includes(q);
      const sizeMatch = (item.size?.toLowerCase() ?? "").includes(q);
      const warnaMatch = (item.warna?.toLowerCase() ?? "").includes(q);
      if (q && !kodeMatch && !sizeMatch && !warnaMatch) continue;

      if (!groups[item.kode]) groups[item.kode] = [];
      if (q && !kodeMatch && (sizeMatch || warnaMatch)) {
        groups[item.kode].push(item);
      } else {
        groups[item.kode].push(item);
      }
    }

    return Object.entries(groups)
      .sort(([a], [b]) => compareKodeByProductOrder(a, b, kodeOrderIndex))
      .map(([kode, items]) => ({
        kode,
        items: items.sort((a, b) => {
          const sizeCompare = (a.size ?? "").localeCompare(b.size ?? "");
          if (sizeCompare !== 0) return sizeCompare;
          return (a.warna ?? "").localeCompare(b.warna ?? "");
        }),
      }));
  }, [stokItems, search, kodeOrderIndex]);

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

  function seriPenuh(kodeItems) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const item of kodeItems) {
        const avail = getAvailable(item);
        if (avail <= 0) continue;
        const k = itemKey(item);
        const current = prev[k] ?? 0;
        next[k] = Math.min(current + 1, avail);
      }
      return next;
    });
  }

  function resetKode(kodeItems) {
    setSelected((prev) => {
      const next = { ...prev };
      for (const item of kodeItems) {
        delete next[itemKey(item)];
      }
      return next;
    });
  }

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

  async function handleSubmit(e) {
    e?.preventDefault();
    setError("");

    if (selectedItems.length === 0) {
      setError("Pilih minimal satu barang yang akan ditransfer.");
      return;
    }
    if (useCustomToLoc && !customToLocText.trim()) {
      setError("Isi nama lokasi tujuan.");
      return;
    }
    if (fromLoc === effectiveToLoc) {
      return;
    }

    setSaving(true);
    try {
      const transfer = await createTransfer({
        fromLocation: fromLoc,
        toLocation: effectiveToLoc,
        items: selectedItems.map(({ stok_id: _id, ...rest }) => rest),
        notes,
      });
      clearDraft();
      onSaved(transfer);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls =
    "w-full bg-skin-page border border-skin-bdr px-3 py-2 text-sm text-skin-text focus:outline-none focus:border-skin-accent transition";
  const labelCls = "block text-xs tracking-[0.12em] text-skin-text3 uppercase mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative bg-skin-card w-full max-w-lg mx-auto border-t-2 md:border-2 border-skin-bdr shadow-2xl h-[100dvh] md:h-[95dvh] flex flex-col">
        <div className="flex-shrink-0 bg-skin-header px-4 py-3 flex items-center justify-between">
          <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
            {isEdit
              ? "Edit Transfer"
              : isDuplicate
                ? "Salin & Balik Transfer"
                : "Buat Transfer Stok"}
          </span>
          <button onClick={onClose} className="text-white/60 hover:text-white transition text-xl">
            ✕
          </button>
        </div>

        {isDuplicate && (
          <div className="shrink-0 px-4 py-2 bg-sky-50 border-b border-sky-200 text-xs text-sky-700">
            <p>
              Qty otomatis disesuaikan dengan stok yang tersedia sekarang di{" "}
              {LOCATION_LABELS[fromLoc] ?? fromLoc}.
            </p>
            {duplicateSeeded && duplicateDropped > 0 && (
              <p className="mt-0.5">
                {duplicateDropped} item tidak disertakan karena stoknya sudah kosong.
              </p>
            )}
          </div>
        )}

        {hasDraft && (
          <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
            <span>Draft tersimpan dipulihkan.</span>
            <button
              type="button"
              onClick={() => {
                clearDraft();
                setSelected({});
                setFromLoc("gudang");
                setToLoc("cideng");
                setNotes("");
              }}
              className="underline hover:text-amber-900"
            >
              Hapus draft
            </button>
          </div>
        )}

        <div className="shrink-0 px-4 pt-4 pb-2 space-y-3 border-b border-skin-bdr-lt">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
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
            <button
              type="button"
              onClick={swapLocations}
              disabled={useCustomToLoc}
              title={
                useCustomToLoc
                  ? "Tidak bisa ditukar saat Ke Lokasi custom"
                  : "Tukar lokasi asal ↔ tujuan"
              }
              aria-label="Tukar lokasi asal dan tujuan"
              className="mt-[26px] w-9 h-9 flex-shrink-0 flex items-center justify-center border border-skin-bdr text-skin-text3 hover:text-skin-accent-text hover:border-skin-accent transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ⇄
            </button>
            <div className="flex-1 min-w-0">
              <label className={labelCls}>Ke Lokasi</label>
              {useCustomToLoc ? (
                <input
                  type="text"
                  value={customToLocText}
                  onChange={(e) => setCustomToLocText(e.target.value)}
                  placeholder="Cth: Reseller Bandung"
                  className={inputCls}
                  autoFocus
                />
              ) : (
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
              )}
              <button
                type="button"
                onClick={() => {
                  setUseCustomToLoc((v) => !v);
                  setCustomToLocText("");
                }}
                className="mt-1 text-[10px] font-editorial tracking-[0.12em] uppercase text-skin-text3 hover:text-skin-accent-text transition underline"
              >
                {useCustomToLoc ? "← Pilih dari daftar" : "Lokasi lain →"}
              </button>
            </div>
          </div>
          {!useCustomToLoc && fromLoc === toLoc && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2">
              ⚠ Lokasi asal dan tujuan tidak boleh sama.
            </p>
          )}
          {useCustomToLoc && customToLocText.trim() && (
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-3 py-2">
              ⚠ Stok tidak akan bertambah di lokasi ini (lokasi di luar sistem). Hanya stok di{" "}
              {LOCATION_LABELS[fromLoc] ?? fromLoc} yang berkurang saat disetujui.
            </p>
          )}
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan (opsional)"
            className="w-full bg-skin-page border border-skin-bdr px-3 py-2 text-xs text-skin-text focus:outline-none focus:border-skin-accent transition"
          />
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari kode, ukuran, warna..."
              className="flex-1 bg-skin-page border border-skin-bdr px-3 py-2 text-xs text-skin-text focus:outline-none focus:border-skin-accent transition"
            />
            {totalQty > 0 && (
              <span className="shrink-0 text-xs font-bold text-skin-accent-text">
                {totalQty} pcs
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {stokLoading ? (
            <p className="text-xs text-skin-text3 py-8 text-center">Memuat stok...</p>
          ) : groupedItems.length === 0 ? (
            <p className="text-xs text-skin-text4 py-8 text-center">
              {stokItems.length === 0
                ? `Tidak ada stok di ${LOCATION_LABELS[fromLoc]}`
                : "Tidak ada hasil pencarian"}
            </p>
          ) : (
            <div className="divide-y divide-skin-bdr">
              {groupedItems.map(({ kode, items: kodeItems }) => {
                const kodeQtyTotal = kodeItems.reduce(
                  (s, item) => s + (selected[itemKey(item)] ?? 0),
                  0,
                );
                return (
                  <div key={kode} className="border-b border-skin-bdr last:border-b-0">
                    <div className="flex items-center justify-between px-3 py-2 bg-skin-raised border-b border-skin-bdr-lt sticky top-0 z-10">
                      <span className="font-mono font-bold text-sm text-skin-text">{kode}</span>
                      <div className="flex items-center gap-2">
                        {kodeQtyTotal > 0 && (
                          <span className="text-xs font-bold text-skin-accent-text">
                            {kodeQtyTotal} pcs
                          </span>
                        )}
                        {kodeQtyTotal > 0 && (
                          <button
                            type="button"
                            onClick={() => resetKode(kodeItems)}
                            className="text-[10px] tracking-[0.1em] uppercase font-editorial px-2 py-0.5 border border-skin-bdr text-skin-text3 hover:border-red-400 hover:text-red-500 transition"
                          >
                            Reset
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => seriPenuh(kodeItems)}
                          className="text-[10px] tracking-[0.1em] uppercase font-editorial px-2 py-0.5 border border-skin-accent text-skin-accent-text hover:bg-skin-accent hover:text-white transition"
                        >
                          Seri Penuh
                        </button>
                      </div>
                    </div>

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
                              className="w-10 text-center border border-skin-bdr bg-skin-card text-skin-text text-sm py-1 focus:outline-none focus:border-skin-accent"
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

        <div className="shrink-0">
          {selectedItems.length > 0 && (
            <RingkasanAccordion
              selectedItems={selectedItems}
              totalQty={totalQty}
              kodeOrderIndex={kodeOrderIndex}
            />
          )}
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 px-3 py-2">
              {error}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr grid grid-cols-2">
          <button
            type="button"
            onClick={onClose}
            className="py-4 text-sm tracking-[0.08em] uppercase font-semibold text-skin-text3 hover:text-skin-text transition border-r border-skin-bdr"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              saving || selectedItems.length === 0 || (useCustomToLoc && !customToLocText.trim())
            }
            className="py-4 text-sm tracking-[0.08em] uppercase font-semibold text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-40"
          >
            {saving ? "Menyimpan..." : isEdit ? "Perbarui" : "Buat Surat Jalan"}
          </button>
        </div>
      </div>
    </div>
  );
}
