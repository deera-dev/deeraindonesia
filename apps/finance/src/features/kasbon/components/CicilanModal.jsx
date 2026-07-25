import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { usePayCicilan } from "../hooks";

export default function CicilanModal({ kasbon, onClose, onSave }) {
  const payCicilan = usePayCicilan();
  const [jumlah, setJumlah] = useState("");
  const [tanggal, setTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [keterangan, setKeterangan] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const bayar = Number(jumlah);
    if (!bayar || bayar <= 0) { toast.error("Jumlah cicilan harus > 0."); return; }
    if (bayar > kasbon.sisa) { toast.error(`Cicilan melebihi sisa (${fmtRp(kasbon.sisa)}).`); return; }
    setSaving(true);
    try {
      const { newSisa, newStatus } = await payCicilan({
        kasbon,
        jumlah: bayar,
        tanggal,
        keterangan: keterangan.trim() || null,
      });
      toast.success(newStatus === "lunas" ? "Kasbon lunas!" : `Cicilan dicatat. Sisa: ${fmtRp(newSisa)}`);
      onSave();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex md:items-center md:justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0 hidden md:block" onClick={onClose} />
      <div className="relative bg-skin-card w-full h-full md:h-auto md:max-w-md md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">Bayar Cicilan</h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="bg-skin-gold border border-skin-bdr-gold p-3 flex items-center justify-between">
            <span className="font-editorial text-xs text-skin-text3 uppercase tracking-wide">Sisa Kasbon</span>
            <span className="font-numeric text-[#CAB170] text-lg leading-none">{fmtRp(kasbon.sisa)}</span>
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Tanggal Bayar</label>
            <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required className={inputCls} />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Jumlah Cicilan (Rp)</label>
            <input type="number" min="1" max={kasbon.sisa} value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder="0" required className={inputCls} />
            {jumlah && <p className="font-numeric text-xs text-skin-text3">{fmtRp(Number(jumlah) || 0)}</p>}
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Keterangan</label>
            <input type="text" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder="Potong gaji, dll" className={inputCls} />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50">Batal</button>
            <button type="submit" disabled={saving} className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-50">
              {saving ? "Menyimpan..." : "Bayar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
