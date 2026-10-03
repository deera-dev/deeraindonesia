/**
 * KirimSampelModal.jsx — catat satu kali kirim/bawa sampel ke toko (bisa
 * beberapa kode sekaligus dalam satu kunjungan). Semua item mulai dari
 * status "Menunggu" — diupdate dari TokoDetailModal setelah tim sales
 * kunjungan lagi dan tahu hasilnya.
 */
import { useMemo, useState } from "react";
import { useProducts } from "@deera/shared/features/products/hooks";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import SampelProductPicker from "./SampelProductPicker";
import { useCreateKirimanMutation } from "../hooks";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export default function KirimSampelModal({ toko, statusByKode, onClose, onCreated }) {
  const { products = [] } = useProducts();
  const { user } = useAuth();
  const createMutation = useCreateKirimanMutation(toko.id);

  const [tanggal, setTanggal] = useState(todayStr());
  const [catatan, setCatatan] = useState("");
  const [selectedKodes, setSelectedKodes] = useState(() => new Set());
  const [error, setError] = useState("");

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedKodes.has(p.kode)),
    [products, selectedKodes],
  );

  async function handleSubmit() {
    if (selectedKodes.size === 0) {
      setError("Pilih minimal satu produk yang mau dikirim.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        tokoId: toko.id,
        tanggal,
        catatan,
        items: selectedProducts.map((p) => ({ kode: p.kode, nama: p.nama })),
        user: { email: user?.email, name: user?.user_metadata?.name ?? user?.email },
      });
      toast.success(`${selectedKodes.size} sampel dicatat terkirim ke ${toko.nama}.`);
      onCreated?.();
    } catch (err) {
      setError(err.message ?? "Gagal menyimpan.");
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={createMutation.isPending ? undefined : onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text truncate">
            Kirim Sampel — {toko.nama}
          </h2>
          <button
            onClick={onClose}
            disabled={createMutation.isPending}
            className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex items-center justify-center disabled:opacity-40 flex-shrink-0"
          >
            ×
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 flex-shrink-0 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
              Tanggal
            </label>
            <input
              type="date"
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
            />
          </div>
          <div>
            <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
              Catatan (opsional)
            </label>
            <input
              type="text"
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Mis. dibawa Budi"
              className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <SampelProductPicker
            products={products}
            statusByKode={statusByKode}
            selectedKodes={selectedKodes}
            onChange={setSelectedKodes}
          />
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 space-y-2">
          {error && <p className="text-xs text-red-500 font-editorial">{error}</p>}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={createMutation.isPending}
            className="w-full py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition disabled:opacity-40"
          >
            {createMutation.isPending ? "Menyimpan..." : `Catat Kirim (${selectedKodes.size} produk)`}
          </button>
        </div>
      </div>
    </div>
  );
}
