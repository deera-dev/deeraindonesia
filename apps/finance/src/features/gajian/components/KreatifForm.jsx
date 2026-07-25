import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { useFinanceConfig } from "../../pengaturan/hooks";
import { useSaveKreatif } from "../hooks";
import { calcUpahKreatif } from "../utils";
import { Modal, ModalFooter } from "./Modal";
import KaryawanSelect from "./KaryawanSelect";
import TotalBar from "./TotalBar";

/** KreatifForm.jsx — Form tambah/edit entri Tim Kreatif (gaji_kreatif). */
export default function KreatifForm({ gajianId, initial, karyawanList, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const { config: cfg } = useFinanceConfig();
  const saveKreatif = useSaveKreatif();

  const [karyawanId, setKaryawanId] = useState(initial?.karyawan_id ?? "");
  const [video, setVideo] = useState("");
  const [foto, setFoto] = useState("");
  const [logo, setLogo] = useState("");
  const [manualJumlah, setManualJumlah] = useState("");
  const [manualCatatan, setManualCatatan] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const rVideo = video !== "" ? Number(video) : (initial?.jumlah_video ?? 0);
  const rFoto = foto !== "" ? Number(foto) : (initial?.jumlah_foto ?? 0);
  const rLogo = logo !== "" ? Number(logo) : (initial?.jumlah_logo ?? 0);

  const sistemKreatif = calcUpahKreatif({ jumlah_video: rVideo, jumlah_foto: rFoto, jumlah_logo: rLogo }, cfg);
  const total = sistemKreatif + (Number(manualJumlah) || 0);

  const fields = [
    ["Video", video, setVideo, `×${fmtRp(cfg.tarif_video)}`, String(initial?.jumlah_video ?? 0)],
    ["Foto Seri", foto, setFoto, `×${fmtRp(cfg.tarif_foto)}`, String(initial?.jumlah_foto ?? 0)],
    ["Logo", logo, setLogo, `×${fmtRp(cfg.tarif_logo)}`, String(initial?.jumlah_logo ?? 0)],
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }
    setSaving(true);
    try {
      const payload = {
        gajian_id: gajianId,
        karyawan_id: karyawanId,
        jumlah_video: rVideo,
        jumlah_foto: rFoto,
        jumlah_logo: rLogo,
        total_upah: total,
      };
      await saveKreatif({ payload, editingId: initial?.id });
      toast.success("Entri Kreatif disimpan.");
      onSave();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Kreatif" : "Tambah Kreatif"} onClose={onClose} maxWidth="md:max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Karyawan *</label>
            <KaryawanSelect value={karyawanId} onChange={setKaryawanId} list={karyawanList} timFilter="kreatif" />
          </div>

          <div className="grid grid-cols-3 md:gap-4 gap-2">
            {fields.map(([label, val, setVal, hint, placeholder]) => (
              <div key={label} className="space-y-1.5">
                <label className={labelCls}>{label}</label>
                <input type="number" min="0" value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} className={inputCls} />
                <p className="font-editorial text-[11px] text-skin-text4">{hint}</p>
              </div>
            ))}
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
