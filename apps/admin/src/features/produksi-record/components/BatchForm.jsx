/**
 * BatchForm.jsx — Form batch produksi.
 *
 * Mode tambah: bisa input beberapa produk sekaligus (1 gelaran = 2-3 produk).
 *   - Shared: batch_no, tanggal, catatan
 *   - Per produk: kode, nama, bahan, ukuran, warna, qty
 *   - Template HPP di-load otomatis per kode
 *
 * Mode edit: edit satu batch (single-product, perilaku asli).
 */
import { useState, useEffect } from "react";
import { useInvalidateProducts } from "@deera/shared/features/products/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { fetchHppTemplate, useCreateBatches, useUpdateBatch } from "../hooks";
import {
  buildKode,
  entryTotalKain,
  genBatchNo,
  initQtyMap,
  initVariants,
  initWarnaList,
  inputCls,
  labelCls,
  newEntry,
  parseKode,
} from "../utils";
import ProductEntryCard from "./ProductEntryCard";

export default function BatchForm({ initial, onSave, onCancel }) {
  const invalidateProducts = useInvalidateProducts();
  const createBatches = useCreateBatches();
  const updateBatch = useUpdateBatch();
  const isEdit = !!initial;
  const today = new Date().toISOString().split("T")[0];

  // ── Shared (both modes) ─────────────────────────────────────
  const [batchNo, setBatchNo] = useState(initial?.batch_no ?? genBatchNo());
  const [tanggal, setTanggal] = useState(initial?.tanggal_produksi ?? today);
  const [catatan, setCatatan] = useState(initial?.catatan ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  // ── Edit mode: single-product state ─────────────────────────
  const { angka: initAngka, bahan: initBahanKode } = isEdit
    ? parseKode(initial.kode_produk)
    : { angka: "", bahan: "" };
  const [kodeAngka, setKodeAngka] = useState(isEdit ? initAngka : "");
  const [kodeBahan, setKodeBahan] = useState(isEdit ? initBahanKode : "");
  const [nama, setNama] = useState(initial?.nama_produk ?? "");
  const [variants, setVariants] = useState(
    isEdit ? initVariants(initial.sizes) : initVariants([]),
  );
  const [warnaInput, setWarnaInput] = useState("");
  const [warnaList, setWarnaList] = useState(isEdit ? initWarnaList(initial.sizes) : []);
  const [qtyMap, setQtyMap] = useState(isEdit ? initQtyMap(initial.sizes) : {});
  const [template, setTemplate] = useState(null);
  const [loadingTpl, setLoadingTpl] = useState(false);

  const editKode = buildKode(kodeAngka, kodeBahan);
  const editActiveVariants = variants.filter((v) => v.aktif);
  const editEffectiveWarna = warnaList.length > 0 ? warnaList : ["_"];
  const editTotalKain = Object.values(qtyMap).reduce(
    (s, wMap) => s + Object.values(wMap).reduce((ss, q) => ss + (Number(q) || 0), 0),
    0,
  );

  // Auto-load template in edit mode
  useEffect(() => {
    if (!isEdit) return;
    if (!editKode || !editKode.match(/^D-\w+-[A-Z]+$/i)) {
      setTemplate(null);
      return;
    }
    setLoadingTpl(true);
    fetchHppTemplate(editKode).then((t) => {
      setTemplate(t);
      setLoadingTpl(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editKode, isEdit]);

  // ── New mode + edit mode additional products ────────────────
  // In new mode: starts with 1 entry. In edit mode: starts empty (for "add more products to batch").
  const [productEntries, setProductEntries] = useState(() => (isEdit ? [] : [newEntry()]));

  const kodeValues = productEntries.map((e) => buildKode(e.kodeAngka, e.kodeBahan));

  // Auto-fetch HPP template for each entry when kode is complete
  useEffect(() => {
    if (isEdit) return;
    productEntries.forEach((entry, idx) => {
      const kode = buildKode(entry.kodeAngka, entry.kodeBahan);
      if (!kode || !kode.match(/^D-\w+-[A-Z]+$/i)) return;
      if (entry.templateFetched === kode) return; // already fetched this kode
      setProductEntries((prev) =>
        prev.map((e, i) => (i === idx ? { ...e, loadingTpl: true, templateFetched: kode } : e)),
      );
      fetchHppTemplate(kode).then((t) => {
        setProductEntries((prev) =>
          prev.map((e, i) => (i === idx ? { ...e, template: t ?? false, loadingTpl: false } : e)),
        );
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, kodeValues.join(",")]);

  function updateEntry(idx, updates) {
    setProductEntries((prev) => prev.map((e, i) => (i === idx ? { ...e, ...updates } : e)));
  }

  function removeEntry(idx) {
    setProductEntries((prev) => prev.filter((_, i) => i !== idx));
  }

  function addEntry() {
    setProductEntries((prev) => [...prev, newEntry()]);
  }

  // ── Edit mode helpers ───────────────────────────────────────
  function editAddWarna() {
    const w = warnaInput.trim().toUpperCase();
    if (w && !warnaList.includes(w)) setWarnaList((prev) => [...prev, w]);
    setWarnaInput("");
  }
  function editRemoveWarna(w) {
    setWarnaList((prev) => prev.filter((x) => x !== w));
    setQtyMap((prev) => {
      const next = { ...prev };
      for (const size of Object.keys(next)) {
        if (next[size]) {
          const s = { ...next[size] };
          delete s[w];
          next[size] = s;
        }
      }
      return next;
    });
  }
  function editSetQty(size, warna, val) {
    setQtyMap((prev) => ({ ...prev, [size]: { ...(prev[size] ?? {}), [warna]: val } }));
  }

  // ── New mode per-entry helpers ──────────────────────────────
  function entryAddWarna(idx) {
    const entry = productEntries[idx];
    const w = entry.warnaInput.trim().toUpperCase();
    if (!w || entry.warnaList.includes(w)) {
      updateEntry(idx, { warnaInput: "" });
      return;
    }
    updateEntry(idx, { warnaList: [...entry.warnaList, w], warnaInput: "" });
  }
  function entryRemoveWarna(idx, w) {
    const entry = productEntries[idx];
    const newMap = { ...entry.qtyMap };
    for (const size of Object.keys(newMap)) {
      if (newMap[size]) {
        const s = { ...newMap[size] };
        delete s[w];
        newMap[size] = s;
      }
    }
    updateEntry(idx, { warnaList: entry.warnaList.filter((x) => x !== w), qtyMap: newMap });
  }
  function entrySetQty(idx, size, warna, val) {
    const entry = productEntries[idx];
    updateEntry(idx, {
      qtyMap: { ...entry.qtyMap, [size]: { ...(entry.qtyMap[size] ?? {}), [warna]: val } },
    });
  }
  function entryToggleVariant(idx, vidx) {
    const entry = productEntries[idx];
    updateEntry(idx, {
      variants: entry.variants.map((v, i) => (i === vidx ? { ...v, aktif: !v.aktif } : v)),
    });
  }

  // ── Bangun DTO siap-simpan dari satu entry (sudah divalidasi) ────────────
  function buildEntryDto(entry, errLabel) {
    const entryKode = buildKode(entry.kodeAngka, entry.kodeBahan);
    if (!entryKode) throw new Error(`${errLabel}: kode produk belum lengkap.`);
    if (!entry.nama.trim()) throw new Error(`${errLabel}: nama produk wajib diisi.`);
    const activeV = entry.variants.filter((v) => v.aktif);
    if (activeV.length === 0) throw new Error(`${entryKode}: pilih minimal 1 ukuran.`);
    const totalK = entryTotalKain(entry);
    if (totalK === 0) throw new Error(`${entryKode}: isi qty produksi minimal 1.`);
    const effWarna = entry.warnaList.length > 0 ? entry.warnaList : ["_"];

    const sizes = [];
    for (const v of activeV) {
      const warnaItems = effWarna
        .map((w) => ({ warna: w, qty: Number(entry.qtyMap[v.size]?.[w]) || 0 }))
        .filter((x) => x.qty > 0);
      if (warnaItems.length > 0) sizes.push({ size: v.size, warna: warnaItems });
    }

    return {
      kode: entryKode,
      nama: entry.nama.trim(),
      bahan: entry.bahan.trim(),
      activeVariants: activeV,
      warnaList: entry.warnaList,
      sizes,
      totalKain: totalK,
      template: entry.template || null,
    };
  }

  // ── Submit ──────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      if (isEdit) {
        // ── Mode Edit ──────────────────────────────────────────
        if (!editKode) throw new Error("Kode produk wajib diisi.");
        if (editActiveVariants.length === 0) throw new Error("Pilih minimal 1 ukuran.");
        if (editTotalKain === 0) throw new Error("Isi qty produksi minimal 1.");

        const sizes = [];
        for (const v of editActiveVariants) {
          const warnaItems = editEffectiveWarna
            .map((w) => ({ warna: w, qty: Number(qtyMap[v.size]?.[w]) || 0 }))
            .filter((x) => x.qty > 0);
          if (warnaItems.length > 0) sizes.push({ size: v.size, warna: warnaItems });
        }
        const bahanDipakai =
          (initial.hpp_snapshot ?? template)?.bahan_items?.map((b) => ({
            nama_bahan: b.nama_bahan,
            kode_bahan: b.kode_bahan ?? "",
            satuan: b.satuan,
            jumlah: Math.round((Number(b.qty_per_baju) || 0) * editTotalKain * 100) / 100,
          })) ??
          initial.bahan_dipakai ??
          [];

        const extraEntries = productEntries.map((entry, idx) =>
          buildEntryDto(entry, `Produk tambahan ${idx + 1}`),
        );

        await updateBatch(
          { initial, kode: editKode, nama: nama.trim(), tanggal, totalKain: editTotalKain, sizes, bahanDipakai, batchNo, catatan },
          extraEntries,
          { batchNo, tanggal, catatan },
        );

        invalidateProducts();
      } else {
        // ── Mode Tambah: loop semua entries ───────────────────
        if (productEntries.length === 0) throw new Error("Tambah minimal 1 produk.");

        const entries = productEntries.map((entry, idx) => buildEntryDto(entry, `Produk ${idx + 1}`));

        await createBatches(entries, { batchNo, tanggal, catatan });

        invalidateProducts();
      }

      const msg =
        !isEdit && productEntries.length > 1
          ? `${productEntries.length} produk & batch berhasil dibuat.`
          : isEdit
            ? `Batch ${batchNo} berhasil diperbarui.`
            : `Batch ${batchNo} berhasil dibuat.`;
      toast.success(msg);
      await onSave();
    } catch (e) {
      setErr(e.message);
      toast.error("Gagal simpan: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Kalkulasi summary (new mode) ────────────────────────────
  const totalBajuAll = productEntries.reduce((s, e) => s + entryTotalKain(e), 0);

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-5">
        {/* ── Info Batch (shared) ── */}
        <section className="space-y-3">
          <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
            Info Batch
          </p>
          <div>
            <label className={labelCls}>No. Batch</label>
            <input
              type="text"
              className={inputCls}
              value={batchNo}
              onChange={(e) => setBatchNo(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Tanggal Produksi</label>
            <input
              type="date"
              className={inputCls}
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
          <div>
            <label className={labelCls}>Catatan</label>
            <textarea
              rows={2}
              className={inputCls}
              placeholder="Opsional..."
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
            />
          </div>
        </section>

        {/* ────────────────────────────────────────────────────── */}
        {/* ── EDIT MODE ── */}
        {isEdit && (
          <>
            <section className="space-y-3">
              <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
                Identitas Produk
              </p>
              <div>
                <label className={labelCls}>Kode Produk</label>
                <div className="flex gap-2 items-center">
                  <span className="text-sm text-skin-text3 shrink-0">D -</span>
                  <input
                    type="text"
                    placeholder="07"
                    className={inputCls + " flex-1"}
                    value={kodeAngka}
                    onChange={(e) => setKodeAngka(e.target.value)}
                  />
                  <span className="text-sm text-skin-text3 shrink-0">-</span>
                  <input
                    type="text"
                    placeholder="OSK"
                    className={inputCls + " flex-1 uppercase"}
                    value={kodeBahan}
                    onChange={(e) => setKodeBahan(e.target.value.toUpperCase())}
                  />
                </div>
                {editKode && (
                  <p className="text-xs text-skin-text3 mt-1">
                    Kode: <span className="font-semibold text-[#CAB170]">{editKode}</span>
                    {editKode !== initial.kode_produk && (
                      <span className="ml-2 text-amber-500">⚠ berubah dari {initial.kode_produk}</span>
                    )}
                  </p>
                )}
              </div>
              <div>
                <label className={labelCls}>Nama Produk</label>
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Cth: Gamis Wolfis Polos"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                />
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
                Ukuran <span className="normal-case text-skin-text3">(pilih ukuran yang diproduksi)</span>
              </p>
              {variants.map((v, idx) => (
                <label key={v.size} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 accent-[#CAB170]"
                    checked={v.aktif}
                    onChange={() =>
                      setVariants((prev) => prev.map((vv, i) => (i === idx ? { ...vv, aktif: !vv.aktif } : vv)))
                    }
                  />
                  <span className="text-sm text-skin-text2">{v.size}</span>
                  <span className="text-xs text-skin-text3">
                    LD {v.ld} · PB {v.pb}
                  </span>
                </label>
              ))}
            </section>

            <section className="space-y-3">
              <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
                Warna
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={inputCls}
                  placeholder="Cth: HITAM"
                  value={warnaInput}
                  onChange={(e) => setWarnaInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      editAddWarna();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={editAddWarna}
                  className="px-4 py-2.5 text-sm font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition shrink-0"
                >
                  Tambah
                </button>
              </div>
              {warnaList.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {warnaList.map((w) => (
                    <span
                      key={w}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-skin-raised border border-skin-bdr text-sm"
                    >
                      {w}
                      <button
                        type="button"
                        onClick={() => editRemoveWarna(w)}
                        className="text-red-400 hover:text-red-600 leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </section>

            {editActiveVariants.length > 0 && (
              <section className="space-y-3">
                <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
                  Qty Produksi{" "}
                  <span className="normal-case text-skin-text3">— expected ({editTotalKain} total)</span>
                </p>
                {editActiveVariants.map((v) => (
                  <div key={v.size}>
                    <p className="text-xs font-semibold text-skin-text2 mb-2">{v.size}</p>
                    <div className="space-y-2">
                      {editEffectiveWarna.map((w) => (
                        <div key={w} className="flex items-center gap-3">
                          <span className="w-24 shrink-0 text-sm text-skin-text3">
                            {w === "_" ? "— (tanpa warna)" : w}
                          </span>
                          <input
                            type="number"
                            min="0"
                            className={inputCls}
                            placeholder="0"
                            value={qtyMap[v.size]?.[w] ?? ""}
                            onChange={(e) => editSetQty(v.size, w, e.target.value)}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </>
        )}

        {/* ── NEW MODE: multi-product entries / EDIT MODE: additional products ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-skin-bdr-lt">
            <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3">
              {isEdit ? (
                <>
                  Tambah Produk ke Batch Ini
                  {productEntries.length > 0 && (
                    <span className="ml-2 normal-case font-normal text-skin-text3">
                      ({productEntries.length} produk)
                    </span>
                  )}
                </>
              ) : (
                <>
                  Produk
                  {productEntries.length > 1 && (
                    <span className="ml-2 normal-case font-normal text-skin-text3">
                      ({productEntries.length} produk · {totalBajuAll} baju total)
                    </span>
                  )}
                </>
              )}
            </p>
            <button
              type="button"
              onClick={addEntry}
              className="text-xs font-editorial tracking-[0.15em] uppercase text-[#CAB170] hover:text-[#A8925A] transition"
            >
              + Tambah Produk
            </button>
          </div>

          {productEntries.map((entry, idx) => (
            <ProductEntryCard
              key={entry._key}
              entry={entry}
              idx={idx}
              canRemove={productEntries.length > 1}
              onToggleExpand={() => updateEntry(idx, { expanded: !entry.expanded })}
              onRemove={() => removeEntry(idx)}
              onKodeAngkaChange={(v) => updateEntry(idx, { kodeAngka: v, templateFetched: "" })}
              onKodeBahanChange={(v) => updateEntry(idx, { kodeBahan: v.toUpperCase(), templateFetched: "" })}
              onNamaChange={(v) => updateEntry(idx, { nama: v })}
              onBahanChange={(v) => updateEntry(idx, { bahan: v })}
              onToggleVariant={(vidx) => entryToggleVariant(idx, vidx)}
              onWarnaInputChange={(v) => updateEntry(idx, { warnaInput: v.toUpperCase() })}
              onAddWarna={() => entryAddWarna(idx)}
              onRemoveWarna={(w) => entryRemoveWarna(idx, w)}
              onSetQty={(size, warna, val) => entrySetQty(idx, size, warna, val)}
            />
          ))}
        </section>

        {err && <p className="text-sm text-red-500 py-1">{err}</p>}
      </div>
      {/* end scrollable content */}

      <div className="shrink-0 border-t border-skin-bdr-lt px-4 pt-3 pb-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 hover:border-skin-text2 transition"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving || (!isEdit && totalBajuAll === 0) || (isEdit && editTotalKain === 0)}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-60"
        >
          {saving
            ? "Menyimpan..."
            : isEdit
              ? productEntries.length > 0
                ? `Simpan + Tambah ${productEntries.length} Produk`
                : "Simpan Perubahan"
              : productEntries.length > 1
                ? `Buat ${productEntries.length} Produk & Batch`
                : "Buat Produk & Batch"}
        </button>
      </div>
    </form>
  );
}
