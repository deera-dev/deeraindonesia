import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { useFinanceConfig } from "../../pengaturan/hooks";
import { useSavePotong } from "../hooks";
import { calcUpahPotong } from "../utils";
import { Modal, ModalFooter } from "./Modal";
import KaryawanSelect from "./KaryawanSelect";
import RangeSlider from "./RangeSlider";
import TotalBar from "./TotalBar";

/** PotongForm.jsx — Form tambah/edit entri Tim Potong (gaji_potong). */
export default function PotongForm({ gajianId, initial, karyawanList, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const { config: cfg } = useFinanceConfig();
  const savePotong = useSavePotong();

  const [karyawanId, setKaryawanId] = useState(initial?.karyawan_id ?? "");
  const [pola, setPola] = useState("");
  const [sampel, setSampel] = useState("");
  const [qty, setQty] = useState("");
  const [tarif, setTarif] = useState(initial?.tarif_potongan ?? 4000);
  const [manualJumlah, setManualJumlah] = useState("");
  const [manualCatatan, setManualCatatan] = useState("");
  const [showManual, setShowManual] = useState(false);
  const [saving, setSaving] = useState(false);

  const rPola = pola !== "" ? Number(pola) : (initial?.jumlah_pola ?? 0);
  const rSampel = sampel !== "" ? Number(sampel) : (initial?.jumlah_sampel ?? 0);
  const rQty = qty !== "" ? Number(qty) : (initial?.qty_potongan ?? 0);

  const sistemUpah = calcUpahPotong({ jumlah_pola: rPola, jumlah_sampel: rSampel, qty_potongan: rQty, tarif_potongan: tarif }, cfg);
  const total = sistemUpah + (Number(manualJumlah) || 0);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }

    setSaving(true);
    try {
      const payload = {
        gajian_id: gajianId,
        karyawan_id: karyawanId,
        jumlah_pola: rPola,
        jumlah_sampel: rSampel,
        qty_potongan: rQty,
        tarif_potongan: tarif,
        total_upah: total,
      };
      await savePotong({ payload, editingId: initial?.id });
      toast.success("Entri Potong disimpan.");
      onSave();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Potong" : "Tambah Potong"} onClose={onClose} maxWidth="md:max-w-2xl">
      <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-4 md:space-y-0 md:items-start">
          <div className="space-y-1.5 md:col-span-2">
            <label className={labelCls}>Karyawan *</label>
            <KaryawanSelect value={karyawanId} onChange={setKaryawanId} list={karyawanList} timFilter="potong" />
          </div>

          <div className="grid grid-cols-3 gap-2 md:col-span-2">
            <div className="space-y-1.5">
              <label className={labelCls}>Jml Pola</label>
              <input type="number" min="0" value={pola} onChange={(e) => setPola(e.target.value)} placeholder={String(initial?.jumlah_pola ?? 0)} className={inputCls} />
              <p className="font-editorial text-[11px] text-skin-text4">×{fmtRp(cfg.tarif_pola)}</p>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Jml Sampel</label>
              <input type="number" min="0" value={sampel} onChange={(e) => setSampel(e.target.value)} placeholder={String(initial?.jumlah_sampel ?? 0)} className={inputCls} />
              <p className="font-editorial text-[11px] text-skin-text4">×{fmtRp(cfg.tarif_sampel)}</p>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Qty Potongan</label>
              <input type="number" min="0" value={qty} onChange={(e) => setQty(e.target.value)} placeholder={String(initial?.qty_potongan ?? 0)} className={inputCls} />
              <p className="font-editorial text-[11px] text-skin-text4">×{fmtRp(tarif)}</p>
            </div>
          </div>

          <div className="md:col-span-2">
            <RangeSlider
              label="Tarif per Pcs Potongan"
              value={tarif}
              min={4000}
              max={6000}
              step={100}
              marks={[4000, 4500, 5000, 5500, 6000]}
              onChange={setTarif}
            />
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
