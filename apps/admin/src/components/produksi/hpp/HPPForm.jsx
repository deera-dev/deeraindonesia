/**
 * HPPForm.jsx — Form HPP multi-produk (gelaran).
 *
 * Bahan motif: input per-warna → qty dijumlah → dibagi untuk_n_baju.
 * Bahan tambahan: input total langsung → dibagi untuk_n_baju.
 * Biaya produksi (upah jahit, bordir, studio, kancing) berbeda per produk.
 * Rincian HPP menampilkan tiap bahan secara terpisah.
 * Simpan → upsert N record hpp_template sekaligus.
 */
import { useState, useEffect } from "react";
import { fmtRp, fmt4, calcQtyPerBaju, normItem, calcTotal, satuanUkurOptions } from "./hppUtils";
import RangeWithMarks from "./RangeWithMarks";
import BahanPickerModal from "./BahanPickerModal";

const fieldCls =
  "px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";
const fieldFullCls = "w-full " + fieldCls;
const labelCls = "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

function newProdukEntry(kode, nama) {
  return { kode, nama, upah_jahit: 0, bordir: 0, jumlah_baju_studio: "", kancing_qty: 0 };
}

/** Jumlahkan semua qty warna untuk bahan motif */
function sumWarnaQty(warna_qtys) {
  return (warna_qtys ?? []).reduce((s, w) => s + (Number(w.qty) || 0), 0);
}

