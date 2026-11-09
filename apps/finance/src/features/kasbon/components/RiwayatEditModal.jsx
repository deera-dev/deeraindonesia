import { toast } from "@deera/shared/features/toast/hooks";
import { useState } from "react";
import { fmtRp, inputCls, labelCls } from "../../../shared/lib/format";
import { useUpdateKasbonRiwayatItem } from "../hooks";

export default function RiwayatEditModal({ kasbon, jenis, index, entry, onClose, onSave }) {
  const updateKasbonRiwayatItem = useUpdateKasbonRiwayatItem();
  const [tanggal, setTanggal] = useState(entry.tanggal ?? "");
  const [jumlah, setJumlah] = useState(String(entry.jumlah ?? ""));
  const [keterangan, setKeterangan] = useState(entry.keterangan ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const jml = Number(jumlah);
    if (!jml || jml <= 0) {
      toast.error("Jumlah harus lebih dari 0.");
      return;
    }
    setSaving(true);
    try {
      const { newSisa } = await updateKasbonRiwayatItem({
        kasbon,
        jenis,
        index,
        tanggal,
        jumlah: jml,
        keterangan: keterangan.trim() || null,
      });
      toast.success(`Riwayat diperbarui. Sisa sekarang ${fmtRp(newSisa)}.`);
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
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">
            Edit Riwayat {jenis === "tambah" ? "Tambahan" : "Cicilan"}
          </h2>
          <button
            onClick={onClose}
            className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition"
          >
            ×
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className={labelCls}>Tanggal</label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              required
              className={inputCls}
            />
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Jumlah (Rp)</label>
            <input
              type="number"
              min="1"
              value={jumlah}
              onChange={(e) => setJumlah(e.target.value)}
              required
              className={inputCls}
            />
            {jumlah && (
              <p className="font-numeric text-xs text-skin-text3">{fmtRp(Number(jumlah) || 0)}</p>
            )}
          </div>
          <div className="space-y-1.5">
            <label className={labelCls}>Keterangan</label>
            <input
              type="text"
              value={keterangan}
              onChange={(e) => setKeterangan(e.target.value)}
              placeholder="Opsional"
              className={inputCls}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase border-2 border-skin-bdr text-skin-text2 disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.18em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-50"
            >
              {saving ? "Menyimpan..." : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
