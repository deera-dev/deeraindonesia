/**
 * BlastCreateModal.jsx — Wizard 3 langkah buat campaign Blast baru:
 *   1. Pilih produk (BlastProductPicker)
 *   2. Pilih target — pelanggan existing dan/atau calon customer
 *      (BlastTargetPicker)
 *   3. Review & edit pesan (prefill dari buildDefaultMessage — reuse format
 *      generateWABulkText yang sama dgn "Share Banyak") + nama campaign
 *
 * Submit → useCreateCampaignMutation (bikin blast_campaign + seluruh baris
 * blast_target sekaligus). Setelah sukses, onCreated(campaign) dipanggil —
 * BlastPage langsung membuka BlastCampaignDetail campaign baru itu supaya
 * admin bisa langsung mulai kirim.
 */
import { useMemo, useState } from "react";
import { useProducts } from "@deera/shared/features/products/hooks";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import BlastProductPicker from "./BlastProductPicker";
import BlastTargetPicker from "./BlastTargetPicker";
import { useCreateCampaignMutation } from "../hooks";
import { buildDefaultMessage } from "../utils";

const STEPS = ["produk", "target", "pesan"];

export default function BlastCreateModal({ onClose, onCreated }) {
  const { products = [] } = useProducts();
  const { user } = useAuth();
  const createMutation = useCreateCampaignMutation();

  const [step, setStep] = useState(0);
  const [selectedKodes, setSelectedKodes] = useState(() => new Set());
  const [selectedTargets, setSelectedTargets] = useState(() => new Map());
  const [nama, setNama] = useState("");
  const [message, setMessage] = useState("");
  const [messageTouched, setMessageTouched] = useState(false);
  const [error, setError] = useState("");

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedKodes.has(p.kode)),
    [products, selectedKodes],
  );

  function goToStep(next) {
    if (next === 2 && !messageTouched) {
      setMessage(buildDefaultMessage(selectedProducts));
    }
    setError("");
    setStep(next);
  }

  function toggleTarget(t) {
    setSelectedTargets((prev) => {
      const next = new Map(prev);
      if (next.has(t.key)) next.delete(t.key);
      else next.set(t.key, t);
      return next;
    });
  }

  function selectManyTargets(list) {
    setSelectedTargets((prev) => {
      const next = new Map(prev);
      list.forEach((t) => next.set(t.key, t));
      return next;
    });
  }

  async function handleSubmit() {
    if (!nama.trim()) {
      setError("Nama blast wajib diisi.");
      return;
    }
    if (selectedTargets.size === 0) {
      setError("Pilih minimal satu target.");
      return;
    }
    try {
      const campaign = await createMutation.mutateAsync({
        nama,
        productKodes: [...selectedKodes],
        message,
        targets: [...selectedTargets.values()],
        user: { email: user?.email, name: user?.user_metadata?.name ?? user?.email },
      });
      toast.success(`Blast "${nama}" dibuat dengan ${selectedTargets.size} target.`);
      onCreated?.(campaign);
    } catch (err) {
      setError(err.message ?? "Gagal membuat blast.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={createMutation.isPending ? undefined : onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[100dvh] md:h-auto md:max-h-[90dvh] flex flex-col border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr-lt flex-shrink-0">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text">
            Buat Blast Baru — {step + 1}/3
          </h2>
          <button
            onClick={onClose}
            disabled={createMutation.isPending}
            className="text-skin-text3 hover:text-skin-text text-2xl w-8 h-8 flex items-center justify-center disabled:opacity-40"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {step === 0 && (
            <BlastProductPicker
              products={products}
              selectedKodes={selectedKodes}
              onChange={setSelectedKodes}
            />
          )}
          {step === 1 && (
            <BlastTargetPicker
              selected={selectedTargets}
              onToggle={toggleTarget}
              onSelectMany={selectManyTargets}
            />
          )}
          {step === 2 && (
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
                  Nama Blast *
                </label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Mis. Promo Gamis Lebaran 2026"
                  className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
                />
              </div>
              <div>
                <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
                  Pesan (dikirim sama persis ke semua target — edit bebas)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => {
                    setMessage(e.target.value);
                    setMessageTouched(true);
                  }}
                  rows={10}
                  className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition font-mono"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 border-t border-skin-bdr p-4 space-y-2">
          {error && <p className="text-xs text-red-500 font-editorial">{error}</p>}
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => goToStep(step - 1)}
                disabled={createMutation.isPending}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition disabled:opacity-40"
              >
                Kembali
              </button>
            )}
            {step < 2 && (
              <button
                type="button"
                onClick={() => {
                  if (step === 0 && selectedKodes.size === 0) {
                    setError("Pilih minimal satu produk.");
                    return;
                  }
                  if (step === 1 && selectedTargets.size === 0) {
                    setError("Pilih minimal satu target.");
                    return;
                  }
                  goToStep(step + 1);
                }}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
              >
                Lanjut
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#25D366] hover:bg-[#20bb5a] transition disabled:opacity-40"
              >
                {createMutation.isPending ? "Membuat..." : `Buat Blast (${selectedTargets.size} target)`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
