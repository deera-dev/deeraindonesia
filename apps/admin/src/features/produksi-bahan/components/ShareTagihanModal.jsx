/**
 * ShareTagihanModal.jsx — Preview teks WA tagihan bahan + salin/buka WhatsApp.
 */
import { useState } from "react";
import { generateTagihanWA } from "../utils";

export default function ShareTagihanModal({ groups, onClose }) {
  const [copied, setCopied] = useState(false);
  const waText = generateTagihanWA(groups).replace(/\\n/g, "\n");

  const copy = () => {
    navigator.clipboard.writeText(waText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  const openWA = () => window.open("https://wa.me/?text=" + encodeURIComponent(waText), "_blank");

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative bg-skin-card w-full max-w-lg border-t-2 md:border-2 border-skin-bdr shadow-xl">
        <div className="flex items-center justify-between px-4 py-4 border-b border-skin-bdr">
          <h2 className="font-editorial text-sm tracking-[0.2em] uppercase text-skin-text2">Bagikan Tagihan</h2>
          <button onClick={onClose} className="text-skin-text3 hover:text-red-500 text-2xl leading-none transition">×</button>
        </div>
        <div className="p-4 space-y-3">
          <p className="font-editorial text-[10px] tracking-[0.15em] uppercase text-skin-text3">Preview teks WhatsApp</p>
          <pre className="bg-skin-raised border border-skin-bdr px-3 py-3 text-xs text-skin-text font-mono whitespace-pre-wrap leading-relaxed max-h-72 overflow-y-auto">
            {waText}
          </pre>
          <div className="flex gap-2">
            <button onClick={copy}
              className={`flex-1 py-3 font-editorial text-xs tracking-[0.15em] uppercase border-2 transition ${copied ? "border-emerald-500 text-emerald-500" : "border-skin-bdr text-skin-text2 hover:border-[#CAB170] hover:text-[#CAB170]"}`}>
              {copied ? "✓ Disalin!" : "Salin Teks"}
            </button>
            <button onClick={openWA}
              className="flex-1 py-3 font-editorial text-xs tracking-[0.15em] uppercase bg-[#25D366] hover:bg-[#1eb558] text-white transition">
              Buka di WA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
