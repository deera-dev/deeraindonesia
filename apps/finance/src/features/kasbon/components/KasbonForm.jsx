import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { useCreateOrAccumulateKasbon, useUpdateKasbonJumlah } from "../hooks";

// Catatan jumlah saat edit: input dibuat KOSONG, nilai lama tampil sebagai
// placeholder. Kalau dikosongkan saat submit, nilai lama tetap dipakai —
// mengikuti pola yang sama dengan KasForm di features/kas.
export default function KasbonForm({ initial, karyawanList, existingRows, onSave, onClose }) {
  const isEdit = !!initial?.id;
  const createOrAccumulateKasbon = useCreateOrAccumulateKasbon();
  const updateKasbonJumlah = useUpdateKasbonJumlah();
  const [karyawanId, setKaryawanId] = useState(initial?.karyawan_id ?? "");
  const [tanggal, setTanggal] = useState(initial?.tanggal ?? new Date().toISOString().slice(0, 10));
  const [jumlah, setJumlah] = useState("");
  const [keterangan, setKeterangan] = useState("");
  const [saving, setSaving] = useState(false);

  const jumlahPlaceholder = isEdit ? String(initial.jumlah) : "0";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!karyawanId) { toast.error("Pilih karyawan."); return; }

    const effJumlah = jumlah !== "" ? Number(jumlah) : isEdit ? initial.jumlah : 0;
    if (!effJumlah || effJumlah <= 0) { toast.error("Jumlah harus lebih dari 0."); return; }

    setSaving(true);
    try {
      const ket = keterangan.trim() || null;

      if (isEdit) {
        // Sisa harus tetap mempertahankan jumlah yang sudah dibayar lewat cicilan.
        const totalDibayar = initial.jumlah - initial.sisa;
        if (effJumlah < totalDibayar) {
          toast.error(`Jumlah baru tidak boleh kurang dari yang sudah dibayar (${fmtRp(totalDibayar)}).`);
          setSaving(false);
          return;
        }
        const { newSisa } = await updateKasbonJumlah({ initial, jumlah: effJumlah, tanggal, keterangan: ket });
        toast.success(`Kasbon diperbarui — jumlah ${fmtRp(effJumlah)}, sisa ${fmtRp(newSisa)}.`);
      } else {
        const result = await createOrAccumulateKasbon({ karyawanId, tanggal, jumlah: effJumlah, keterangan: ket, existingRows });
        if (result.accumulated) {
          toast.success(
            `Ditambahkan ke kasbon ${result.karyawanNama} yang sudah ada. Total sekarang ${fmtRp(result.newJumlah)}.`,
          );
        } else {
          toast.success(`Kasbon ${fmtRp(effJumlah)} dicatat.`);
        }
      }
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
            {isEdit ? "Edit Kasbon" : "Kasbon Baru"}
          </h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
            <div className="space-y-1.5">
              <label className={labelCls}>Karyawan *</label>
              <select value={karyawanId} onChange={(e) => setKaryawanId(e.target.value)} className={inputCls} required disabled={isEdit}>
                <option value="">— Pilih karyawan —</option>
                {karyawanList.map((k) => <option key={k.id} value={k.id}>{k.nama}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Tanggal Pinjam</label>
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required className={inputCls} />
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Jumlah Pinjam (Rp)</label>
              <input type="number" min="1" value={jumlah} onChange={(e) => setJumlah(e.target.value)} placeholder={jumlahPlaceholder} className={inputCls} />
              {isEdit && (
                <p className="font-editorial text-[11px] text-skin-text4">
                  Kosongkan untuk tetap memakai jumlah lama ({fmtRp(initial.jumlah)}).
                </p>
              )}
              {!isEdit && jumlah && <p className="font-editorial text-xs text-skin-text3">{fmtRp(Number(jumlah) || 0)}</p>}
              {!isEdit && karyawanId && (existingRows ?? []).some((r) => r.karyawan_id === karyawanId && r.status === "belum") && (
                <p className="font-editorial text-[11px] text-amber-500">
                  Karyawan ini sudah punya kasbon belum lunas — jumlah akan diakumulasikan ke kasbon yang sama.
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <label className={labelCls}>Keterangan</label>
              <input type="text" value={keterangan} onChange={(e) => setKeterangan(e.target.value)} placeholder={initial?.keterangan || "Opsional"} className={inputCls} />
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
