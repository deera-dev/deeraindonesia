/**
 * BlastCreateForm.jsx — konten "Buat Blast Baru" (dipakai di dalam
 * BlastEntryModal, TIDAK merender overlay sendiri — overlay+header+close
 * disediakan parent supaya seluruh fitur Blast tetap SATU modal, bukan
 * tab/halaman terpisah — permintaan Denny 2026-10).
 *
 * Redesign dari versi sebelumnya (permintaan Denny 2026-10, "casenya kan
 * ga mungkin dong orang belum kenal pesan pertamanya adalah ngeliatin
 * produknya"):
 *   - Produk BUKAN lagi langkah wajib pertama — sekarang jadi lampiran
 *     OPSIONAL yang bisa dibuka lewat "+ Lampirkan Produk" di step pesan.
 *   - Pesan dimulai dari TEMPLATE (BlastTemplatePicker, bisa
 *     tambah/edit/hapus sendiri) alih-alih auto-generate dari produk yang
 *     dipilih — cocok utk pesan perkenalan ke calon customer yang belum
 *     kenal brand sama sekali.
 *
 * 2 step: (1) Pesan — pilih/tulis pesan + opsional lampirkan produk,
 * (2) Target — pelanggan existing dan/atau calon customer.
 */
import { useMemo, useState } from "react";
import { useProducts } from "@deera/shared/features/products/hooks";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import BlastTemplatePicker from "./BlastTemplatePicker";
import BlastProductPicker from "./BlastProductPicker";
import BlastTargetPicker from "./BlastTargetPicker";
import { useCreateCampaignMutation } from "../hooks";
import { composeBlastMessage } from "../utils";

export default function BlastCreateForm({ onClose, onCreated }) {
  const { products = [] } = useProducts();
  const { user } = useAuth();
  const createMutation = useCreateCampaignMutation();

  const [step, setStep] = useState(0); // 0 = pesan, 1 = target
  const [nama, setNama] = useState("");
  const [message, setMessage] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);
  const [selectedKodes, setSelectedKodes] = useState(() => new Set());
  const [selectedTargets, setSelectedTargets] = useState(() => new Map());
  const [error, setError] = useState("");

  const selectedProducts = useMemo(
    () => products.filter((p) => selectedKodes.has(p.kode)),
    [products, selectedKodes],
  );

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

  function goToTarget() {
    if (!nama.trim()) {
      setError("Nama blast wajib diisi.");
      return;
    }
    if (!message.trim()) {
      setError("Pesan wajib diisi — pilih template atau tulis sendiri.");
      return;
    }
    setError("");
    setStep(1);
  }

  async function handleSubmit() {
    if (selectedTargets.size === 0) {
      setError("Pilih minimal satu target.");
      return;
    }
    try {
      const finalMessage = composeBlastMessage(message);
      const campaign = await createMutation.mutateAsync({
        nama,
        productKodes: [...selectedKodes],
        message: finalMessage,
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
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-hidden flex flex-col">
        {step === 0 && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
                Nama Blast *
              </label>
              <input
                type="text"
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                placeholder="Mis. Perkenalan Toko ke Prospek Baru"
                className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition"
              />
            </div>

            <BlastTemplatePicker onPick={(pesan) => setMessage(pesan)} />

            <div>
              <label className="block text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3 mb-1">
                Pesan (bisa diedit bebas setelah pilih template)
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                placeholder="Pilih template di atas, atau tulis pesan sendiri di sini..."
                className="w-full bg-skin-page border border-skin-bdr px-3 py-2.5 text-sm text-skin-text focus:outline-none focus:border-[#CAB170] transition font-mono"
              />
              <p className="mt-1 text-[11px] text-skin-text4">
                Tulis <code className="text-skin-text3">{"{{nama}}"}</code> di pesan utk otomatis
                diganti nama tiap target saat dikirim (mis. template "Konfirmasi Nomor WA").
              </p>
            </div>

            <div className="border border-skin-bdr-lt">
              <button
                type="button"
                onClick={() => setShowProductPicker((v) => !v)}
                className="w-full flex items-center justify-between px-3 py-2.5 text-left"
              >
                <span className="text-xs font-editorial tracking-[0.08em] uppercase text-skin-text3">
                  + Lampirkan Produk (opsional){selectedKodes.size > 0 ? ` — ${selectedKodes.size} dipilih` : ""}
                </span>
                <span className="text-skin-text3 text-xs">{showProductPicker ? "▲" : "▼"}</span>
              </button>
              {showProductPicker && (
                <div className="h-64 border-t border-skin-bdr-lt">
                  <BlastProductPicker
                    products={products}
                    selectedKodes={selectedKodes}
                    onChange={setSelectedKodes}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {step === 1 && (
          <BlastTargetPicker
            selected={selectedTargets}
            onToggle={toggleTarget}
            onSelectMany={selectManyTargets}
          />
        )}
      </div>

      <div className="flex-shrink-0 border-t border-skin-bdr p-4 space-y-2">
        {error && <p className="text-xs text-red-500 font-editorial">{error}</p>}
        <div className="flex gap-2">
          {step === 1 && (
            <button
              type="button"
              onClick={() => setStep(0)}
              disabled={createMutation.isPending}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase border-2 border-skin-bdr text-skin-text2 transition disabled:opacity-40"
            >
              Kembali
            </button>
          )}
          {step === 0 && (
            <button
              type="button"
              onClick={goToTarget}
              className="flex-1 py-3 font-editorial text-sm tracking-[0.2em] uppercase text-white bg-[#CAB170] hover:bg-[#A8925A] transition"
            >
              Lanjut Pilih Target
            </button>
          )}
          {step === 1 && (
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
  );
}
