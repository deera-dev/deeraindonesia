import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { inputCls, labelCls } from "../../../shared/lib/format";
import { TIM_OPTIONS } from "../utils";
import { useSaveKaryawan } from "../hooks";

export default function KaryawanForm({ initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const saveKaryawan = useSaveKaryawan();
  const [form, setForm] = useState({
    nama:        initial?.nama        ?? "",
    tim:         initial?.tim         ?? "jahit",
    no_rekening: initial?.no_rekening ?? "",
    nama_bank:   initial?.nama_bank   ?? "",
    aktif:       initial?.aktif       ?? true,
  });
  const [saving, setSaving] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.nama.trim()) { toast.error("Nama wajib diisi."); return; }
    setSaving(true);
    try {
      const payload = {
        nama:        form.nama.trim(),
        tim:         form.tim,
        no_rekening: form.no_rekening.trim() || null,
        nama_bank:   form.nama_bank.trim()   || null,
        aktif:       form.aktif,
      };
      await saveKaryawan(payload, isEdit ? initial : null);
      toast.success(isEdit ? `${form.nama.trim()} berhasil diperbarui.` : `${form.nama.trim()} berhasil ditambahkan.`);
      onSave();
    } catch (err) {
      toast.error("Gagal menyimpan: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg border-t-2 md:border-2 border-skin-bdr shadow-xl flex flex-col max-h-[90dvh]">
        {/* header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            {isEdit ? "Edit Karyawan" : "Tambah Karyawan"}
          </h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 transition text-2xl leading-none">×</button>
        </div>

        {/* body */}
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            {/* Nama */}
            <div className="space-y-1.5">
              <label className={labelCls}>Nama Karyawan *</label>
              <input
                type="text"
                value={form.nama}
                onChange={(e) => set("nama", e.target.value)}
                placeholder="NAMA LENGKAP"
                className={inputCls}
                required
              />
            </div>

            {/* Tim */}
            <div className="space-y-1.5">
              <label className={labelCls}>Tim</label>
              <select
                value={form.tim}
                onChange={(e) => set("tim", e.target.value)}
                className={inputCls}
              >
                {TIM_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* No Rekening */}
            <div className="space-y-1.5">
              <label className={labelCls}>No. Rekening</label>
              <input
                type="text"
                value={form.no_rekening}
                onChange={(e) => set("no_rekening", e.target.value)}
                placeholder="Nomor rekening bank"
                className={inputCls}
              />
            </div>

            {/* Nama Bank */}
            <div className="space-y-1.5">
              <label className={labelCls}>Nama Bank</label>
              <input
                type="text"
                value={form.nama_bank}
                onChange={(e) => set("nama_bank", e.target.value)}
                placeholder="BCA / BNI / Mandiri / ..."
                className={inputCls}
              />
            </div>

            {/* Aktif toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => set("aktif", !form.aktif)}
                className={`w-10 h-6 rounded-full flex items-center transition-colors ${form.aktif ? "bg-[#CAB170]" : "bg-skin-bdr"}`}
              >
                <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${form.aktif ? "translate-x-[18px]" : "translate-x-0.5"}`} />
              </div>
              <span className="font-editorial text-sm text-skin-text2">
                {form.aktif ? "Aktif" : "Tidak Aktif"}
              </span>
            </label>
          </div>

          {/* footer */}
          <div className="shrink-0 border-t border-skin-bdr px-5 pt-3 pb-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 hover:border-skin-text transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
