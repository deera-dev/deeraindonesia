import { useState } from "react";
import { toast } from "@deera/shared/features/toast/hooks";
import { useFinalizeGajian, useRingkasanValues } from "../hooks";
import { buildKasbonDeductionsPayload, cleanTambahan } from "../utils";
import PerKaryawan from "./PerKaryawan";
import RingkasanTotals from "./RingkasanTotals";
import ShareModal from "./ShareModal";

export default function TabRingkasan({ gajianId, gajian, compact = false }) {
  const v = useRingkasanValues(gajianId, gajian);
  const finalizeGajian = useFinalizeGajian();
  const [finalizing, setFinalizing] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const { isFinal, totals, kasbon, kasbonDeds, fullTambahan, pettycash, totalRequest, shareKasbonDeds, clearDraft } = v;

  async function handleFinalize() {
    if (!confirm("Finalisasi gajian periode ini? Setelah final, data tidak bisa diubah lagi.")) return;
    setFinalizing(true);
    try {
      await finalizeGajian(gajian, {
        totals,
        pettycash: Number(pettycash) || 0,
        tambahan: cleanTambahan(fullTambahan),
        kasbon,
        kasbonDeductions: buildKasbonDeductionsPayload(kasbon, kasbonDeds),
        totalRequest,
      });
      clearDraft();
      toast.success("Gajian difinalisasi.");
    } catch (err) {
      toast.error("Gagal: " + err.message);
    } finally {
      setFinalizing(false);
    }
  }

  if (compact) return <RingkasanTotals gajian={gajian} v={v} />;

  return (
    <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)] items-start">
      <div className="space-y-4 xl:sticky xl:top-20">
        <RingkasanTotals gajian={gajian} v={v} />
        <div className="flex gap-2">
          {isFinal ? (
            <span className="flex-1 text-center py-2.5 text-xs font-editorial tracking-[0.12em] uppercase border border-emerald-500 text-emerald-500">
              ✓ Final
            </span>
          ) : (
            <button
              type="button"
              onClick={handleFinalize}
              disabled={finalizing}
              className="flex-1 py-2.5 text-xs font-editorial tracking-[0.12em] uppercase bg-skin-accent text-black hover:bg-skin-accent-hover transition disabled:opacity-50"
            >
              {finalizing ? "Memproses..." : "Finalisasi Gajian"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="flex-1 py-2.5 text-xs font-editorial tracking-[0.12em] uppercase border border-skin-bdr text-skin-text3 hover:border-skin-accent transition"
          >
            📤 Bagikan Ringkasan
          </button>
        </div>
      </div>

      <PerKaryawan gajianId={gajianId} kasbonDeds={shareKasbonDeds} />

      {showShare && (
        <ShareModal
          gajian={gajian}
          totals={totals}
          gajianId={gajianId}
          tambahan={fullTambahan}
          pettycash={pettycash}
          kasbonDeds={shareKasbonDeds}
          totalRequest={totalRequest}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  );
}
