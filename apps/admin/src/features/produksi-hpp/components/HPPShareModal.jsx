/**
 * HPPShareModal.jsx
 * Modal share HPP detail sebagai PNG via html-to-image.
 */
import { useRef, useState } from "react";
import HPPShareCard from "./HPPShareCard";

export default function HPPShareModal({ tpl, produk, onClose }) {
  const cardRef = useRef(null);
  const [generating, setGenerating] = useState(false);

  async function downloadImage() {
    setGenerating(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3 });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `hpp-${tpl.kode_produk}.png`;
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
      const file = new File([blob], `hpp-${tpl.kode_produk}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `HPP ${tpl.kode_produk}` });
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
          <h3 className="font-headline text-lg text-skin-text">Share HPP — {tpl.kode_produk}</h3>
          <button type="button" onClick={onClose} className="text-skin-text3 hover:text-skin-text text-xl leading-none w-8 h-8 flex items-center justify-center">
            ×
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex justify-center mb-4">
            <HPPShareCard ref={cardRef} tpl={tpl} produk={produk} />
          </div>
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
              Bagikan Gambar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