function ProdukPicker({ products, selectedKodes, onAdd, onClose }) {
  const [q, setQ] = useState("");
  const list = (products ?? []).filter(
    (p) =>
      !selectedKodes.includes(p.kode) &&
      (q === "" ||
        p.kode.toLowerCase().includes(q.toLowerCase()) ||
        p.nama.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <div className="border-2 border-[#CAB170] bg-skin-card p-3 space-y-2 mt-2">
      <input
        type="text"
        autoFocus
        placeholder="Cari kode / nama produk..."
        className={fieldFullCls}
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="max-h-44 overflow-y-auto divide-y divide-skin-bdr-lt">
        {list.length === 0 ? (
          <p className="text-xs text-skin-text3 text-center py-3">Tidak ada produk.</p>
        ) : (
          list.map((p) => (
            <button
              key={p.kode}
              type="button"
              onClick={() => { onAdd(p); onClose(); }}
              className="w-full text-left px-3 py-2 hover:bg-skin-raised transition"
            >
              <span className="text-sm font-medium text-skin-text">{p.kode}</span>
              <span className="ml-2 text-xs text-skin-text3">{p.nama}</span>
            </button>
          ))
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="w-full text-xs text-skin-text3 py-1 hover:text-skin-text transition"
      >
        Batal
      </button>
    </div>
  );
}

export default function HPPForm({ initial, products, config, bahanOptions, onSave, onCancel }) {
  const isEdit = !!initial;

  const [produkList, setProdukList] = useState(() => {
    if (isEdit) {
      const p = products?.find((x) => x.kode === initial.kode_produk);
      return [newProdukEntry(initial.kode_produk, p?.nama ?? initial.kode_produk)];
    }
    return [];
  });

  // Load saved biaya into produkList when editing
  useEffect(() => {
    if (!isEdit) return;
    setProdukList([{
      kode: initial.kode_produk,
      nama: products?.find((x) => x.kode === initial.kode_produk)?.nama ?? initial.kode_produk,
      upah_jahit: initial.upah_jahit ?? 0,
      bordir: initial.bordir ?? 0,
      jumlah_baju_studio: initial.jumlah_baju_studio > 1 ? String(initial.jumlah_baju_studio) : "",
      kancing_qty: initial.kancing_qty ?? 0,
    }]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial?.id]);

  const [bahanItems, setBahanItems] = useState(
    () => (initial?.bahan_items ?? []).map(normItem),
  );
  const [showBahanPicker, setShowBahanPicker] = useState(false);
  const [showProdukPicker, setShowProdukPicker] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState(isEdit ? 0 : null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function recompute(item) {
    const qpb = calcQtyPerBaju(item);
    return { ...item, qty_per_baju: qpb, subtotal: Math.round(qpb * (Number(item.harga_satuan) || 0)) };
  }

  /** Ambil daftar warna dari produk-produk yang sedang dipilih di produkList */
  function getWarnasFromProdukList() {
    const all = new Set();
    for (const p of produkList) {
      const prod = products?.find((x) => x.kode === p.kode);
      for (const w of prod?.warna ?? []) {
        if (w && w !== "_") all.add(w);
      }
    }
    return [...all];
  }

  // Saat produkList berubah, sync warna_qtys semua motif item ke warna produk terbaru
  // Qty yang sudah diisi dipertahankan untuk warna yang masih ada
  useEffect(() => {
    const warnas = getWarnasFromProdukList();
    setBahanItems((prev) =>
      prev.map((b) => {
        if (b.jenis !== "motif") return b;
        const existing = Object.fromEntries((b.warna_qtys ?? []).map((w) => [w.warna, w.qty]));
        const newWQ = warnas.map((w) => ({ warna: w, qty: existing[w] ?? "" }));
        return recompute({ ...b, warna_qtys: newWQ, qty_dipakai: String(sumWarnaQty(newWQ)) });
      }),
    );
  }, [produkList]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSelectBahan(opt) {
    setShowBahanPicker(false);
    const isFirst = bahanItems.length === 0;
    const jenisNew = isFirst ? "motif" : "tambahan";
    const initWarnaQtys =
      jenisNew === "motif"
        ? getWarnasFromProdukList().map((w) => ({ warna: w, qty: "" }))
        : [];
    setBahanItems((prev) => [
      ...prev,
      recompute({
        bahan_id: opt.id,
        bahan_type: opt._type,
        nama_bahan: opt.nama_bahan,
        kode_bahan: opt.kode_bahan ?? "",
        satuan: opt.satuan,
        harga_satuan: opt.harga_satuan,
        jenis: jenisNew,
        qty_dipakai: "",
        satuan_ukur: opt.satuan,
        untuk_n_baju: "",
        warna_qtys: initWarnaQtys,
        qty_per_baju: 0,
        subtotal: 0,
      }),
    ]);
  }

  const updateBahan = (idx, field, val) =>
    setBahanItems((prev) =>
      prev.map((b, i) => (i !== idx ? b : recompute({ ...b, [field]: val }))),
    );

  const toggleJenisBahan = (idx) =>
    setBahanItems((prev) =>
      prev.map((b, i) => {
        if (i !== idx) return b;
        const newJenis = b.jenis === "motif" ? "tambahan" : "motif";
        // Saat switch ke motif: pakai warna dari produk (jika belum ada)
        const initWQ =
          newJenis === "motif"
            ? getWarnasFromProdukList().map((w) => ({ warna: w, qty: "" }))
            : [];
        return recompute({
          ...b,
          jenis: newJenis,
          warna_qtys: initWQ,
          qty_dipakai: newJenis === "tambahan" ? (b.qty_dipakai ?? "") : "",
        });
      }),
    );

  const removeBahan = (idx) => setBahanItems((prev) => prev.filter((_, i) => i !== idx));

  // ── Handler per-warna (motif) ────────────────────────────────
  function addWarnaRow(idx) {
    setBahanItems((prev) =>
      prev.map((b, i) => {
        if (i !== idx) return b;
        const newWQ = [...(b.warna_qtys ?? []), { warna: "", qty: "" }];
        return recompute({ ...b, warna_qtys: newWQ, qty_dipakai: String(sumWarnaQty(newWQ)) });
      }),
    );
  }

  function removeWarnaRow(idx, wIdx) {
    setBahanItems((prev) =>
      prev.map((b, i) => {
        if (i !== idx) return b;
        const newWQ = (b.warna_qtys ?? []).filter((_, wi) => wi !== wIdx);
        return recompute({ ...b, warna_qtys: newWQ, qty_dipakai: String(sumWarnaQty(newWQ)) });
      }),
    );
  }

  function updateWarnaRow(idx, wIdx, field, val) {
    setBahanItems((prev) =>
      prev.map((b, i) => {
        if (i !== idx) return b;
        const newWQ = (b.warna_qtys ?? []).map((w, wi) =>
          wi === wIdx ? { ...w, [field]: val } : w,
        );
        return recompute({ ...b, warna_qtys: newWQ, qty_dipakai: String(sumWarnaQty(newWQ)) });
      }),
    );
  }

  // ── Produk list handlers ─────────────────────────────────────
  function addProduk(p) {
    setProdukList((prev) => [...prev, newProdukEntry(p.kode, p.nama)]);
    setExpandedIdx(produkList.length);
    setShowProdukPicker(false);
  }

  function removeProduk(idx) {
    setProdukList((prev) => prev.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  }

  const updateProduk = (idx, field, val) =>
    setProdukList((prev) => prev.map((p, i) => (i !== idx ? p : { ...p, [field]: val })));

  function calcProdukHPP(p) {
    const biaya_studio = Math.round(
      (config?.studio ?? 0) / Math.max(Number(p.jumlah_baju_studio) || 1, 1),
    );
    const { total } = calcTotal({
      bahanItems,
      upah_jahit: p.upah_jahit,
      bordir: p.bordir,
      kancing_qty: p.kancing_qty,
      biaya_studio,
      config,
    });
    return total;
  }

  // ── Submit ───────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (produkList.length === 0) return setErr("Pilih minimal 1 produk.");
    setErr("");
    setSaving(true);
    try {
      const cleanItems = bahanItems.map((b) => {
        const qpb = calcQtyPerBaju(b);
        return {
          bahan_id: b.bahan_id,
          bahan_type: b.bahan_type,
          nama_bahan: b.nama_bahan,
          kode_bahan: b.kode_bahan ?? "",
          satuan: b.satuan,
          harga_satuan: Number(b.harga_satuan) || 0,
          jenis: b.jenis ?? "tambahan",
          qty_dipakai: Number(b.qty_dipakai) || 0,
          satuan_ukur: b.satuan_ukur ?? b.satuan,
          untuk_n_baju: Number(b.untuk_n_baju) || 1,
          // Simpan warna_qtys hanya untuk motif
          warna_qtys: b.jenis === "motif" ? (b.warna_qtys ?? []) : [],
          qty_per_baju: qpb,
          subtotal: Math.round(qpb * (Number(b.harga_satuan) || 0)),
        };
      });
      const payloads = produkList.map((p) => {
        const biaya_studio = Math.round(
          (config?.studio ?? 0) / Math.max(Number(p.jumlah_baju_studio) || 1, 1),
        );
        const { total } = calcTotal({
          bahanItems,
          upah_jahit: p.upah_jahit,
          bordir: p.bordir,
          kancing_qty: p.kancing_qty,
          biaya_studio,
          config,
        });
        return {
          kode_produk: p.kode,
          bahan_items: cleanItems,
          upah_jahit: Number(p.upah_jahit) || 0,
          bordir: Number(p.bordir) || 0,
          biaya_studio,
          jumlah_baju_studio: Number(p.jumlah_baju_studio) || 1,
          kancing_qty: Number(p.kancing_qty) || 0,
          catatan: "",
          config_snapshot: config,
          total_hpp: total,
        };
      });
      await onSave(payloads);
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2 space-y-5">

      {/* ── Pilih Produk ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className={labelCls + " !mb-0"}>
            Produk
            {produkList.length > 1 && (
              <span className="ml-1 normal-case text-[10px] font-normal text-skin-text3">
                ({produkList.length} produk)
              </span>
            )}
          </p>
          {!isEdit && (
            <button
              type="button"
              onClick={() => setShowProdukPicker((v) => !v)}
              className="text-xs font-editorial tracking-[0.15em] uppercase text-[#CAB170] hover:text-[#A8925A] transition"
            >
              + Tambah Produk
            </button>
          )}
        </div>

        {produkList.length === 0 && !showProdukPicker && (
          <p className="text-sm text-skin-text3 py-2">Klik "+ Tambah Produk" untuk memulai.</p>
        )}

        {showProdukPicker && (
          <ProdukPicker
            products={products}
            selectedKodes={produkList.map((p) => p.kode)}
            onAdd={addProduk}
            onClose={() => setShowProdukPicker(false)}
          />
        )}

        {produkList.map((p, idx) => {
          const isOpen = expandedIdx === idx;
          const hpp = calcProdukHPP(p);
          const biaya_studio_per_baju = Math.round(
            (config?.studio ?? 0) / Math.max(Number(p.jumlah_baju_studio) || 1, 1),
          );
          return (
            <div key={p.kode} className="border border-skin-bdr bg-skin-raised">
              <div
                className="flex items-center justify-between px-3 py-3 cursor-pointer"
                onClick={() => setExpandedIdx(isOpen ? null : idx)}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-skin-text">{p.kode}</p>
                  <p className="text-xs text-skin-text3 truncate">{p.nama}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-bold text-[#CAB170]">{fmtRp(hpp)}</span>
                  {!isEdit && produkList.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeProduk(idx); }}
                      className="text-red-400 hover:text-red-600 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                  <span className="text-skin-text3 text-xs">{isOpen ? "▴" : "▾"}</span>
                </div>
              </div>

              {isOpen && (
                <div className="px-3 pb-3 space-y-4 border-t border-skin-bdr-lt pt-3">
                  <div>
                    <label className={labelCls}>Upah Jahit</label>
                    <RangeWithMarks
                      value={p.upah_jahit}
                      onChange={(v) => updateProduk(idx, "upah_jahit", v)}
                      min={0} max={50000} step={500}
                      marks={[{ value: 35000, label: "35rb" }, { value: 45000, label: "45rb" }]}
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Bordir</label>
                    <RangeWithMarks
                      value={p.bordir}
                      onChange={(v) => updateProduk(idx, "bordir", v)}
                      min={0} max={20000} step={500}
                      marks={[{ value: 10000, label: "10rb" }, { value: 15000, label: "15rb" }]}
                      zeroLabel="Tidak ada"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Biaya Studio</label>
                    <div className="bg-skin-card border border-skin-bdr-lt px-3 py-2.5 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-skin-text3">Total biaya studio</span>
                        <span className="font-medium text-skin-text">{fmtRp(config?.studio ?? 0)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-skin-text3 shrink-0">÷</span>
                        <input
                          type="number" min="1" step="1" placeholder="1"
                          className={"flex-1 min-w-0 " + fieldCls}
                          value={p.jumlah_baju_studio}
                          onChange={(e) => updateProduk(idx, "jumlah_baju_studio", e.target.value)}
                        />
                        <span className="text-xs text-skin-text3 shrink-0">baju</span>
                      </div>
                      <div className="flex justify-between text-xs font-semibold border-t border-skin-bdr-lt pt-1.5">
                        <span className="text-skin-text3">Per baju</span>
                        <span className="text-[#CAB170]">{fmtRp(biaya_studio_per_baju)}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className={labelCls}>Jumlah Kancing</label>
                    <div className="flex items-center gap-3">
                      <button type="button"
                        onClick={() => updateProduk(idx, "kancing_qty", Math.max(0, p.kancing_qty - 1))}
                        className="w-10 h-10 flex items-center justify-center border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] text-xl transition shrink-0"
                      >−</button>
                      <span className="flex-1 text-center text-xl font-bold text-skin-text">{p.kancing_qty}</span>
                      <button type="button"
                        onClick={() => updateProduk(idx, "kancing_qty", p.kancing_qty + 1)}
                        className="w-10 h-10 flex items-center justify-center border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] text-xl transition shrink-0"
                      >+</button>
                    </div>
                    {p.kancing_qty > 0 && (
                      <p className="text-xs text-skin-text3 mt-1 text-center">
                        {p.kancing_qty} × {fmtRp(config?.kancing_satuan ?? 500)} = {fmtRp(p.kancing_qty * (config?.kancing_satuan ?? 500))}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Bahan ── */}
      <div className="space-y-3 border-t border-skin-bdr-lt pt-4">
        <div className="flex items-center justify-between">
          <p className={labelCls + " !mb-0"}>Bahan</p>
          <button
            type="button"
            onClick={() => setShowBahanPicker(true)}
            className="text-xs font-editorial tracking-[0.15em] uppercase text-[#CAB170] hover:text-[#A8925A] transition"
          >
            + Tambah Bahan
          </button>
        </div>

        {bahanItems.length === 0 && (
          <p className="text-sm text-skin-text3 py-2">Klik "+ Tambah Bahan" untuk memulai.</p>
        )}

        {bahanItems.map((b, idx) => {
          const qpb = calcQtyPerBaju(b);
          const subtotal = Math.round(qpb * (Number(b.harga_satuan) || 0));
          const opts = satuanUkurOptions(b.satuan);
          const showConv = b.satuan_ukur && b.satuan_ukur !== b.satuan;
          const isMotif = b.jenis === "motif";
          const warnaTotal = isMotif ? sumWarnaQty(b.warna_qtys) : 0;

          return (
            <div key={idx} className="border border-skin-bdr p-3 space-y-3 bg-skin-raised">
              {/* Header bahan */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-skin-text">{b.nama_bahan}</p>
                  <p className="text-xs text-skin-text3">
                    {b.bahan_type === "pinjam" ? "Pinjam" : "Beli"} · beli/{b.satuan}
                    {b.kode_bahan ? ` · ${b.kode_bahan}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => toggleJenisBahan(idx)}
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 border transition ${
                      isMotif
                        ? "border-[#CAB170] text-[#CAB170] bg-[#CAB170]/10"
                        : "border-skin-bdr text-skin-text3 bg-skin-card hover:border-[#CAB170] hover:text-[#CAB170]"
                    }`}
                  >
                    {isMotif ? "Motif" : "Tambahan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => removeBahan(idx)}
                    className="text-red-400 hover:text-red-600 text-lg leading-none"
                  >×</button>
                </div>
              </div>

              {/* Harga */}
              <div>
                <label className={labelCls}>Harga / {b.satuan}</label>
                <input
                  type="number" min="0" className={fieldFullCls}
                  value={b.harga_satuan}
                  onChange={(e) => updateBahan(idx, "harga_satuan", e.target.value)}
                />
              </div>

              {/* ── Pemakaian: motif = per-warna, tambahan = total ── */}
              {isMotif ? (
                <div className="space-y-2">
                  {/* Satuan ukur selector (shared untuk semua warna) */}
                  <div className="flex items-center justify-between">
                    <label className={labelCls + " !mb-0"}>Pemakaian Per Warna</label>
                    <div className="flex items-center gap-2">
                      {opts.length > 1 && (
                        <select
                          className={"w-20 shrink-0 " + fieldCls}
                          value={b.satuan_ukur}
                          onChange={(e) => updateBahan(idx, "satuan_ukur", e.target.value)}
                        >
                          {opts.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      )}
                    </div>
                  </div>

                  {(b.warna_qtys ?? []).length === 0 && (
                    <p className="text-xs text-amber-500 italic py-1">
                      Produk belum punya data warna. Tambah warna di Admin → Edit Produk terlebih dahulu.
                    </p>
                  )}

                  {(b.warna_qtys ?? []).map((wRow, wIdx) => (
                    <div key={wIdx} className="flex items-center gap-2">
                      {/* Warna locked — auto dari produk */}
                      <span className="shrink-0 w-24 px-2 py-1.5 bg-skin-raised border border-skin-bdr text-xs font-editorial font-semibold text-skin-text2 truncate">
                        {wRow.warna || "—"}
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        placeholder="0"
                        className={fieldCls + " flex-1 min-w-0"}
                        value={wRow.qty}
                        onChange={(e) => updateWarnaRow(idx, wIdx, "qty", e.target.value)}
                      />
                      <span className="text-xs text-skin-text3 shrink-0 w-10 text-center">
                        {b.satuan_ukur || b.satuan}
                      </span>
                    </div>
                  ))}

                  {/* Total & untuk_n_baju */}
                  {(b.warna_qtys ?? []).length > 0 && (
                    <div className="bg-skin-card border border-skin-bdr-lt px-3 py-2 space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-skin-text3">
                          Total ({(b.warna_qtys ?? []).length} warna):
                        </span>
                        <span className="font-medium text-skin-text">
                          {warnaTotal > 0 ? `${fmt4(warnaTotal)} ${b.satuan_ukur || b.satuan}` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pt-1 border-t border-skin-bdr-lt">
                        <span className="text-xs text-skin-text3 shrink-0">untuk</span>
                        <input
                          type="number" min="1" step="1" placeholder="1"
                          className={"flex-1 min-w-0 " + fieldCls}
                          value={b.untuk_n_baju}
                          onChange={(e) => updateBahan(idx, "untuk_n_baju", e.target.value)}
                        />
                        <span className="text-xs text-skin-text3 shrink-0">baju</span>
                      </div>
                      {showConv && warnaTotal > 0 && (
                        <div className="flex justify-between text-xs text-skin-text3">
                          <span>Konversi:</span>
                          <span>
                            {fmt4(warnaTotal / Math.max(Number(b.untuk_n_baju) || 1, 1))} {b.satuan_ukur}
                            {" → "}
                            {qpb > 0 ? `${fmt4(qpb)} ${b.satuan}` : "—"}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-skin-text3">Per baju:</span>
                        <span className="text-skin-text">
                          {qpb > 0 ? `${fmt4(qpb)} ${b.satuan}` : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-skin-text3">Biaya per baju:</span>
                        <span className="font-semibold text-[#CAB170]">{fmtRp(subtotal)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Tambahan: total langsung ── */
                <div className="space-y-2">
                  <label className={labelCls}>Total Pemakaian</label>
                  <div className="flex gap-2">
                    <input
                      type="number" min="0" step="any" placeholder="0"
                      className={"flex-1 min-w-0 " + fieldCls}
                      value={b.qty_dipakai}
                      onChange={(e) => updateBahan(idx, "qty_dipakai", e.target.value)}
                    />
                    {opts.length > 1 ? (
                      <select
                        className={"w-20 shrink-0 " + fieldCls}
                        value={b.satuan_ukur}
                        onChange={(e) => updateBahan(idx, "satuan_ukur", e.target.value)}
                      >
                        {opts.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    ) : (
                      <span className="shrink-0 self-center text-sm text-skin-text3">{b.satuan}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-skin-text3 shrink-0">untuk</span>
                    <input
                      type="number" min="1" step="1" placeholder="1"
                      className={"flex-1 min-w-0 " + fieldCls}
                      value={b.untuk_n_baju}
                      onChange={(e) => updateBahan(idx, "untuk_n_baju", e.target.value)}
                    />
                    <span className="text-xs text-skin-text3 shrink-0">baju</span>
                  </div>
                  <div className="bg-skin-card border border-skin-bdr-lt px-3 py-2 space-y-1">
                    {showConv && Number(b.qty_dipakai) > 0 && (
                      <div className="flex justify-between text-xs text-skin-text3">
                        <span>Konversi:</span>
                        <span>
                          {fmt4(Number(b.qty_dipakai) / Math.max(Number(b.untuk_n_baju) || 1, 1))} {b.satuan_ukur}
                          {" → "}
                          {qpb > 0 ? `${fmt4(qpb)} ${b.satuan}` : "—"}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-skin-text3">Per baju:</span>
                      <span className="font-medium text-skin-text">
                        {qpb > 0 ? `${fmt4(qpb)} ${b.satuan}` : "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-skin-text3">Biaya per baju:</span>
                      <span className="font-semibold text-[#CAB170]">{fmtRp(subtotal)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Rincian HPP (per produk, di bawah) ── */}
      {produkList.length > 0 && (
        <div className="space-y-3 border-t border-skin-bdr-lt pt-4">
          <p className={labelCls + " !mb-0"}>Rincian HPP</p>
          {produkList.map((p, idx) => {
            const biaya_studio_per_baju = Math.round(
              (config?.studio ?? 0) / Math.max(Number(p.jumlah_baju_studio) || 1, 1),
            );
            const { total: hpp, breakdown } = calcTotal({
              bahanItems,
              upah_jahit: p.upah_jahit,
              bordir: p.bordir,
              kancing_qty: p.kancing_qty,
              biaya_studio: biaya_studio_per_baju,
              config,
            });
            return (
              <div key={p.kode} className="border-2 border-[#CAB170] p-4 space-y-1.5">
                {produkList.length > 1 && (
                  <p className="text-xs font-semibold text-skin-text2 mb-2">{p.kode} — {p.nama}</p>
                )}
                {/* Tiap bahan terpisah */}
                {bahanItems.map((b, bi) => {
                  const qpb = calcQtyPerBaju(b);
                  const cost = Math.round(qpb * (Number(b.harga_satuan) || 0));
                  const nBaju = Number(b.untuk_n_baju) || 1;
                  const isMotif = b.jenis === "motif";
                  const warnaCount = (b.warna_qtys ?? []).filter((w) => Number(w.qty) > 0).length;
                  return (
                    <div key={bi} className="flex justify-between text-xs">
                      <span className="text-skin-text3 truncate max-w-[65%]">
                        {b.nama_bahan}
                        {isMotif && warnaCount > 0 && (
                          <span className="ml-1 opacity-60">{warnaCount} warna</span>
                        )}
                        {nBaju > 1 && <span className="ml-1 opacity-60">÷{nBaju} baju</span>}
                      </span>
                      <span className={cost > 0 ? "" : "text-skin-text4"}>
                        {cost > 0 ? fmtRp(cost) : "—"}
                      </span>
                    </div>
                  );
                })}
                {/* Komponen biaya produksi */}
                {breakdown.map(({ label, val }) => (
                  <div key={label} className="flex justify-between text-xs">
                    <span className="text-skin-text3 pl-1">· {label}</span>
                    <span className={val === 0 ? "text-skin-text4" : ""}>{val === 0 ? "—" : fmtRp(val)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-bold border-t-2 border-[#CAB170]/40 pt-2 mt-1">
                  <span className="font-editorial tracking-[0.15em] uppercase text-sm text-skin-text">
                    HPP / Baju
                  </span>
                  <span className="text-xl text-[#CAB170]">{fmtRp(hpp)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {err && <p className="text-sm text-red-500">{err}</p>}

      </div>{/* end scrollable content */}

      <div className="shrink-0 border-t border-skin-bdr-lt px-4 pt-3 pb-3 flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving || produkList.length === 0}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : `Simpan ${produkList.length} Produk`}
        </button>
      </div>

      {showBahanPicker && (
        <BahanPickerModal
          options={bahanOptions}
          onSelect={handleSelectBahan}
          onClose={() => setShowBahanPicker(false)}
        />
      )}
    </form>
  );
}
