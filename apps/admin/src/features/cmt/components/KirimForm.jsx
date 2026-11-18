import { useState } from "react";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { useProducts } from "@deera/shared/features/products/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { useCreateKirimCmtJahit } from "../hooks";
import { newKirimItem } from "../utils";

export default function KirimForm({ onClose }) {
  const { user } = useAuth();
  const { products } = useProducts();
  const { createKirim, creating } = useCreateKirimCmtJahit();

  const [namaVendor, setNamaVendor] = useState("");
  const [tanggalKirim, setTanggalKirim] = useState(() => new Date().toISOString().slice(0, 10));
  const [estimasiSelesai, setEstimasiSelesai] = useState("");
  const [hargaUpah, setHargaUpah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [items, setItems] = useState([newKirimItem()]);

  const setItem = (i, k, v) =>
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanItems = items.filter((it) => it.kode_produk && it.size && Number(it.qty) > 0);
    if (cleanItems.length === 0) {
      toast.error("Isi minimal 1 produk dengan qty > 0.");
      return;
    }
    try {
      await createKirim({
        namaVendor,
        tanggalKirim,
        estimasiSelesai,
        hargaUpah,
        catatan,
        items: cleanItems,
        user,
      });
      toast.success("Pengiriman ke CMT dicatat.");
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
            <h2 className="font-headline text-skin-accent-text text-lg">Kirim Potongan ke CMT</h2>
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
            <div className="space-y-1">
              <label className="text-xs text-skin-text3">Upah/pcs Sepakat *</label>
              <input
                type="number"
                min="0"
                required
                value={hargaUpah}
                onChange={(e) => setHargaUpah(e.target.value)}
                className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
              />
            </div>

            <div className="space-y-2">
              <p className="text-xs text-skin-text3">Produk yang dikirim</p>
              {items.map((it, i) => {
                const produk = products?.find((p) => p.kode === it.kode_produk);
                const sizeOpts = (produk?.variants ?? []).map((v) => v.size).filter(Boolean);
                const warnaOpts = produk?.warna ?? [];
                return (
                  <div key={i} className="bg-skin-raised p-2.5 space-y-2">
                    <input
                      type="text"
                      list={`kirim-kode-${i}`}
                      data-testid={`kirim-kode-${i}`}
                      value={it.kode_produk}
                      onChange={(e) => {
                        const kode = e.target.value;
                        const p = products?.find((x) => x.kode === kode);
                        setItem(i, "kode_produk", kode);
                        setItem(i, "nama_produk", p?.nama ?? "");
                      }}
                      placeholder="— Pilih/cari kode —"
                      className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
                      autoComplete="off"
                    />
                    <datalist id={`kirim-kode-${i}`}>
                      {(products ?? []).map((p) => (
                        <option key={p.kode} value={p.kode} label={`${p.kode} — ${p.nama}`} />
                      ))}
                    </datalist>
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={it.size}
                        onChange={(e) => setItem(i, "size", e.target.value)}
                        className="border border-skin-bdr bg-skin-card px-2 py-2 text-sm text-skin-text"
                      >
                        <option value="">Ukuran</option>
                        {sizeOpts.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <select
                        value={it.warna}
                        onChange={(e) => setItem(i, "warna", e.target.value)}
                        className="border border-skin-bdr bg-skin-card px-2 py-2 text-sm text-skin-text"
                      >
                        <option value="">{warnaOpts.length ? "Warna" : "(tanpa warna)"}</option>
                        {warnaOpts.map((w) => (
                          <option key={w} value={w}>
                            {w}
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        placeholder="Qty"
                        value={it.qty}
                        onChange={(e) => setItem(i, "qty", e.target.value)}
                        className="border border-skin-bdr bg-skin-card px-2 py-2 text-sm text-skin-text"
                      />
                    </div>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                        className="text-xs font-editorial text-red-400"
                      >
                        − Hapus
                      </button>
                    )}
                  </div>
                );
              })}
              <button
                type="button"
                onClick={() => setItems((p) => [...p, newKirimItem()])}
                className="font-editorial text-xs tracking-[0.12em] uppercase text-skin-accent-text"
              >
                + Tambah produk
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
