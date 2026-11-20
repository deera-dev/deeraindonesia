import { useProducts } from "@deera/shared/features/products/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { useState } from "react";
import { useAvailablePotongan, useCreateKirimCmtJahit } from "../hooks";

function newBlock() {
  return { kode_produk: "", nama_produk: "", cards: null, fetching: false };
}

export default function KirimForm({ onClose }) {
  const { products } = useProducts();
  const { fetchPotongan } = useAvailablePotongan();
  const { createKirim, creating } = useCreateKirimCmtJahit();

  const [namaVendor, setNamaVendor] = useState("");
  const [tanggalKirim, setTanggalKirim] = useState(() => new Date().toISOString().slice(0, 10));
  const [estimasiSelesai, setEstimasiSelesai] = useState("");
  const [hargaUpah, setHargaUpah] = useState("");
  const [catatan, setCatatan] = useState("");
  const [blocks, setBlocks] = useState([newBlock()]);

  const setBlock = (i, patch) =>
    setBlocks((p) => p.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));

  async function handleKodeChange(i, kode) {
    const produk = products?.find((p) => p.kode === kode);
    setBlock(i, { kode_produk: kode, nama_produk: produk?.nama ?? "", cards: null });
    if (!produk) return;
    setBlock(i, { fetching: true });
    try {
      const cards = await fetchPotongan(kode);
      setBlock(i, { cards, fetching: false });
    } catch (err) {
      toast.error("Gagal ambil buku potongan: " + err.message);
      setBlock(i, { cards: [], fetching: false });
    }
  }

  const allCards = blocks.flatMap((b) => b.cards ?? []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (allCards.length === 0) {
      toast.error("Pilih minimal 1 kode yang punya potongan tersedia.");
      return;
    }
    try {
      await createKirim({
        namaVendor,
        tanggalKirim,
        estimasiSelesai,
        hargaUpah,
        catatan,
        cards: allCards,
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

            <div className="space-y-2">
              <p className="text-xs text-skin-text3">Produk yang dikirim</p>
              <p className="text-[11px] text-skin-text4">
                Warna & qty otomatis ikut buku potongan — tidak perlu diketik ulang.
              </p>
              {blocks.map((b, i) => (
                <div key={i} className="bg-skin-raised p-2.5 space-y-2">
                  <input
                    type="text"
                    list={`kirim-kode-${i}`}
                    data-testid={`kirim-kode-${i}`}
                    value={b.kode_produk}
                    onChange={(e) => handleKodeChange(i, e.target.value)}
                    placeholder="— Pilih/cari kode —"
                    className="w-full border border-skin-bdr bg-skin-card px-3 py-2 text-sm text-skin-text"
                    autoComplete="off"
                  />
                  <datalist id={`kirim-kode-${i}`}>
                    {(products ?? []).map((p) => (
                      <option key={p.kode} value={p.kode} label={`${p.kode} — ${p.nama}`} />
                    ))}
                  </datalist>

                  {b.fetching && (
                    <p className="text-[11px] text-skin-text4">Memuat buku potongan...</p>
                  )}
                  {!b.fetching && b.cards != null && b.cards.length === 0 && (
                    <p className="text-[11px] text-amber-500">
                      Tidak ada potongan tersedia untuk kode ini.
                    </p>
                  )}
                  {!b.fetching && b.cards?.length > 0 && (
                    <div className="space-y-0.5 text-[11px] text-skin-text3">
                      {b.cards.map((c) => (
                        <p key={c.id}>
                          {c.size} · {c.warna === "_" ? "(tanpa warna)" : c.warna} — {c.qty} pcs
                        </p>
                      ))}
                    </div>
                  )}

                  {blocks.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setBlocks((p) => p.filter((_, idx) => idx !== i))}
                      className="text-xs font-editorial text-red-400"
                    >
                      − Hapus
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={() => setBlocks((p) => [...p, newBlock()])}
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
