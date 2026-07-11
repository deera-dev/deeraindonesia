/**
 * PettycashShareModal.jsx
 * Modal share laporan petty cash sebagai PNG dengan date range selector.
 */
import { useRef, useState } from "react";
import ScaleToFitPreview from "@deera/shared/components/ScaleToFitPreview";
import PettycashShareCard from "./PettycashShareCard";

function defaultRange() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
  return {
    from: `${yyyy}-${mm}-01`,
    to: `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

export default function PettycashShareModal({ rows, saldo, onClose }) {
  const def = defaultRange();
  const [fromDate, setFromDate] = useState(def.from);
  const [toDate, setToDate] = useState(def.to);
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  const filtered = rows.filter((r) => {
    if (!r.tanggal) return false;
    return r.tanggal >= fromDate && r.tanggal <= toDate;
  });

  async function downloadImage() {
    setGenerating(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `pettycash-${fromDate}-${toDate}.png`;
      a.click();
    } finally {
      setGenerating(false);
    }
  }

  async function shareImage() {
    setGenerating(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `pettycash-${fromDate}-${toDate}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "Laporan Petty Cash" });
      } else {
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = file.name;
        a.click();
      }
    } catch (err) {
      if (err?.name !== "AbortError") throw err;
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex md:items-center md:justify-center bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0 hidden md:block" onClick={onClose} />
      <div className="relative bg-skin-card w-full h-full md:h-auto md:max-w-sm md:max-h-[90vh] flex flex-col md:border-2 border-skin-bdr shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-skin-bdr-lt flex-shrink-0">
          <h3 className="font-headline text-lg text-skin-text">Share Petty Cash</h3>
          <button type="button" onClick={onClose} className="text-skin-text3 hover:text-skin-text text-xl leading-none w-8 h-8 flex items-center justify-center">
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Date range picker */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <label className="font-editorial text-[10px] uppercase tracking-[0.15em] text-skin-text3 shrink-0">Dari</label>
            <input
              type="date"
              value={fromDate}
              max={toDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="bg-skin-input border border-skin-bdr text-skin-text px-2 py-1.5 font-editorial text-xs outline-none focus:border-[#CAB170] transition flex-1 min-w-0"
            />
            <label className="font-editorial text-[10px] uppercase tracking-[0.15em] text-skin-text3 shrink-0">s/d</label>
            <input
              type="date"
              value={toDate}
              min={fromDate}
              onChange={(e) => setToDate(e.target.value)}
              className="bg-skin-input border border-skin-bdr text-skin-text px-2 py-1.5 font-editorial text-xs outline-none focus:border-[#CAB170] transition flex-1 min-w-0"
            />
          </div>

          <p className="font-editorial text-[10px] text-skin-text3 mb-4">
            {filtered.length} transaksi ditemukan
          </p>

          {/* Card preview */}
          <div className="mb-4">
            <ScaleToFitPreview contentWidth={320}>
              <PettycashShareCard
                ref={cardRef}
                rows={filtered}
                fromDate={fromDate}
                toDate={toDate}
                saldo={saldo}
              />
            </ScaleToFitPreview>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={generating}
              onClick={downloadImage}
              className="flex-1 py-2.5 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] transition disabled:opacity-50"
            >
              {generating ? "Memproses..." : "Unduh PNG"}
            </button>
            <button
              type="button"
              disabled={generating}
              onClick={shareImage}
              className="flex-1 py-2.5 text-xs font-editorial tracking-[0.1em] uppercase bg-[#CAB170] text-black hover:bg-[#A8925A] transition disabled:opacity-50"
            >
              Bagikan
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
