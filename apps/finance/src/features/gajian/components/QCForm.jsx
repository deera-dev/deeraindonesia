import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { useFinanceConfig } from "../../pengaturan/hooks";
import { useProdukList, useSaveQC } from "../hooks";
import { Modal, ModalFooter } from "./Modal";
import TotalBar from "./TotalBar";

/** QCForm.jsx — Form tambah/edit entri Tim QC (gaji_qc). */
export default function QCForm({ gajianId, initial, karyawanList, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const { config: cfg } = useFinanceConfig();
  const { produkList } = useProdukList();
  const saveQC = useSaveQC();

  const [namaProduk, setNamaProduk] = useState(initial?.nama_produk ?? "");
  const [karyawanId, setKaryawanId] = useState(initial?.karyawan_id ?? "");
  const [jumlahPcs, setJumlahPcs] = useState("");
  const [catatan, setCatatan] = useState("");
  const [manualJumlah, setManualJumlah] = useState("");
  const [manualCatatan, setManualCatatan] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hanya tampilkan karyawan Tim QC — TIDAK fallback ke daftar penuh
  const qcKaryawan = karyawanList.filter((k) => k.tim === "qc");

  const rPcs = jumlahPcs !== "" ? Number(jumlahPcs) : (initial?.jumlah_pcs ?? 0);
  const sistemQC = rPcs * cfg.tarif_qc;
  const total = sistemQC + (Number(manualJumlah) || 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }
    setSaving(true);
    try {
      const payload = {
        gajian_id: gajianId,
        karyawan_id: karyawanId,
        nama_produk: namaProduk || null,
        jumlah_pcs: rPcs,
        total_upah: total,
        catatan: catatan.trim() || initial?.catatan || null,
      };
      await saveQC({ payload, editingId: initial?.id });
      toast.success("Entri QC disimpan.");
      onSave();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit QC" : "Tambah QC"} onClose={onClose} maxWidth="md:max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-4 md:space-y-0 md:items-start">
          <div className="space-y-1.5">
            <label className={labelCls}>Produk</label>
            <select value={namaProduk} onChange={(e) => setNamaProduk(e.target.value)} className={inputCls}>
              <option value="">— Pilih produk —</option>
              {produkList.map((p) => (
                <option key={p.kode} value={p.nama}>{p.nama}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Karyawan *</label>
            <select value={karyawanId} onChange={(e) => setKaryawanId(e.target.value)} className={inputCls} required>
              <option value="">Pilih karyawan...</option>
              {qcKaryawan.length === 0 ? (
                <option disabled>Belum ada karyawan Tim QC</option>
              ) : (
                qcKaryawan.map((k) => (
                  <option key={k.id} value={k.id}>{k.nama}</option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Jumlah QC (pcs)</label>
            <input type="number" min="0" value={jumlahPcs} onChange={(e) => setJumlahPcs(e.target.value)} placeholder={String(initial?.jumlah_pcs ?? 0)} className={inputCls} />
            {rPcs > 0 && <p className="font-editorial text-[11px] text-skin-text4">= {fmtRp(sistemQC)} ({rPcs} × {fmtRp(cfg.tarif_qc)})</p>}
          </div>

          <div className="space-y-1.5">
            <label className={labelCls}>Catatan</label>
            <input type="text" value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder={initial?.catatan || "Opsional"} className={inputCls} />
          </div>

          <div className="border border-skin-bdr md:col-span-2">
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

          <div className="md:col-span-2">
            <TotalBar label="Total Upah" value={total} />
          </div>
        </div>
        <ModalFooter onCancel={onClose} saving={saving} />
      </form>
    </Modal>
  );
}
