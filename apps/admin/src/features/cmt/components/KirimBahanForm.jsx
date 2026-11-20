import { toast } from "@deera/shared/features/toast/hooks";
import { useState } from "react";
import { useCreateCmtFullKirim } from "../hooks";
import { newBahanItem } from "../utils";

const SATUAN_OPTIONS = ["yard", "meter", "cm", "kg", "lembar", "roll"];

export default function KirimBahanForm({ onClose }) {
  const { createKirimBahan, creating } = useCreateCmtFullKirim();

  const [namaVendor, setNamaVendor] = useState("");
  const [tanggalKirim, setTanggalKirim] = useState(() => new Date().toISOString().slice(0, 10));
  const [estimasiSelesai, setEstimasiSelesai] = useState("");
  const [catatan, setCatatan] = useState("");
  const [bahan, setBahan] = useState([newBahanItem()]);

  const setItem = (i, k, v) =>
    setBahan((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanBahan = bahan.filter((b) => b.nama_bahan.trim() && Number(b.jumlah) > 0);
    if (cleanBahan.length === 0) {
      toast.error("Isi minimal 1 bahan dengan jumlah > 0.");
      return;
    }
    try {
      await createKirimBahan({
        namaVendor,
        tanggalKirim,
        estimasiSelesai,
        bahan: cleanBahan,
        catatan,
      });
      toast.success("Pengiriman bahan ke CMT dicatat.");
      onClose();
    } catch (err) {
      toast.error("Gagal: " + err.message);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <form onSubmit={handleSubmit} className="flex flex-col h-full min-h-0">
          <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
            <h2 className="font-headline text-skin-accent-text text-lg">Kirim Bahan ke CMT</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-skin-text3 text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-skin-text3">Nama Vendor *</label>
              <input
                type="text"
                required
                value={namaVendor}
                onChange={(e) => setNamaVendor(e.target.value)}
                className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-skin-text3">Tgl Kirim *</label>
                <input
                  type="date"
                  required
                  value={tanggalKirim}
                  onChange={(e) => setTanggalKirim(e.target.value)}
                  className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-skin-text3">Estimasi Selesai</label>
                <input
                  type="date"
                  value={estimasiSelesai}
                  onChange={(e) => setEstimasiSelesai(e.target.value)}
                  className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-skin-text3">Bahan yang dikirim</p>
              <p className="text-[11px] text-skin-text4">
                Belum ada kode produk di tahap ini — kode & breakdown diisi nanti pas CMT setor
                barang jadi.
              </p>
              {bahan.map((b, i) => (
                <div key={i} className="bg-skin-raised p-2.5 space-y-2">
                  <input
                    type="text"
                    placeholder="Nama bahan (cth: Wolfis)"
                    value={b.nama_bahan}
                    onChange={(e) => setItem(i, "nama_bahan", e.target.value)}
                    className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
                  />
                  <input
                    type="text"
                    placeholder="Kode bahan (opsional)"
                    value={b.kode_bahan}
                    onChange={(e) => setItem(i, "kode_bahan", e.target.value)}
                    className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={b.satuan}
                      onChange={(e) => setItem(i, "satuan", e.target.value)}
                      className="border border-skin-bdr bg-skin-card px-2 py-2 text-sm text-skin-text"
                    >
                      {SATUAN_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      placeholder="Jumlah"
                      value={b.jumlah}
                      onChange={(e) => setItem(i, "jumlah", e.target.value)}
                      className="border border-skin-bdr bg-skin-card px-2 py-2 text-sm text-skin-text"
                    />
                  </div>
                  {bahan.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setBahan((p) => p.filter((_, idx) => idx !== i))}
                      className="text-xs font-editorial text-red-400"
                    >
                      − Hapus
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setBahan((p) => [...p, newBahanItem()])}
                className="font-editorial text-xs tracking-[0.12em] uppercase text-skin-accent-text"
              >
                + Tambah bahan
              </button>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-skin-text3">Catatan</label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
              />
            </div>
          </div>

          <div className="flex-shrink-0 border-t border-skin-bdr p-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 text-sm font-editorial tracking-[0.15em] uppercase border-2 border-skin-bdr text-skin-text2"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={creating}
              className="flex-1 py-3 text-sm font-editorial tracking-[0.15em] uppercase text-skin-on-accent bg-skin-accent hover:bg-skin-accent-hover transition disabled:opacity-50"
            >
              {creating ? "Menyimpan..." : "Kirim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
