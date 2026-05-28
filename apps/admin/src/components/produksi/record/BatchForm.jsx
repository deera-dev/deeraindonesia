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
import { supabase } from "@deera/shared/lib/supabase";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { invalidateProducts } from "@deera/shared/hooks/useProducts";
import { logHistory } from "../../../hooks/useHistory";
import { toast } from "@deera/shared/lib/toast";
import { fmtRp, genBatchNo, buildKode, inputCls, labelCls } from "./recordUtils";

async function fetchTemplate(kode_produk) {
  if (!kode_produk) return null;
  const { data } = await supabase
    .from("hpp_template")
    .select("*")
    .eq("kode_produk", kode_produk)
    .single();
  return data ?? null;
}

function parseKode(kode) {
  const m = (kode ?? "").match(/^D-(\w+)-([A-Z]+)$/i);
  return m ? { angka: m[1], bahan: m[2].toUpperCase() } : { angka: "", bahan: "" };
}

function initVariants(sizes) {
  const aktifSet = new Set((sizes ?? []).map((s) => s.size));
  return SIZE_PRESETS.map((p) => ({ ...p, aktif: aktifSet.has(p.size) }));
}

function initWarnaList(sizes) {
  const warnas = new Set();
  for (const sz of sizes ?? []) {
    for (const w of sz.warna ?? []) {
      if (w.warna !== "_") warnas.add(w.warna);
    }
  }
  return [...warnas];
}

function initQtyMap(sizes) {
  const map = {};
  for (const sz of sizes ?? []) {
    map[sz.size] = {};
    for (const w of sz.warna ?? []) {
      map[sz.size][w.warna] = w.qty;
    }
  }
  return map;
}

function newEntry() {
  return {
    _key: Math.random(),
    kodeAngka: "",
    kodeBahan: "",
    nama: "",
    bahan: "",
    variants: SIZE_PRESETS.map((s) => ({ ...s, aktif: false })),
    warnaInput: "",
    warnaList: [],
    qtyMap: {},
    template: null,       // null = not fetched, false = not found, object = found
    loadingTpl: false,
    templateFetched: "",  // track last fetched kode to avoid re-fetch
    expanded: true,
  };
}

function entryTotalKain(entry) {
  return Object.values(entry.qtyMap).reduce(
    (s, wMap) => s + Object.values(wMap).reduce((ss, q) => ss + (Number(q) || 0), 0),
    0,
  );
}

