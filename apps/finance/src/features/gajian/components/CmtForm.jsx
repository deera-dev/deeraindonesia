import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { useSaveCmt } from "../hooks";
import { Modal, ModalFooter } from "./Modal";
import TotalBar from "./TotalBar";

/** CmtForm.jsx — Form tambah/edit entri CMT Luar (gaji_cmt). */
export default function CmtForm({ gajianId, initial, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const saveCmt = useSaveCmt();

  const [f, setF] = useState({
    nama_vendor: "",
    tanggal_kirim: initial?.tanggal_kirim ?? "",
    tanggal_terima: initial?.tanggal_terima ?? "",
    jumlah_kirim: "",
    jumlah_terima: "",
    harga_upah: "",
    catatan: "",
  });
  const [manualJumlah, setManualJumlah] = useState("");
  const [manualCatatan, setManualCatatan] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const rNum = (k) => (f[k] !== "" ? Number(f[k]) : Number(initial?.[k]) || 0);
  const rStr = (k) => (f[k] !== "" ? f[k] : (initial?.[k] ?? ""));

  const sistemCmt = rNum("jumlah_terima") * rNum("harga_upah");
  const total = sistemCmt + (Number(manualJumlah) || 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        gajian_id: gajianId,
        nama_vendor: rStr("nama_vendor").trim() || null,
        tanggal_kirim: f.tanggal_kirim || null,
        tanggal_terima: f.tanggal_terima || null,
        jumlah_kirim: rNum("jumlah_kirim"),
        jumlah_terima: rNum("jumlah_terima"),
        harga_upah: rNum("harga_upah"),
        total_upah: total,
        catatan: rStr("catatan").trim() || null,
      };
      await saveCmt({ payload, editingId: initial?.id });
      toast.success("Entri CMT disimpan.");
      onSave();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit CMT" : "Tambah CMT"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Nama Vendor</label>
            <input type="text" value={f.nama_vendor} onChange={(e) => set("nama_vendor", e.target.value)} placeholder={initial?.nama_vendor || "Nama vendor CMT"} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className={labelCls}>Tgl Kirim</label>
              <input type="date" value={f.tanggal_kirim} onChange={(e) => set("tanggal_kirim", e.target.value)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Tgl Terima</label>
              <input type="date" value={f.tanggal_terima} onChange={(e) => set("tanggal_terima", e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className={labelCls}>Jml Kirim</label>
              <input type="number" min="0" value={f.jumlah_kirim} onChange={(e) => set("jumlah_kirim", e.target.value)} placeholder={String(initial?.jumlah_kirim ?? 0)} className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Jml Terima</label>
              <input type="number" min="0" value={f.jumlah_terima} onChange={(e) => set("jumlah_terima", e.target.value)} placeholder={String(initial?.jumlah_terima ?? 0)} className={inputCls} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Upah / pcs</label>
            <input type="number" min="0" value={f.harga_upah} onChange={(e) => set("harga_upah", e.target.value)} placeholder={String(initial?.harga_upah ?? 0)} className={inputCls} />
            {sistemCmt > 0 && <p className="font-editorial text-[11px] text-skin-text4">= {fmtRp(sistemCmt)}</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Catatan</label>
            <input type="text" value={f.catatan} onChange={(e) => set("catatan", e.target.value)} placeholder={initial?.catatan || "Opsional"} className={inputCls} />
          </div>

          <div className="border border-skin-bdr">
            <button
              type="button"
              onClick={() => setShowManual((v) => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 font-editorial text-xs tracking-[0.12em] uppercase text-skin-text3"
            >
              Tambahan Manual
              <span>{showManual ? "−" : "+"}</span>
            </button>
            {showManual && (
              <div className="px-3 pb-3 space-y-2">
                <input type="number" value={manualJumlah} onChange={(e) => setManualJumlah(e.target.value)} placeholder="Jumlah tambahan (Rp)" className={inputCls} />
                <input type="text" value={manualCatatan} onChange={(e) => setManualCatatan(e.target.value)} placeholder="Catatan (opsional)" className={inputCls} />
              </div>
            )}
          </div>

          <TotalBar label="Total Upah" value={total} />
        </div>
        <ModalFooter onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}
