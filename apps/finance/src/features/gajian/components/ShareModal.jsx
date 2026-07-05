import { useRef, useState } from "react";
import { usePerKaryawanRincian } from "../hooks";
import { generateWAText } from "../utils";
import GajianShareCard from "./GajianShareCard";

/**
 * ShareModal.jsx — Modal bagikan ringkasan gajian: tab teks WA (copy/buka WA)
 * dan tab gambar (capture GajianShareCard ke PNG via html-to-image).
 */
export default function ShareModal({ gajian, totals, gajianId, tambahan, pettycash, kasbonDeds, totalRequest, onClose }) {
  const { perKaryawan } = usePerKaryawanRincian(gajianId, { includeQC: true });
  const cardRef = useRef(null);
  const [tab, setTab] = useState("teks"); // "teks" | "gambar"
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const waText = generateWAText({ gajian, totals, perKaryawan, tambahan, pettycash, kasbonDeds, totalRequest });
  const waTextReal = waText.replace(/\\n/g, "\n");

  async function copyText() {
    await navigator.clipboard.writeText(waTextReal);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function shareViaWA() {
    window.open(`https://wa.me/?text=${encodeURIComponent(waTextReal)}`, "_blank");
  }

  async function downloadImage() {
    setGenerating(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: "#18120a" });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `gajian-deera-${gajian.tanggal_sabtu}.png`;
      a.click();
    } finally {
      setGenerating(false);
    }
  }

  async function shareImage() {
    setGenerating(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, backgroundColor: "#18120a" });
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `gajian-deera-${gajian.tanggal_sabtu}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file] });
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
    <div className="fixed inset-0 z-50 flex md:items-center md:justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0 hidden md:block" onClick={onClose} />
      <div className="relative bg-skin-card w-full h-full md:h-auto md:max-w-lg md:max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-skin-bdr-lt">
          <h3 className="font-headline text-lg text-skin-text">Bagikan Ringkasan</h3>
          <button type="button" onClick={onClose} className="text-skin-text3 hover:text-skin-text text-xl leading-none">×</button>
        </div>

        <div className="flex gap-2 px-4 py-3 border-b border-skin-bdr-lt">
          <button
            type="button"
            onClick={() => setTab("teks")}
            className={`px-3 py-1.5 text-xs font-editorial rounded-full border transition ${tab === "teks" ? "border-[#CAB170] text-[#CAB170] bg-skin-gold" : "border-skin-bdr text-skin-text3"}`}
          >
            📝 Teks WA
          </button>
          <button
            type="button"
            onClick={() => setTab("gambar")}
            className={`px-3 py-1.5 text-xs font-editorial rounded-full border transition ${tab === "gambar" ? "border-[#CAB170] text-[#CAB170] bg-skin-gold" : "border-skin-bdr text-skin-text3"}`}
          >
            🖼 Gambar
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {tab === "teks" ? (
            <>
              <pre className="whitespace-pre-wrap font-mono text-xs bg-skin-raised p-3 text-skin-text">{waTextReal}</pre>
              <div className="flex gap-2 mt-3">
                <button type="button" onClick={copyText} className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] transition">
                  {copied ? "✓ Tersalin" : "Salin Teks"}
                </button>
                <button type="button" onClick={shareViaWA} className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase bg-[#CAB170] text-black hover:bg-[#A8925A] transition">
                  Buka di WA
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="overflow-x-auto flex justify-center">
                <GajianShareCard
                  ref={cardRef}
                  gajian={gajian}
                  totals={totals}
                  perKaryawan={perKaryawan}
                  tambahan={tambahan}
                  pettycash={pettycash}
                  kasbonDeds={kasbonDeds}
                  totalRequest={totalRequest}
                />
              </div>
              <div className="flex gap-2 mt-3">
                <button type="button" disabled={generating} onClick={downloadImage} className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase border border-skin-bdr text-skin-text3 hover:border-[#CAB170] transition disabled:opacity-50">
                  {generating ? "Memproses..." : "Unduh PNG"}
                </button>
                <button type="button" disabled={generating} onClick={shareImage} className="flex-1 py-2 text-xs font-editorial tracking-[0.1em] uppercase bg-[#CAB170] text-black hover:bg-[#A8925A] transition disabled:opacity-50">
                  Bagikan Gambar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
