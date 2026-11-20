import { useProducts } from "@deera/shared/features/products/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { SIZE_PRESETS } from "@deera/shared/lib/constants";
import { useState } from "react";
import { useCreateSetoranFull } from "../hooks";
import { calcTotalUpahSetoranFull, newSetoranFullItem } from "../utils";

export default function SetoranFullForm({ onClose }) {
  const { products } = useProducts();
  const { createSetoranFull, creating } = useCreateSetoranFull();

  const [namaVendor, setNamaVendor] = useState("");
  const [kodeProduk, setKodeProduk] = useState("");
  const [tanggalSetor, setTanggalSetor] = useState(() => new Date().toISOString().slice(0, 10));
  const [hargaUpah, setHargaUpah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [items, setItems] = useState([newSetoranFullItem()]);

  const produk = products?.find((p) => p.kode === kodeProduk);
  const sizeOpts = (produk?.variants ?? []).map((v) => v.size).filter(Boolean);
  const warnaOpts = produk?.warna ?? [];
  const totalUpah = calcTotalUpahSetoranFull(items, hargaUpah);

  const setItem = (i, k, v) =>
    setItems((p) => p.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)));

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await createSetoranFull({
        namaVendor,
        kodeProduk,
        namaProduk: produk?.nama ?? "",
        tanggalSetor,
        hargaUpah,
        items,
        catatan,
      });
      toast.success("Setoran CMT Full dicatat — stok Gudang bertambah.");
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
            <h2 className="font-headline text-skin-accent-text text-lg">Terima Setoran CMT Full</h2>
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
            <div className="space-y-1">
              <label className="text-xs text-skin-text3">Kode Produk *</label>
              <input
                type="text"
                list="setoran-full-kode"
                required
                value={kodeProduk}
                onChange={(e) => setKodeProduk(e.target.value)}
                placeholder="— Pilih/cari kode —"
                className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
                autoComplete="off"
              />
              <datalist id="setoran-full-kode">
                {(products ?? []).map((p) => (
                  <option key={p.kode} value={p.kode} label={`${p.kode} — ${p.nama}`} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-xs text-skin-text3">Tgl Setor *</label>
                <input
                  type="date"
                  required
                  value={tanggalSetor}
                  onChange={(e) => setTanggalSetor(e.target.value)}
                  className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-skin-text3">
                  Upah/pcs (opsional — bisa diisi nanti)
                </label>
                <input
                  type="number"
                  min="0"
                  value={hargaUpah}
                  onChange={(e) => setHargaUpah(e.target.value)}
                  placeholder="Belum sepakat harga? Kosongkan dulu"
                  className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-skin-text3">Breakdown size/warna</p>
              {items.map((it, i) => (
                <div key={i} className="grid grid-cols-3 gap-2 bg-skin-raised p-2.5">
                  <select
                    value={it.size}
                    onChange={(e) => setItem(i, "size", e.target.value)}
                    className="border border-skin-bdr bg-skin-card px-2 py-2 text-sm text-skin-text"
                  >
                    <option value="">Ukuran</option>
                    {(sizeOpts.length ? sizeOpts : SIZE_PRESETS.map((s) => s.size)).map((s) => (
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
              ))}
              <button
                type="button"
                onClick={() => setItems((p) => [...p, newSetoranFullItem()])}
                className="font-editorial text-xs tracking-[0.12em] uppercase text-skin-accent-text"
              >
                + Tambah baris
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

            {totalUpah > 0 && (
              <p className="text-sm font-semibold text-skin-text text-right border-t border-skin-bdr-lt pt-3">
                Total Upah:{" "}
                <span className="text-skin-accent-text">{totalUpah.toLocaleString("id-ID")}</span>
              </p>
            )}
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
              {creating ? "Menyimpan..." : "Simpan & Tambah Stok"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
