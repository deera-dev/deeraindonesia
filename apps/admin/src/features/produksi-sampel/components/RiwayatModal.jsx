import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useTogglePinned } from "../hooks";
import Timeline from "./Timeline";

export default function RiwayatModal({ sampel, onClose }) {
  const togglePinned = useTogglePinned();
  const [pinning, setPinning] = useState(false);

  async function handleTogglePin() {
    setPinning(true);
    try {
      await togglePinned(sampel.id, !sampel.pinned);
      toast.success(sampel.pinned ? "Pin dilepas" : "Ditandai penting ✓");
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setPinning(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg h-[92dvh] flex flex-col border-2 border-skin-bdr shadow-xl">
        <div className="shrink-0 flex items-start justify-between gap-2 px-4 py-4 border-b border-skin-bdr-lt">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-skin-text truncate">{sampel.nama}</p>
            <p className="text-[10px] text-skin-text3">{sampel.nomor}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleTogglePin}
              disabled={pinning}
              title={sampel.pinned ? "Lepas pin" : "Tandai penting"}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold border transition disabled:opacity-40 ${
                sampel.pinned
                  ? "border-skin-accent text-skin-accent-text bg-skin-gold"
                  : "border-skin-bdr text-skin-text3 hover:text-skin-accent-text hover:border-skin-accent/50"
              }`}
            >
              📌 <span>{sampel.pinned ? "Lepas Pin" : "Tandai Penting"}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-skin-text3 hover:text-skin-text text-xl leading-none px-1 transition"
            >
              ×
            </button>
          </div>
        </div>

        <div className="shrink-0 px-4 py-2 border-b border-skin-bdr-lt">
          <p className="text-xs font-editorial tracking-[0.12em] uppercase text-skin-text3">Riwayat</p>
        </div>

        <div className="flex-1 overflow-hidden">
          <Timeline sampel={sampel} />
        </div>
      </div>
    </div>
  );
}
