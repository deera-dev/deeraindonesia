/**
 * ProduksiHPP.jsx — Template HPP tersimpan per produk.
 *
 * Dua jenis bahan:
 *   MOTIF    → input langsung qty/baju dalam satuan beli
 *              contoh: 2.44 yard/baju
 *   TAMBAHAN → input total pemakaian + untuk berapa baju + satuan (auto-convert)
 *              contoh: 70 cm untuk 2 baju → 0.38 yard/baju
 */
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@deera/shared/lib/supabase";
import { useAuth } from "@deera/shared/hooks/useAuth";
import { useProducts, invalidateProducts } from "@deera/shared/hooks/useProducts";
import BackToTop from "@deera/shared/components/BackToTop";
import ProduksiLayout from "../components/produksi/ProduksiLayout";

function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}
function fmt4(n) {
  // format angka desimal, hilangkan trailing zeros
  return Number(n).toFixed(4).replace(/\.?0+$/, "");
}

// ── Konversi satuan panjang ───────────────────────────────────────────────────
const LENGTH_UNITS = new Set(["yard", "meter", "m", "cm"]);

function convertUnit(value, fromUnit, toUnit) {
  if (!fromUnit || !toUnit) return value;
  const norm = (u) => (u === "m" ? "meter" : u);
  const f = norm(fromUnit);
  const t = norm(toUnit);
  if (f === t) return value;
  if (!LENGTH_UNITS.has(f) || !LENGTH_UNITS.has(t)) return value;
  const toMeter   = { yard: 0.9144, meter: 1, cm: 0.01 };
  const fromMeter = { yard: 1 / 0.9144, meter: 1, cm: 100 };
  return value * (toMeter[f] ?? 1) * (fromMeter[t] ?? 1);
}

// Opsi satuan ukur berdasarkan satuan beli
function satuanUkurOptions(satuanBeli) {
  if (LENGTH_UNITS.has(satuanBeli)) return ["yard", "meter", "cm"];
  return [satuanBeli];
}

// Hitung qty_per_baju (dalam satuan beli) dari item
// Motif & Tambahan: keduanya pakai total ÷ jumlah_baju + konversi satuan
// Bedanya hanya label/badge, bukan cara hitung.
function calcQtyPerBaju(item) {
  const qtyRaw  = Number(item.qty_dipakai)  || 0;
  const nBaju   = Math.max(Number(item.untuk_n_baju) || 1, 1);
  const perBaju = qtyRaw / nBaju;
  return convertUnit(perBaju, item.satuan_ukur || item.satuan, item.satuan);
}

// Normalise item dari DB (backward compat — item lama tidak punya jenis/qty_dipakai)
function normItem(b) {
  const hasTambahan = b.qty_dipakai !== undefined && b.untuk_n_baju !== undefined;
  const jenis = b.jenis ?? (hasTambahan ? "tambahan" : "motif");
  return {
    ...b,
    jenis,
    qty_dipakai:  b.qty_dipakai  ?? b.qty_per_baju ?? "",
    satuan_ukur:  b.satuan_ukur  ?? b.satuan ?? "yard",
    untuk_n_baju: b.untuk_n_baju ?? 1,
  };
}

// ── Fetch helpers ─────────────────────────────────────────────────────────────
async function fetchBahanOptions() {
  const [{ data: beli }, { data: pinjam }] = await Promise.all([
    supabase.from("bahan_pembelian").select("id,nama_bahan,kode_bahan,satuan,harga_satuan,jumlah").order("nama_bahan"),
    supabase.from("bahan_pinjam").select("id,nama_bahan,kode_bahan,satuan,harga_satuan,jumlah").order("nama_bahan"),
  ]);
  return [
    ...(beli   ?? []).map((r) => ({ ...r, _type: "beli",   _label: `[Beli] ${r.nama_bahan}${r.kode_bahan ? " (" + r.kode_bahan + ")" : ""}` })),
    ...(pinjam ?? []).map((r) => ({ ...r, _type: "pinjam", _label: `[Pinjam] ${r.nama_bahan}${r.kode_bahan ? " (" + r.kode_bahan + ")" : ""}` })),
  ];
}

async function fetchConfig() {
  const { data } = await supabase.from("hpp_config").select("*");
  const map = {};
  for (const r of (data ?? [])) map[r.key] = r.nilai;
  return map;
}

