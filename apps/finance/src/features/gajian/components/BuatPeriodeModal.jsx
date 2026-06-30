import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { getSabtu, inputCls, labelCls } from "../../../shared/lib/format";
import { useCreateGajianPeriode } from "../hooks";

/** BuatPeriodeModal.jsx — Modal kecil untuk membuat periode gajian_minggu baru. */
export default function BuatPeriodeModal({ onClose, onSave }) {
  const [tanggal, setTanggal] = useState(getSabtu());
  const [saving, setSaving] = useState(false);
  const createGajianPeriode = useCreateGajianPeriode();

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const id = await createGajianPeriode(tanggal);
      onSave(id);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-sm border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">Periode Baru</h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Tanggal Sabtu</label>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} className={inputCls} required />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50 transition">
              Batal
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50">
              {saving ? "Membuat..." : "Buat"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