export default function BatchForm({ initial, onSave, onCancel }) {
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
    isEdit ? initVariants(initial.sizes) : SIZE_PRESETS.map((s) => ({ ...s, aktif: false })),
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
    if (!editKode || !editKode.match(/^D-\w+-[A-Z]+$/i)) { setTemplate(null); return; }
    setLoadingTpl(true);
    fetchTemplate(editKode).then((t) => { setTemplate(t); setLoadingTpl(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editKode, isEdit]);

  // ── New mode: multi-product state ───────────────────────────
  const [productEntries, setProductEntries] = useState(() => [newEntry()]);

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
      fetchTemplate(kode).then((t) => {
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
        if (next[size]) { const s = { ...next[size] }; delete s[w]; next[size] = s; }
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
    if (!w || entry.warnaList.includes(w)) { updateEntry(idx, { warnaInput: "" }); return; }
    updateEntry(idx, { warnaList: [...entry.warnaList, w], warnaInput: "" });
  }
  function entryRemoveWarna(idx, w) {
    const entry = productEntries[idx];
    const newMap = { ...entry.qtyMap };
    for (const size of Object.keys(newMap)) {
      if (newMap[size]) { const s = { ...newMap[size] }; delete s[w]; newMap[size] = s; }
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

  // ── Submit ──────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    setSaving(true);
    try {
      if (isEdit) {
        // ── Mode Edit ──────────────────────────────────────────
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
          })) ?? initial.bahan_dipakai ?? [];

        const { error: batchErr } = await supabase
          .from("produksi_batch")
          .update({ batch_no: batchNo, nama_produk: nama.trim(), tanggal_produksi: tanggal,
            total_kain: editTotalKain, sizes, bahan_dipakai: bahanDipakai, catatan })
          .eq("id", initial.id);
        if (batchErr) throw new Error(batchErr.message);

        const expectedRows = [];
        for (const sz of sizes) for (const w of sz.warna ?? []) {
          expectedRows.push({ kode: editKode, size: sz.size, warna: w.warna, expected_qty: w.qty });
        }
        if (expectedRows.length > 0)
          await supabase.from("expected_stok").upsert(expectedRows, { onConflict: "kode,size,warna" });

        logHistory({ action: "batch-produksi", category: "produksi", kode: editKode, nama: nama.trim(),
          snapshot: { batch_no: batchNo, tanggal, total_kain: editTotalKain, sizes, catatan, edit: true },
          before: { batch_no: initial.batch_no, tanggal: initial.tanggal_produksi, total_kain: initial.total_kain },
        }).catch(() => {});

      } else {
        // ── Mode Tambah: loop semua entries ───────────────────
        if (productEntries.length === 0) throw new Error("Tambah minimal 1 produk.");

        for (const [idx, entry] of productEntries.entries()) {
          const entryKode = buildKode(entry.kodeAngka, entry.kodeBahan);
          if (!entryKode) throw new Error(`Produk ${idx + 1}: kode produk belum lengkap.`);
          if (!entry.nama.trim()) throw new Error(`Produk ${idx + 1}: nama produk wajib diisi.`);
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

          const tpl = entry.template || null;
          const bahanDipakai =
            tpl?.bahan_items?.map((b) => ({
              nama_bahan: b.nama_bahan,
              kode_bahan: b.kode_bahan ?? "",
              satuan: b.satuan,
              jumlah: Math.round((Number(b.qty_per_baju) || 0) * totalK * 100) / 100,
            })) ?? [];

          // Upsert produk
          const { error: prodErr } = await supabase.from("products").upsert(
            { kode: entryKode, nama: entry.nama.trim(), bahan: entry.bahan.trim() || null,
              hpp: tpl?.total_hpp ?? 0,
              variants: activeV.map((v) => ({ size: v.size, harga: 0, ld: v.ld, pb: v.pb })),
              warna: entry.warnaList.length > 0 ? entry.warnaList : [] },
            { onConflict: "kode" },
          );
          if (prodErr) throw new Error(prodErr.message);

          // Insert batch
          const { error: batchErr } = await supabase.from("produksi_batch").insert({
            batch_no: batchNo,
            kode_produk: entryKode,
            nama_produk: entry.nama.trim(),
            tanggal_produksi: tanggal,
            total_kain: totalK,
            sizes,
            bahan_dipakai: bahanDipakai,
            hpp_snapshot: tpl,
            hpp_per_item: tpl?.total_hpp ?? 0,
            catatan,
          });
          if (batchErr) throw new Error(batchErr.message);

          // Upsert expected_stok
          const expectedRows = [];
          for (const sz of sizes) for (const w of sz.warna ?? []) {
            expectedRows.push({ kode: entryKode, size: sz.size, warna: w.warna, expected_qty: w.qty });
          }
          if (expectedRows.length > 0) {
            const { error: expErr } = await supabase
              .from("expected_stok").upsert(expectedRows, { onConflict: "kode,size,warna" });
            if (expErr) throw new Error(expErr.message);
          }

          logHistory({ action: "batch-produksi", category: "produksi", kode: entryKode, nama: entry.nama.trim(),
            snapshot: { batch_no: batchNo, tanggal, total_kain: totalK, sizes, catatan },
          }).catch(() => {});
        }

        invalidateProducts();
      }

      const msg = !isEdit && productEntries.length > 1
        ? `${productEntries.length} produk & batch berhasil dibuat.`
        : isEdit ? "Batch berhasil diperbarui." : "Produk & batch berhasil dibuat.";
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
          <input type="text" className={inputCls} value={batchNo}
            onChange={(e) => setBatchNo(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Tanggal Produksi</label>
          <input type="date" className={inputCls} value={tanggal}
            onChange={(e) => setTanggal(e.target.value)} />
        </div>
        <div>
          <label className={labelCls}>Catatan</label>
          <textarea rows={2} className={inputCls} placeholder="Opsional..."
            value={catatan} onChange={(e) => setCatatan(e.target.value)} />
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
              <div className="px-3 py-2.5 bg-skin-raised border border-skin-bdr-lt text-sm font-semibold text-[#CAB170]">
                {initial.kode_produk}
              </div>
            </div>
            <div>
              <label className={labelCls}>Nama Produk</label>
              <input type="text" className={inputCls} placeholder="Cth: Gamis Wolfis Polos"
                value={nama} onChange={(e) => setNama(e.target.value)} />
            </div>
          </section>

          <section className="space-y-3">
            <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
              Ukuran <span className="normal-case text-skin-text3">(pilih ukuran yang diproduksi)</span>
            </p>
            {variants.map((v, idx) => (
              <label key={v.size} className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-[#CAB170]" checked={v.aktif}
                  onChange={() => setVariants((prev) => prev.map((vv, i) => i === idx ? { ...vv, aktif: !vv.aktif } : vv))} />
                <span className="text-sm text-skin-text2">{v.size}</span>
                <span className="text-xs text-skin-text3">LD {v.ld} · PB {v.pb}</span>
              </label>
            ))}
          </section>

          <section className="space-y-3">
            <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
              Warna
            </p>
            <div className="flex gap-2">
              <input type="text" className={inputCls} placeholder="Cth: HITAM" value={warnaInput}
                onChange={(e) => setWarnaInput(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); editAddWarna(); } }} />
              <button type="button" onClick={editAddWarna}
                className="px-4 py-2.5 text-sm font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition shrink-0">
                Tambah
              </button>
            </div>
            {warnaList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {warnaList.map((w) => (
                  <span key={w} className="inline-flex items-center gap-1 px-2 py-1 bg-skin-raised border border-skin-bdr text-sm">
                    {w}
                    <button type="button" onClick={() => editRemoveWarna(w)} className="text-red-400 hover:text-red-600 leading-none">×</button>
                  </span>
                ))}
              </div>
            )}
          </section>

          {editActiveVariants.length > 0 && (
            <section className="space-y-3">
              <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt">
                Qty Produksi <span className="normal-case text-skin-text3">— expected ({editTotalKain} total)</span>
              </p>
              {editActiveVariants.map((v) => (
                <div key={v.size}>
                  <p className="text-xs font-semibold text-skin-text2 mb-2">{v.size}</p>
                  <div className="space-y-2">
                    {editEffectiveWarna.map((w) => (
                      <div key={w} className="flex items-center gap-3">
                        <span className="w-24 shrink-0 text-sm text-skin-text3">{w === "_" ? "— (tanpa warna)" : w}</span>
                        <input type="number" min="0" className={inputCls} placeholder="0"
                          value={qtyMap[v.size]?.[w] ?? ""}
                          onChange={(e) => editSetQty(v.size, w, e.target.value)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}
        </>
      )}

      {/* ── NEW MODE: multi-product entries ── */}
      {!isEdit && (
        <section className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-skin-bdr-lt">
            <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3">
              Produk
              {productEntries.length > 1 && (
                <span className="ml-2 normal-case font-normal text-skin-text3">
                  ({productEntries.length} produk · {totalBajuAll} baju total)
                </span>
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

          {productEntries.map((entry, idx) => {
            const entryKode = buildKode(entry.kodeAngka, entry.kodeBahan);
            const activeV = entry.variants.filter((v) => v.aktif);
            const effWarna = entry.warnaList.length > 0 ? entry.warnaList : ["_"];
            const totalK = entryTotalKain(entry);
            const isExpanded = entry.expanded;

            return (
              <div key={entry._key} className="border border-skin-bdr bg-skin-raised">
                {/* Card header */}
                <div
                  className="flex items-center justify-between px-3 py-3 cursor-pointer select-none"
                  onClick={() => updateEntry(idx, { expanded: !isExpanded })}
                >
                  <div className="min-w-0 flex-1">
                    {entryKode ? (
                      <p className="text-sm font-semibold text-skin-text">{entryKode}</p>
                    ) : (
                      <p className="text-sm text-skin-text3">Produk {idx + 1}</p>
                    )}
                    {entry.nama && <p className="text-xs text-skin-text3 truncate">{entry.nama}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {totalK > 0 && <span className="text-xs text-[#CAB170] font-medium">{totalK} baju</span>}
                    {productEntries.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeEntry(idx); }}
                        className="text-red-400 hover:text-red-600 text-lg leading-none"
                      >×</button>
                    )}
                    <span className="text-skin-text3 text-xs">{isExpanded ? "▴" : "▾"}</span>
                  </div>
                </div>

                {/* Card body (expanded) */}
                {isExpanded && (
                  <div className="px-3 pb-3 border-t border-skin-bdr-lt space-y-4 pt-3">

                    {/* Kode */}
                    <div>
                      <label className={labelCls}>Kode Produk</label>
                      <div className="flex gap-2 items-center">
                        <span className="text-sm text-skin-text3 shrink-0">D -</span>
                        <input type="text" placeholder="07" className={inputCls + " flex-1"}
                          value={entry.kodeAngka}
                          onChange={(e) => {
                            updateEntry(idx, { kodeAngka: e.target.value, templateFetched: "" });
                          }} />
                        <span className="text-sm text-skin-text3 shrink-0">-</span>
                        <input type="text" placeholder="OSK" className={inputCls + " flex-1 uppercase"}
                          value={entry.kodeBahan}
                          onChange={(e) => {
                            updateEntry(idx, { kodeBahan: e.target.value.toUpperCase(), templateFetched: "" });
                          }} />
                      </div>
                      {entryKode && (
                        <p className="text-xs text-skin-text3 mt-1">
                          Kode: <span className="font-semibold text-[#CAB170]">{entryKode}</span>
                          {entry.loadingTpl && <span className="ml-2">Mengecek HPP...</span>}
                          {!entry.loadingTpl && entry.template && (
                            <span className="ml-2 text-emerald-600">✓ HPP ({fmtRp(entry.template.total_hpp)}/baju)</span>
                          )}
                          {!entry.loadingTpl && entry.template === false && (
                            <span className="ml-2 text-skin-text4">Belum ada template HPP</span>
                          )}
                        </p>
                      )}
                    </div>

                    {/* Nama */}
                    <div>
                      <label className={labelCls}>Nama Produk</label>
                      <input type="text" className={inputCls} placeholder="Cth: Gamis Wolfis Polos"
                        value={entry.nama} onChange={(e) => updateEntry(idx, { nama: e.target.value })} />
                    </div>

                    {/* Bahan */}
                    <div>
                      <label className={labelCls}>Bahan / Fabric</label>
                      <input type="text" className={inputCls} placeholder="Cth: Wolfis Premium"
                        value={entry.bahan} onChange={(e) => updateEntry(idx, { bahan: e.target.value })} />
                    </div>

                    {/* Ukuran */}
                    <div>
                      <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt mb-2">
                        Ukuran <span className="normal-case text-skin-text3">(harga jual diisi nanti)</span>
                      </p>
                      {entry.variants.map((v, vidx) => (
                        <label key={v.size} className="flex items-center gap-3 cursor-pointer mb-2">
                          <input type="checkbox" className="w-4 h-4 accent-[#CAB170]" checked={v.aktif}
                            onChange={() => entryToggleVariant(idx, vidx)} />
                          <span className="text-sm text-skin-text2">{v.size}</span>
                          <span className="text-xs text-skin-text3">LD {v.ld} · PB {v.pb}</span>
                        </label>
                      ))}
                    </div>

                    {/* Warna */}
                    <div>
                      <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt mb-2">
                        Warna <span className="normal-case text-skin-text3">(kosong = tanpa warna)</span>
                      </p>
                      <div className="flex gap-2">
                        <input type="text" className={inputCls} placeholder="Cth: HITAM"
                          value={entry.warnaInput}
                          onChange={(e) => updateEntry(idx, { warnaInput: e.target.value.toUpperCase() })}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); entryAddWarna(idx); } }} />
                        <button type="button" onClick={() => entryAddWarna(idx)}
                          className="px-4 py-2.5 text-sm font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition shrink-0">
                          Tambah
                        </button>
                      </div>
                      {entry.warnaList.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {entry.warnaList.map((w) => (
                            <span key={w} className="inline-flex items-center gap-1 px-2 py-1 bg-skin-raised border border-skin-bdr text-sm">
                              {w}
                              <button type="button" onClick={() => entryRemoveWarna(idx, w)} className="text-red-400 hover:text-red-600 leading-none">×</button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Qty */}
                    {activeV.length > 0 && (
                      <div>
                        <p className="text-xs font-editorial tracking-[0.2em] uppercase text-skin-text3 pb-1 border-b border-skin-bdr-lt mb-2">
                          Qty Produksi <span className="normal-case text-skin-text3">({totalK} total)</span>
                        </p>
                        <p className="text-xs text-skin-text3 italic mb-2">
                          Qty rencana. Stok aktual diinput lewat Stok Opname.
                        </p>
                        {activeV.map((v) => (
                          <div key={v.size} className="mb-3">
                            <p className="text-xs font-semibold text-skin-text2 mb-2">{v.size}</p>
                            <div className="space-y-2">
                              {effWarna.map((w) => (
                                <div key={w} className="flex items-center gap-3">
                                  <span className="w-24 shrink-0 text-sm text-skin-text3">{w === "_" ? "— (tanpa warna)" : w}</span>
                                  <input type="number" min="0" className={inputCls} placeholder="0"
                                    value={entry.qtyMap[v.size]?.[w] ?? ""}
                                    onChange={(e) => entrySetQty(idx, v.size, w, e.target.value)} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* HPP preview */}
                    {entry.template && (
                      <div className="bg-skin-card border border-skin-bdr p-3 space-y-2">
                        <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3">
                          HPP & Bahan (dari template)
                        </p>
                        <div className="flex justify-between text-sm">
                          <span className="text-skin-text3">HPP per baju</span>
                          <span className="font-bold text-[#CAB170]">{fmtRp(entry.template.total_hpp)}</span>
                        </div>
                        {entry.template.bahan_items?.length > 0 && (
                          <div className="space-y-1 pt-1 border-t border-skin-bdr-lt">
                            {entry.template.bahan_items.some((b) => !(Number(b.qty_per_baju) > 0)) && (
                              <p className="text-[10px] text-amber-500 bg-amber-500/10 px-2 py-1">
                                ⚠ Ada bahan dengan qty/baju = 0. Simpan ulang Template HPP agar pemakaian bahan tercatat.
                              </p>
                            )}
                            {entry.template.bahan_items.map((b, i) => (
                              <div key={i} className="flex justify-between text-xs">
                                <span className={`${!(Number(b.qty_per_baju) > 0) ? "text-amber-500" : "text-skin-text3"}`}>{b.nama_bahan}</span>
                                <span className="text-skin-text2">
                                  {totalK > 0
                                    ? `${((Number(b.qty_per_baju) || 0) * totalK).toFixed(2)} ${b.satuan} total`
                                    : `${b.qty_per_baju || "??"} ${b.satuan}/baju`}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </section>
      )}

      {err && <p className="text-sm text-red-500 py-1">{err}</p>}

      </div>{/* end scrollable content */}

      <div className="shrink-0 border-t border-skin-bdr-lt px-4 pt-3 pb-3 flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 hover:border-skin-text2 transition">
          Batal
        </button>
        <button type="submit"
          disabled={saving || (!isEdit && totalBajuAll === 0) || (isEdit && editTotalKain === 0)}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-60"
        >
          {saving
            ? "Menyimpan..."
            : isEdit
              ? "Simpan Perubahan"
              : productEntries.length > 1
                ? `Buat ${productEntries.length} Produk & Batch`
                : "Buat Produk & Batch"}
        </button>
      </div>
    </form>
  );
}