// ── Hitung total HPP ──────────────────────────────────────────────────────────
// biaya_studio = nilai per baju (sudah dihitung: config.biaya_studio ÷ jumlah_baju_studio)
function calcTotal({ bahanItems, upah_jahit, bordir, kancing_qty, biaya_studio, config }) {
  const biayaKain     = bahanItems.reduce((s, b) => s + calcQtyPerBaju(b) * (Number(b.harga_satuan) || 0), 0);
  const kancingSatuan = config?.kancing_satuan ?? 500;
  const kancingQty    = Number(kancing_qty) || 0;
  const biayaKancing  = kancingQty * kancingSatuan;

  const breakdown = [
    { label: "Upah Jahit",   val: Number(upah_jahit)  || 0 },
    { label: "Bordir",       val: Number(bordir)       || 0 },
    { label: "Biaya Studio", val: Number(biaya_studio) || 0 },
    {
      label: `Kancing (${kancingQty} × ${fmtRp(kancingSatuan)})`,
      val: biayaKancing,
    },
    { label: "Plastik",      val: config?.plastik      ?? 1800  },
    { label: "Hangtag",      val: config?.hangtag      ?? 200   },
    { label: "Tali Hangtag", val: config?.tali_hangtag ?? 100   },
    { label: "Merk",         val: config?.merk         ?? 200   },
    { label: "Pin",          val: config?.pin          ?? 2800  },
    { label: "Kain Keras",   val: config?.kain_keras   ?? 200   },
    { label: "Poin Denny",   val: config?.poin_denny   ?? 10000 },
    { label: "Poin Haikal",  val: config?.poin_haikal  ?? 10000 },
  ];
  const komponen = breakdown.reduce((s, b) => s + b.val, 0);
  return {
    biayaKain: Math.round(biayaKain),
    komponen,
    total: Math.round(biayaKain + komponen),
    breakdown,
  };
}

