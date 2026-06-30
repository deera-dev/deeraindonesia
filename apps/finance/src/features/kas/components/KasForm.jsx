import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { KAS_KATEGORI_OPTIONS } from "../utils";
import { useSaveKas } from "../hooks";
import ReceiptScanner from "./ReceiptScanner";

export default function KasForm({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const saveKas = useSaveKas();
  const [form, setForm] = useState({
    tanggal:    initial?.tanggal    ?? new Date().toISOString().slice(0, 10),
    jenis:      initial?.jenis      ?? "keluar",
    kategori:   initial?.kategori   ?? "Operasional",
    keterangan: "",
    jumlah:     "",
  });
  const [saving, setSaving] = useState(false);
  const [receiptPreview, setReceiptPreview] = useState(null);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  const rJumlah = form.jumlah !== "" ? Number(form.jumlah) : (initial?.jumlah ?? 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (rJumlah <= 0) { toast.error("Jumlah harus lebih dari 0."); return; }
    setSaving(true);
    try {
      const payload = {
        tanggal:    form.tanggal,
        jenis:      form.jenis,
        kategori:   form.kategori,
        keterangan: form.keterangan.trim() || initial?.keterangan || null,
        jumlah:     rJumlah,
      };
      await saveKas(payload, isEdit ? initial : null);
      toast.success(`${form.kategori} ${form.jenis === "masuk" ? "masuk" : "keluar"} Rp ${rJumlah.toLocaleString("id-ID")} ${isEdit ? "diperbarui" : "dicatat"}.`);
      onSave();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col max-h-[90dvh]">
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            {isEdit ? "Edit Kas" : "Catat Kas"}
          </h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {/* Scan Struk */}
            <ReceiptScanner onExtracted={({ previewUrl }) => {
              if (previewUrl !== undefined) setReceiptPreview(previewUrl);
            }} />

            {/* Jenis toggle */}
            <div className="space-y-1.5">
              <label className={labelCls}>Jenis</label>
              <div className="flex gap-2">
                {["masuk", "keluar"].map((j) => (
                  <button
                    key={j}
                    type="button"
                    onClick={() => set("jenis", j)}
                    className={`flex-1 py-2.5 font-editorial text-sm tracking-[0.15em] uppercase border-2 transition ${
                      form.jenis === j
                        ? j === "masuk"
                          ? "border-emerald-500 text-emerald-500 bg-emerald-500/5"
                          : "border-red-400 text-red-400 bg-red-400/5"
                        : "border-skin-bdr text-skin-text3"
                    }`}
                  >
                    {j === "masuk" ? "↓ Masuk" : "↑ Keluar"}
                  </button>
                ))}
              </div>
            </div>

            {/* Tanggal */}
            <div className="space-y-1.5">
              <label className={labelCls}>Tanggal</label>
              <input type="date" value={form.tanggal} onChange={(e) => set("tanggal", e.target.value)} required className={inputCls} />
            </div>

            {/* Kategori */}
            <div className="space-y-1.5">
              <label className={labelCls}>Kategori</label>
              <select value={form.kategori} onChange={(e) => set("kategori", e.target.value)} className={inputCls}>
                {KAS_KATEGORI_OPTIONS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>

            {/* Keterangan */}
            <div className="space-y-1.5">
              <label className={labelCls}>Keterangan</label>
              <input type="text" value={form.keterangan} onChange={(e) => set("keterangan", e.target.value)} placeholder={initial?.keterangan || "Deskripsi singkat"} className={inputCls} />
            </div>

            {/* Jumlah */}
            <div className="space-y-1.5">
              <label className={labelCls}>Jumlah (Rp)</label>
              <input type="number" min="1" value={form.jumlah} onChange={(e) => set("jumlah", e.target.value)} placeholder={initial?.jumlah != null ? String(initial.jumlah) : "0"} required className={inputCls} />
              {rJumlah > 0 && <p className="font-editorial text-xs text-skin-text3">{fmtRp(rJumlah)}</p>}
            </div>
          </div>

          <div className="shrink-0 border-t border-skin-bdr px-5 pt-3 pb-4 flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50">Batal</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50">
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
