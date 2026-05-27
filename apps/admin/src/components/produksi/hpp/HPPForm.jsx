/**
 * HPPForm.jsx — Form kalkulasi HPP per produk.
 * Mendukung bahan tipe "motif" (per baju langsung) dan "tambahan" (total ÷ n baju + konversi satuan).
 */
import { useState } from "react";
import { fmtRp, fmt4, calcQtyPerBaju, normItem, calcTotal, satuanUkurOptions } from "./hppUtils";
import RangeWithMarks from "./RangeWithMarks";
import BahanPickerModal from "./BahanPickerModal";

const fieldCls =
  "px-3 py-2.5 bg-skin-input border border-skin-bdr text-skin-text text-sm focus:outline-none focus:border-[#CAB170] transition";
const fieldFullCls = "w-full " + fieldCls;
const labelCls = "block text-xs font-editorial tracking-[0.15em] uppercase text-skin-text3 mb-1";

export default function HPPForm({ initial, kode_produk, config, bahanOptions, onSave, onCancel }) {
  const [bahanItems, setBahanItems] = useState((initial?.bahan_items ?? []).map(normItem));
  const [upah_jahit, setUpahJahit] = useState(Number(initial?.upah_jahit ?? 0));
  const [bordir, setBordir] = useState(Number(initial?.bordir ?? 0));
  const [jumlah_baju_studio, setJumlahBajuStudio] = useState(
    initial?.jumlah_baju_studio > 1 ? String(initial.jumlah_baju_studio) : "",
  );
  const [kancing_qty, setKancing] = useState(Number(initial?.kancing_qty ?? 0));
  const [catatan, setCatatan] = useState(initial?.catatan ?? "");
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const biaya_studio_per_baju = Math.round(
    (config?.studio ?? 0) / Math.max(Number(jumlah_baju_studio) || 1, 1),
  );

  const { biayaKain, total, breakdown } = calcTotal({
    bahanItems,
    upah_jahit,
    bordir,
    kancing_qty,
    biaya_studio: biaya_studio_per_baju,
    config,
  });

  function recompute(item) {
    const qpb = calcQtyPerBaju(item);
    return {
      ...item,
      qty_per_baju: qpb,
      subtotal: Math.round(qpb * (Number(item.harga_satuan) || 0)),
    };
  }

  function handleSelectBahan(opt) {
    setShowPicker(false);
    const isFirst = bahanItems.length === 0;
    setBahanItems((prev) => [
      ...prev,
      recompute({
        bahan_id: opt.id,
        bahan_type: opt._type,
        nama_bahan: opt.nama_bahan,
        kode_bahan: opt.kode_bahan ?? "",
        satuan: opt.satuan,
        harga_satuan: opt.harga_satuan,
        jenis: isFirst ? "motif" : "tambahan",
        qty_dipakai: "",
        satuan_ukur: opt.satuan,
        untuk_n_baju: 1,
        qty_per_baju: 0,
        subtotal: 0,
      }),
    ]);
  }

  const updateBahan = (idx, field, val) =>
    setBahanItems((prev) =>
      prev.map((b, i) => (i !== idx ? b : recompute({ ...b, [field]: val }))),
    );

  const toggleJenis = (idx) =>
    setBahanItems((prev) =>
      prev.map((b, i) =>
        i !== idx ? b : { ...b, jenis: b.jenis === "motif" ? "tambahan" : "motif" },
      ),
    );

  const removeBahan = (idx) => setBahanItems((prev) => prev.filter((_, i) => i !== idx));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!kode_produk) return setErr("Pilih produk terlebih dahulu.");
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
          untuk_n_baju: b.jenis === "motif" ? 1 : Number(b.untuk_n_baju) || 1,
          qty_per_baju: qpb,
          subtotal: Math.round(qpb * (Number(b.harga_satuan) || 0)),
        };
      });
      await onSave({
        kode_produk,
        bahan_items: cleanItems,
        upah_jahit: Number(upah_jahit) || 0,
        bordir: Number(bordir) || 0,
        biaya_studio: biaya_studio_per_baju,
        jumlah_baju_studio: Number(jumlah_baju_studio) || 1,
        kancing_qty: Number(kancing_qty) || 0,
        catatan,
        config_snapshot: config,
        total_hpp: total,
      });
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ── Bahan ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className={labelCls + " !mb-0"}>Bahan</p>
          <button
            type="button"
            onClick={() => setShowPicker(true)}
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

          return (
            <div key={idx} className="border border-skin-bdr p-3 space-y-3 bg-skin-raised">
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
                    onClick={() => toggleJenis(idx)}
                    title={isMotif ? "Klik untuk ubah ke Tambahan" : "Klik untuk ubah ke Motif"}
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
                  >
                    ×
                  </button>
                </div>
              </div>

              <div>
                <label className={labelCls}>Harga / {b.satuan}</label>
                <input
                  type="number"
                  min="0"
                  className={fieldFullCls}
                  value={b.harga_satuan}
                  onChange={(e) => updateBahan(idx, "harga_satuan", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <label className={labelCls}>Total Pemakaian</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    placeholder="0"
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
                      {opts.map((u) => (
                        <option key={u} value={u}>
                          {u}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="shrink-0 self-center text-sm text-skin-text3">{b.satuan}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-skin-text3 shrink-0">untuk</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    placeholder="1"
                    className={"flex-1 min-w-0 " + fieldCls}
                    value={b.untuk_n_baju}
                    onChange={(e) => updateBahan(idx, "untuk_n_baju", e.target.value)}
                  />
                  <span className="text-xs text-skin-text3 shrink-0">baju</span>
                </div>
              </div>

              <div className="bg-skin-card border border-skin-bdr-lt px-3 py-2 space-y-1">
                {showConv && (
                  <div className="flex justify-between text-xs text-skin-text3">
                    <span>Konversi:</span>
                    <span>
                      {Number(b.qty_dipakai) > 0 && Number(b.untuk_n_baju) > 0
                        ? `${fmt4(Number(b.qty_dipakai) / Math.max(Number(b.untuk_n_baju), 1))} ${b.satuan_ukur} → `
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
            value={upah_jahit}
            onChange={setUpahJahit}
            min={0}
            max={50000}
            step={500}
            marks={[
              { value: 35000, label: "35rb" },
              { value: 45000, label: "45rb" },
            ]}
          />
        </div>

        <div>
          <label className={labelCls}>Bordir</label>
          <RangeWithMarks
            value={bordir}
            onChange={setBordir}
            min={0}
            max={20000}
            step={500}
            marks={[
              { value: 10000, label: "10rb" },
              { value: 15000, label: "15rb" },
            ]}
            zeroLabel="Tidak ada"
          />
        </div>

        <div>
          <label className={labelCls}>Biaya Studio</label>
          <div className="bg-skin-raised border border-skin-bdr-lt px-3 py-2.5 space-y-2.5">
            <div className="flex justify-between text-xs">
              <span className="text-skin-text3">Total biaya studio (dari Harga Dasar)</span>
              <span className="font-medium text-skin-text">{fmtRp(config?.studio ?? 0)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-skin-text3 shrink-0">÷</span>
              <input
                type="number"
                min="1"
                step="1"
                placeholder="1"
                className={"flex-1 min-w-0 " + fieldCls}
                value={jumlah_baju_studio}
                onChange={(e) => setJumlahBajuStudio(e.target.value)}
              />
              <span className="text-xs text-skin-text3 shrink-0">baju</span>
            </div>
            <div className="flex justify-between text-xs font-semibold border-t border-skin-bdr-lt pt-2">
              <span className="text-skin-text3">Per baju</span>
              <span className="text-[#CAB170]">{fmtRp(biaya_studio_per_baju)}</span>
            </div>
          </div>
        </div>

        <div>
          <label className={labelCls}>Jumlah Kancing</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setKancing((v) => Math.max(0, v - 1))}
              className="w-11 h-11 flex items-center justify-center border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] text-2xl transition shrink-0"
            >
              −
            </button>
            <span className="flex-1 text-center text-2xl font-bold text-skin-text">
              {kancing_qty}
            </span>
            <button
              type="button"
              onClick={() => setKancing((v) => v + 1)}
              className="w-11 h-11 flex items-center justify-center border border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170] text-2xl transition shrink-0"
            >
              +
            </button>
          </div>
          {kancing_qty > 0 && (
            <p className="text-xs text-skin-text3 mt-1.5 text-center">
              {kancing_qty} × {fmtRp(config?.kancing_satuan ?? 500)} ={" "}
              {fmtRp(kancing_qty * (config?.kancing_satuan ?? 500))}
            </p>
          )}
        </div>
      </div>

      <div>
        <label className={labelCls}>Catatan</label>
        <textarea
          rows={2}
          className={fieldFullCls}
          placeholder="Opsional..."
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
        />
      </div>

      {/* ── Rincian & Total HPP ── */}
      <div className="border-2 border-[#CAB170] p-4 space-y-2">
        <p className="font-editorial text-[11px] tracking-[0.18em] uppercase text-skin-text3 mb-3">
          Rincian HPP
        </p>
        <div className="flex justify-between text-sm">
          <span className="text-skin-text3">Biaya Kain</span>
          <span className="font-semibold">{fmtRp(biayaKain)}</span>
        </div>
        {breakdown.map(({ label, val }) => (
          <div key={label} className="flex justify-between text-xs">
            <span className="text-skin-text3 pl-2">· {label}</span>
            <span className={val === 0 ? "text-skin-text4" : ""}>
              {val === 0 ? "—" : fmtRp(val)}
            </span>
          </div>
        ))}
        <div className="flex justify-between font-bold border-t-2 border-[#CAB170]/40 pt-3 mt-1">
          <span className="font-editorial tracking-[0.15em] uppercase text-sm text-skin-text">
            HPP / Baju
          </span>
          <span className="text-xl text-[#CAB170]">{fmtRp(total)}</span>
        </div>
      </div>

      {err && <p className="text-sm text-red-500">{err}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan & Update HPP"}
        </button>
      </div>

      {showPicker && (
        <BahanPickerModal
          options={bahanOptions}
          onSelect={handleSelectBahan}
          onClose={() => setShowPicker(false)}
        />
      )}
    </form>
  );
}