// ── Slider dengan tanda & manual input ───────────────────────────────────────
function RangeWithMarks({ value, onChange, min, max, step = 500, marks = [], zeroLabel = null }) {
  const [showManual, setShowManual] = useState(false);
  const num = Number(value) || 0;
  const pct = (v) => `${((v - min) / (max - min)) * 100}%`;

  return (
    <div className="space-y-1">
      <input
        type="range" min={min} max={max} step={step}
        value={Math.min(Math.max(num, min), max)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[#CAB170] cursor-pointer h-1.5"
      />
      {/* Tick marks */}
      <div className="relative h-6 mx-0.5 select-none">
        {/* min label */}
        <span className="absolute left-0 top-0 text-[10px] text-skin-text4 -translate-x-1/2">
          {min === 0 ? (zeroLabel ?? "0") : `${min/1000}rb`}
        </span>
        {/* max label */}
        <span className="absolute right-0 top-0 text-[10px] text-skin-text4 translate-x-1/2">
          {max/1000}rb
        </span>
        {/* named marks (clickable) */}
        {marks.map((m) => (
          <button key={m.value} type="button" onClick={() => onChange(m.value)}
            style={{ left: pct(m.value) }}
            className="absolute top-0 -translate-x-1/2 flex flex-col items-center gap-0.5 group">
            <div className="w-px h-2 bg-[#CAB170]/50 group-hover:bg-[#CAB170] transition" />
            <span className="text-[10px] text-[#CAB170]/70 group-hover:text-[#CAB170] transition font-semibold whitespace-nowrap">
              {m.label}
            </span>
          </button>
        ))}
      </div>
      {/* Current value + manual toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-[#CAB170]">
          {num === 0 && zeroLabel ? zeroLabel : fmtRp(num)}
        </span>
        <button type="button" onClick={() => setShowManual((v) => !v)}
          className="text-[11px] font-editorial tracking-[0.1em] uppercase text-skin-text3 hover:text-[#CAB170] transition underline">
          {showManual ? "Tutup" : "Input manual"}
        </button>
      </div>
      {showManual && (
        <input type="number" min={0} className="w-full px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition"
          value={num} onChange={(e) => onChange(Number(e.target.value))} />
      )}
    </div>
  );
}

// ── Modal pilih bahan ─────────────────────────────────────────────────────────
function BahanPickerModal({ options, onSelect, onClose }) {
  const [q, setQ] = useState("");
  const filtered = options.filter((o) =>
    o._label.toLowerCase().includes(q.toLowerCase()) ||
    (o.kode_bahan ?? "").toLowerCase().includes(q.toLowerCase())
  );
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-sm max-h-[80dvh] flex flex-col border-2 border-skin-bdr shadow-xl">
        <div className="p-4 border-b border-skin-bdr-lt">
          <p className="font-editorial text-xs tracking-[0.2em] uppercase text-skin-text2 mb-2">Pilih Bahan</p>
          <input autoFocus type="text" placeholder="Cari nama atau kode..."
            value={q} onChange={(e) => setQ(e.target.value)}
            className="w-full px-3 py-2 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170]" />
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-skin-bdr-lt">
          {filtered.length === 0 && (
            <p className="p-4 text-sm text-skin-text3 text-center">Tidak ditemukan.</p>
          )}
          {filtered.map((o) => (
            <button key={`${o._type}-${o.id}`} onClick={() => onSelect(o)}
              className="w-full text-left px-4 py-3 hover:bg-skin-raised transition">
              <p className="text-sm text-skin-text">{o.nama_bahan}</p>
              <p className="text-xs text-skin-text3">
                {o._type === "pinjam" ? "Pinjam" : "Beli"} · {fmtRp(o.harga_satuan)}/{o.satuan}
                {o.kode_bahan ? ` · ${o.kode_bahan}` : ""}
              </p>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-skin-bdr-lt">
          <button onClick={onClose}
            className="w-full py-2.5 font-editorial text-xs tracking-[0.2em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition">
            Batal
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Form HPP ──────────────────────────────────────────────────────────────────
function HPPForm({ initial, kode_produk, config, bahanOptions, onSave, onCancel }) {
  const [bahanItems,       setBahanItems]      = useState((initial?.bahan_items ?? []).map(normItem));
  const [upah_jahit,       setUpahJahit]       = useState(Number(initial?.upah_jahit        ?? 0));
  const [bordir,           setBordir]          = useState(Number(initial?.bordir             ?? 0));
  const [jumlah_baju_studio, setJumlahBajuStudio] = useState(Number(initial?.jumlah_baju_studio ?? 1));
  const [kancing_qty,      setKancing]         = useState(Number(initial?.kancing_qty       ?? 0));
  const [catatan,          setCatatan]         = useState(initial?.catatan ?? "");
  const [showPicker,       setShowPicker]      = useState(false);
  const [saving,           setSaving]          = useState(false);
  const [err,              setErr]             = useState("");

  // Biaya studio per baju = total biaya studio (dari config) ÷ jumlah baju produksi
  // Key di hpp_config adalah "studio" (label: "Studio Foto")
  const biaya_studio_per_baju = Math.round(
    (config?.studio ?? 0) / Math.max(Number(jumlah_baju_studio) || 1, 1)
  );

  const { biayaKain, komponen, total, breakdown } = calcTotal({
    bahanItems, upah_jahit, bordir, kancing_qty,
    biaya_studio: biaya_studio_per_baju,
    config,
  });

  // Recompute qty_per_baju + subtotal setiap kali field berubah
  function recompute(item) {
    const qpb = calcQtyPerBaju(item);
    return { ...item, qty_per_baju: qpb, subtotal: Math.round(qpb * (Number(item.harga_satuan) || 0)) };
  }

  function handleSelectBahan(opt) {
    setShowPicker(false);
    const isFirst = bahanItems.length === 0;
    setBahanItems((prev) => [...prev, recompute({
      bahan_id:     opt.id,
      bahan_type:   opt._type,
      nama_bahan:   opt.nama_bahan,
      kode_bahan:   opt.kode_bahan ?? "",
      satuan:       opt.satuan,
      harga_satuan: opt.harga_satuan,
      jenis:        isFirst ? "motif" : "tambahan",
      qty_dipakai:  "",
      satuan_ukur:  opt.satuan,
      untuk_n_baju: 1,
      qty_per_baju: 0,
      subtotal:     0,
    })]);
  }

  function updateBahan(idx, field, val) {
    setBahanItems((prev) => prev.map((b, i) => i !== idx ? b : recompute({ ...b, [field]: val })));
  }

  function toggleJenis(idx) {
    // Hanya ganti label jenis — cara hitung sudah sama untuk keduanya
    setBahanItems((prev) => prev.map((b, i) =>
      i !== idx ? b : { ...b, jenis: b.jenis === "motif" ? "tambahan" : "motif" }
    ));
  }

  function removeBahan(idx) {
    setBahanItems((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!kode_produk) return setErr("Pilih produk terlebih dahulu.");
    setErr(""); setSaving(true);
    try {
      const cleanItems = bahanItems.map((b) => {
        const qpb = calcQtyPerBaju(b);
        return {
          bahan_id:     b.bahan_id,
          bahan_type:   b.bahan_type,
          nama_bahan:   b.nama_bahan,
          kode_bahan:   b.kode_bahan ?? "",
          satuan:       b.satuan,
          harga_satuan: Number(b.harga_satuan) || 0,
          jenis:        b.jenis ?? "tambahan",
          qty_dipakai:  Number(b.qty_dipakai)  || 0,
          satuan_ukur:  b.satuan_ukur ?? b.satuan,
          untuk_n_baju: b.jenis === "motif" ? 1 : (Number(b.untuk_n_baju) || 1),
          qty_per_baju: qpb,
          subtotal:     Math.round(qpb * (Number(b.harga_satuan) || 0)),
        };
      });
      await onSave({ kode_produk, bahan_items: cleanItems,
        upah_jahit:          Number(upah_jahit)           || 0,
        bordir:              Number(bordir)               || 0,
        biaya_studio:        biaya_studio_per_baju,
        jumlah_baju_studio:  Number(jumlah_baju_studio)   || 1,
        kancing_qty:         Number(kancing_qty)          || 0,
        catatan, config_snapshot: config, total_hpp: total });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  // Class helpers (tanpa w-full agar tidak bentrok dengan flex-1)
  const fieldCls = "px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";
  const fieldFullCls = "w-full " + fieldCls;
  const labelCls = "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* ── Bahan ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className={labelCls + " !mb-0"}>Bahan</p>
          <button type="button" onClick={() => setShowPicker(true)}
            className="text-xs font-editorial tracking-[0.15em] uppercase text-[#CAB170] hover:text-[#A8925A] transition">
            + Tambah Bahan
          </button>
        </div>

        {bahanItems.length === 0 && (
          <p className="text-sm text-skin-text3 py-2">Klik "+ Tambah Bahan" untuk memulai.</p>
        )}

        {bahanItems.map((b, idx) => {
          const qpb      = calcQtyPerBaju(b);
          const subtotal = Math.round(qpb * (Number(b.harga_satuan) || 0));
          const opts     = satuanUkurOptions(b.satuan);
          const showConv = b.satuan_ukur && b.satuan_ukur !== b.satuan;
          const isMotif  = b.jenis === "motif";

          return (
            <div key={idx} className="border border-skin-bdr p-3 space-y-3 bg-skin-raised">

              {/* Header: nama + badge jenis + hapus */}
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-skin-text">{b.nama_bahan}</p>
                  <p className="text-xs text-skin-text3">
                    {b.bahan_type === "pinjam" ? "Pinjam" : "Beli"} · beli/{b.satuan}
                    {b.kode_bahan ? ` · ${b.kode_bahan}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button type="button" onClick={() => toggleJenis(idx)}
                    title={isMotif ? "Klik untuk ubah ke Tambahan" : "Klik untuk ubah ke Motif"}
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 border transition ${
                      isMotif
                        ? "border-[#CAB170] text-[#CAB170] bg-[#CAB170]/10"
                        : "border-skin-bdr text-skin-text3 bg-skin-card hover:border-[#CAB170] hover:text-[#CAB170]"
                    }`}>
                    {isMotif ? "Motif" : "Tambahan"}
                  </button>
                  <button type="button" onClick={() => removeBahan(idx)}
                    className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                </div>
              </div>

              {/* Harga per satuan beli */}
              <div>
                <label className={labelCls}>Harga / {b.satuan}</label>
                <input type="number" min="0" className={fieldFullCls}
                  value={b.harga_satuan}
                  onChange={(e) => updateBahan(idx, "harga_satuan", e.target.value)} />
              </div>

              {/* Qty input — sama untuk motif & tambahan: total ÷ jumlah baju */}
              <div className="space-y-2">
                <label className={labelCls}>Total Pemakaian</label>
                {/* Row: qty input + satuan dropdown */}
                <div className="flex gap-2">
                  <input type="number" min="0" step="any" placeholder="0"
                    className={"flex-1 min-w-0 " + fieldCls}
                    value={b.qty_dipakai}
                    onChange={(e) => updateBahan(idx, "qty_dipakai", e.target.value)} />
                  {opts.length > 1 ? (
                    <select className={"w-20 shrink-0 " + fieldCls}
                      value={b.satuan_ukur}
                      onChange={(e) => updateBahan(idx, "satuan_ukur", e.target.value)}>
                      {opts.map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  ) : (
                    <span className="shrink-0 self-center text-sm text-skin-text3">{b.satuan}</span>
                  )}
                </div>
                {/* Row: untuk N baju */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-skin-text3 shrink-0">untuk</span>
                  <input type="number" min="1" step="1" placeholder="1"
                    className={"flex-1 min-w-0 " + fieldCls}
                    value={b.untuk_n_baju}
                    onChange={(e) => updateBahan(idx, "untuk_n_baju", e.target.value)} />
                  <span className="text-xs text-skin-text3 shrink-0">baju</span>
                </div>
              </div>

              {/* Hasil per baju */}
              <div className="bg-skin-card border border-skin-bdr-lt px-3 py-2 space-y-1">
                {showConv && (
                  <div className="flex justify-between text-xs text-skin-text3">
                    <span>Konversi:</span>
                    <span>
                      {Number(b.qty_dipakai) > 0 && Number(b.untuk_n_baju) > 0
                        ? `${fmt4(Number(b.qty_dipakai) / Math.max(Number(b.untuk_n_baju),1))} ${b.satuan_ukur} → `
                        : ""}
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
          );
        })}

        {bahanItems.length > 0 && (
          <div className="flex justify-between text-sm px-1">
            <span className="text-skin-text3">Total biaya kain:</span>
            <span className="font-semibold text-skin-text">{fmtRp(biayaKain)}</span>
          </div>
        )}
      </div>

      {/* ── Biaya Produksi ── */}
      <div className="space-y-4 border-t border-skin-bdr-lt pt-4">
        <p className={labelCls}>Biaya Produksi</p>

        <div>
          <label className={labelCls}>Upah Jahit</label>
          <RangeWithMarks
            value={upah_jahit} onChange={setUpahJahit}
            min={0} max={50000} step={500}
            marks={[{ value: 35000, label: "35rb" }, { value: 45000, label: "45rb" }]}
          />
        </div>

        <div>
          <label className={labelCls}>Bordir</label>
          <RangeWithMarks
            value={bordir} onChange={setBordir}
            min={0} max={20000} step={500}
            marks={[{ value: 10000, label: "10rb" }, { value: 15000, label: "15rb" }]}
            zeroLabel="Tidak ada"
          />
        </div>

        {/* Biaya Studio: total dari harga dasar, dibagi jumlah baju */}
        <div>
          <label className={labelCls}>Biaya Studio</label>
          <div className="bg-skin-raised border border-skin-bdr-lt px-3 py-2.5 space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-skin-text3">Total biaya studio (dari Harga Dasar)</span>
              <span className="font-medium text-skin-text">{fmtRp(config?.studio ?? 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-skin-text3 shrink-0">÷</span>
              <input type="number" min="1" step="1" placeholder="1"
                className={"flex-1 min-w-0 " + fieldCls}
                value={jumlah_baju_studio}
                onChange={(e) => setJumlahBajuStudio(Math.max(1, Number(e.target.value) || 1))} />
              <span className="text-xs text-skin-text3 shrink-0">baju</span>
            </div>
            <div className="flex justify-between text-xs font-semibold border-t border-skin-bdr-lt pt-2">
              <span className="text-skin-text3">Per baju</span>
              <span className="text-[#CAB170]">{fmtRp(biaya_studio_per_baju)}</span>
            </div>
          </div>
        </div>

        {/* Kancing: tombol + dan - */}
        <div>
          <label className={labelCls}>Jumlah Kancing</label>
          <div className="flex items-center gap-3">
            <button type="button"
              onClick={() => setKancing((v) => Math.max(0, v - 1))}
              className="w-11 h-11 flex items-center justify-center border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] text-2xl transition shrink-0">
              −
            </button>
            <span className="flex-1 text-center text-2xl font-bold text-skin-text">{kancing_qty}</span>
            <button type="button"
              onClick={() => setKancing((v) => v + 1)}
              className="w-11 h-11 flex items-center justify-center border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] text-2xl transition shrink-0">
              +
            </button>
          </div>
          {kancing_qty > 0 && (
            <p className="text-xs text-skin-text3 mt-1.5 text-center">
              {kancing_qty} × {fmtRp(config?.kancing_satuan ?? 500)} = {fmtRp(kancing_qty * (config?.kancing_satuan ?? 500))}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>Catatan</label>
        <textarea rows={2} className={fieldFullCls} placeholder="Opsional..."
          value={catatan} onChange={(e) => setCatatan(e.target.value)} />
      </div>

      {/* ── Rincian & Total HPP ── */}
      <div className="border-2 border-[#CAB170] p-4 space-y-2">
        <p className="font-editorial text-[11px] tracking-[0.18em] uppercase text-skin-text3 mb-3">Rincian HPP</p>

        {/* Biaya kain */}
        <div className="flex justify-between text-sm">
          <span className="text-skin-text3">Biaya Kain</span>
          <span className="font-semibold">{fmtRp(biayaKain)}</span>
        </div>

        {/* Breakdown komponen produksi */}
        {breakdown.map(({ label, val }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-skin-text3 pl-2">· {label}</span>
            <span className={val === 0 ? "text-skin-text4" : ""}>{val === 0 ? "—" : fmtRp(val)}</span>
          </div>
        ))}

        {/* Total */}
        <div className="flex justify-between font-bold border-t-2 border-[#CAB170]/40 pt-3 mt-1">
          <span className="font-editorial tracking-[0.15em] uppercase text-sm text-skin-text">HPP / Baju</span>
          <span className="text-xl text-[#CAB170]">{fmtRp(total)}</span>
        </div>
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition">
          Batal
        </button>
        <button type="submit" disabled={saving}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-60">
          {saving ? "Menyimpan..." : "Simpan & Update HPP"}
        </button>
      </div>

      {showPicker && (
        <BahanPickerModal options={bahanOptions} onSelect={handleSelectBahan} onClose={() => setShowPicker(false)} />
      )}
    </form>
  );
}

// ── Kartu HPP tersimpan ────────────────────────────────────────────────────────
function HPPCard({ tpl, produk, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="bg-skin-card border border-skin-bdr">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-skin-text">{tpl.kode_produk}</p>
            <p className="text-xs text-skin-text3 truncate">{produk?.nama ?? "—"}</p>
          </div>
          <span className="text-lg font-bold text-[#CAB170] shrink-0">{fmtRp(tpl.total_hpp)}</span>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={() => setExpanded((v) => !v)}
            className="flex-1 py-2 text-xs font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text3 hover:text-skin-text transition">
            {expanded ? "Tutup" : "Detail"}
          </button>
          <button onClick={() => onEdit(tpl)}
            className="flex-1 py-2 text-xs font-editorial tracking-[0.15em] uppercase border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] transition">
            Edit
          </button>
          <button onClick={() => onDelete(tpl)}
            className="px-3 py-2 text-xs border border-skin-bdr text-red-400 hover:text-red-600 transition">×</button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-skin-bdr-lt px-4 pb-4 space-y-3">
          {(tpl.bahan_items ?? []).length > 0 && (
            <div>
              <p className="text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mt-3 mb-2">Bahan</p>
              {tpl.bahan_items.map((b, i) => {
                const qpb = calcQtyPerBaju(b);
                const isMotif = b.jenis === "motif";
                return (
                  <div key={i} className="py-1.5 border-b border-skin-bdr-lt last:border-0 space-y-0.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-skin-text2 font-medium">
                        {b.nama_bahan}
                        <span className="ml-1 text-skin-text3 font-normal">({isMotif ? "motif" : "tambahan"})</span>
                      </span>
                      <span className="text-[#CAB170] font-semibold">{fmtRp(Math.round(qpb * b.harga_satuan))}</span>
                    </div>
                    <p className="text-xs text-skin-text3">
                      {b.satuan_ukur && b.satuan_ukur !== b.satuan
                        ? `${b.qty_dipakai} ${b.satuan_ukur} ÷ ${b.untuk_n_baju} baju → ${fmt4(qpb)} ${b.satuan}/baju`
                        : `${b.qty_dipakai} ${b.satuan} ÷ ${b.untuk_n_baju} baju = ${fmt4(qpb)} ${b.satuan}/baju`
                      }
                      {` × ${fmtRp(b.harga_satuan)}/${b.satuan}`}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
          <div className="space-y-1 text-xs">
            {tpl.upah_jahit > 0 && (
              <div className="flex justify-between">
                <span className="text-skin-text3">Upah Jahit</span><span>{fmtRp(tpl.upah_jahit)}</span>
              </div>
            )}
            {tpl.bordir > 0 && (
              <div className="flex justify-between">
                <span className="text-skin-text3">Bordir</span><span>{fmtRp(tpl.bordir)}</span>
              </div>
            )}
            {tpl.biaya_studio > 0 && (
              <div className="flex justify-between">
                <span className="text-skin-text3">Biaya Studio</span><span>{fmtRp(tpl.biaya_studio)}</span>
              </div>
            )}
            {tpl.kancing_qty > 0 && (
              <div className="flex justify-between">
                <span className="text-skin-text3">Kancing ({tpl.kancing_qty} biji)</span>
                <span>{fmtRp(tpl.kancing_qty * (tpl.config_snapshot?.kancing_satuan ?? 500))}</span>
              </div>
            )}
          </div>
          {tpl.catatan && <p className="text-xs text-skin-text3 italic">{tpl.catatan}</p>}
        </div>
      )}
    </div>
  );
}

// ── Halaman utama ──────────────────────────────────────────────────────────────
export default function ProduksiHPP() {
  const { user } = useAuth();
  const { products } = useProducts();
  const [templates,    setTemplates]    = useState([]);
  const [config,       setConfig]       = useState({});
  const [bahanOptions, setBahanOptions] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [showForm,     setShowForm]     = useState(false);
  const [editing,      setEditing]      = useState(null);
  const [selectedKode, setSelectedKode] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTab,    setActiveTab]    = useState("template");
  const [configRows,   setConfigRows]   = useState([]);
  const [editedCfg,    setEditedCfg]    = useState({});
  const [savingCfg,    setSavingCfg]    = useState(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [tpls, cfg, bahan] = await Promise.all([
      supabase.from("hpp_template").select("*").order("kode_produk"),
      fetchConfig(),
      fetchBahanOptions(),
    ]);
    setTemplates(tpls.data ?? []);
    setConfig(cfg);
    setBahanOptions(bahan);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    supabase.from("hpp_config").select("*").order("key").then(({ data }) => {
      setConfigRows(data ?? []);
    });
  }, []);

  async function handleSave(payload) {
    const record = { ...payload, updated_at: new Date().toISOString(), updated_by: user?.email };
    const existing = templates.find((t) => t.kode_produk === payload.kode_produk);
    if (existing) {
      await supabase.from("hpp_template").update(record).eq("id", existing.id).throwOnError();
    } else {
      await supabase.from("hpp_template").insert(record).throwOnError();
    }
    if (payload.kode_produk && payload.total_hpp > 0) {
      await supabase.from("products").update({ hpp: payload.total_hpp }).eq("kode", payload.kode_produk);
      invalidateProducts();
    }
    setShowForm(false); setEditing(null);
    loadAll();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await supabase.from("hpp_template").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    loadAll();
  }

  async function handleSaveCfg(row) {
    const val = Number(editedCfg[row.key] ?? row.nilai);
    setSavingCfg(row.key);
    await supabase.from("hpp_config")
      .update({ nilai: val, updated_at: new Date().toISOString(), updated_by: user?.email })
      .eq("key", row.key);
    setSavingCfg(null);
    setEditedCfg((p) => { const n = { ...p }; delete n[row.key]; return n; });
    setConfigRows((prev) => prev.map((r) => r.key === row.key ? { ...r, nilai: val } : r));
    setConfig(await fetchConfig());
  }

  function openNew()     { setEditing(null); setSelectedKode(""); setShowForm(true); }
  function openEdit(tpl) { setEditing(tpl);  setSelectedKode(tpl.kode_produk ?? ""); setShowForm(true); }

  const fieldFullCls = "w-full px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";
  const labelCls = "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

  return (
    <ProduksiLayout title="HPP Produk">
      {/* Tab */}
      <div className="flex border border-skin-bdr mb-5">
        {[{ key: "template", label: "Template HPP" }, { key: "config", label: "Harga Dasar" }].map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex-1 py-2.5 font-editorial text-xs tracking-[0.18em] uppercase transition border-r last:border-r-0 border-skin-bdr ${
              activeTab === key ? "bg-[#CAB170] text-white" : "text-skin-text3 hover:text-skin-text bg-skin-card"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Template HPP ── */}
      {activeTab === "template" && (
        <>
          <div className="flex justify-end mb-4">
            <button onClick={openNew}
              className="px-5 py-2 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition">
              + Buat Template HPP
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-skin-text3 text-center py-8">Memuat...</p>
          ) : templates.length === 0 ? (
            <p className="text-sm text-skin-text3 text-center py-8">Belum ada template HPP.</p>
          ) : (
            <div className="space-y-3">
              {templates.map((tpl) => (
                <HPPCard key={tpl.id} tpl={tpl}
                  produk={products?.find((p) => p.kode === tpl.kode_produk)}
                  onEdit={openEdit} onDelete={setDeleteTarget} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Harga Dasar ── */}
      {activeTab === "config" && (
        <div className="space-y-2">
          <p className="text-xs text-skin-text3 mb-4">
            Nilai default untuk semua kalkulasi HPP. Tidak mempengaruhi template yang sudah tersimpan.
          </p>
          <div className="border border-skin-bdr divide-y divide-skin-bdr-lt">
            {configRows.map((row) => {
              const val     = editedCfg[row.key] ?? row.nilai;
              const isDirty = editedCfg[row.key] !== undefined && Number(editedCfg[row.key]) !== row.nilai;
              return (
                <div key={row.key} className="p-3 space-y-2">
                  <div>
                    <p className="text-sm text-skin-text2">{row.label}</p>
                    {row.keterangan && <p className="text-xs text-skin-text3">{row.keterangan}</p>}
                  </div>
                  <div className="flex gap-2 items-center">
                    <input type="number" min="0" className={fieldFullCls}
                      value={val}
                      onChange={(e) => setEditedCfg((p) => ({ ...p, [row.key]: e.target.value }))} />
                    {isDirty && (
                      <button onClick={() => handleSaveCfg(row)} disabled={savingCfg === row.key}
                        className="shrink-0 px-4 py-2.5 text-xs font-editorial tracking-[0.15em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-60">
                        {savingCfg === row.key ? "..." : "Simpan"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <BackToTop />

      {/* ── Modal Form HPP ── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => { setShowForm(false); setEditing(null); }} />
          <div className="relative bg-skin-card w-full max-w-lg max-h-[95dvh] overflow-y-auto border-2 border-skin-bdr shadow-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt sticky top-0 bg-skin-card z-10">
              <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
                {editing ? "Edit Template HPP" : "Buat Template HPP"}
              </h2>
              <button onClick={() => { setShowForm(false); setEditing(null); }}
                className="text-skin-text3 hover:text-skin-text transition text-lg leading-none">×</button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className={labelCls}>Produk</label>
                <select className={fieldFullCls} value={selectedKode}
                  onChange={(e) => setSelectedKode(e.target.value)} disabled={!!editing}>
                  <option value="">-- Pilih Produk --</option>
                  {(products ?? []).map((p) => (
                    <option key={p.kode} value={p.kode}>{p.kode} — {p.nama}</option>
                  ))}
                </select>
                {editing && <p className="text-xs text-skin-text3 mt-1">Produk tidak bisa diubah.</p>}
              </div>
              <HPPForm key={editing?.id ?? "new"} initial={editing}
                kode_produk={selectedKode} config={config} bahanOptions={bahanOptions}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditing(null); }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Hapus ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="absolute inset-0" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-skin-card border-2 border-skin-bdr p-6 w-full max-w-sm space-y-4">
            <p className="font-editorial text-sm tracking-[0.15em] uppercase text-skin-text2">Hapus Template HPP</p>
            <p className="text-sm text-skin-text">Hapus template untuk <strong>{deleteTarget.kode_produk}</strong>?</p>
            <div className="flex gap-2">
              <button onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition">Batal</button>
              <button onClick={handleDelete}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-red-500 hover:bg-red-600 transition">Hapus</button>
            </div>
          </div>
        </div>
      )}
    </ProduksiLayout>
  );
}
