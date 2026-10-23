import { useMemo } from "react";
import { qrDataUrl } from "../render";
import KartuJahitContent, { CARD_H_MM, CARD_W_MM } from "./KartuJahitContent";

export default function PrintKartuModal({ card, onClose }) {
  const qr = useMemo(() => (card ? qrDataUrl(card.id) : null), [card]);

  if (!card) return null;

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #kartu-jahit-overlay { display: block !important; }
          #kartu-jahit-overlay > * { display: block !important; }
          #kartu-jahit-actions, #kartu-jahit-header, #kartu-jahit-hint { display: none !important; }
          #kartu-jahit-preview-outer { display: block !important; }
          #kartu-jahit-preview {
            transform: none !important;
            zoom: 1 !important;
          }
          #kartu-jahit-wrapper {
            height: auto !important;
            max-height: none !important;
            position: static !important;
            border: none !important;
            box-shadow: none !important;
            width: ${CARD_W_MM}mm !important;
          }
          @page {
            size: ${CARD_W_MM}mm ${CARD_H_MM}mm;
            margin: 0;
          }
        }
      `}</style>

      <div
        id="kartu-jahit-overlay"
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div className="absolute inset-0" onClick={onClose} />
        <div
          id="kartu-jahit-wrapper"
          className="relative bg-skin-card w-full max-w-sm h-[100dvh] md:h-auto md:max-h-[90dvh] md:border-2 border-skin-bdr shadow-2xl overflow-hidden flex flex-col"
        >
          <div id="kartu-jahit-header" className="flex-shrink-0 bg-skin-header px-4 py-3 flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">Cetak Kartu Jahit</span>
              <span className="ml-2 text-xs text-skin-accent-text font-mono">{card.kode_produk}</span>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition text-xl leading-none">
              ✕
            </button>
          </div>

          <div id="kartu-jahit-preview-outer" className="overflow-y-auto flex-1 bg-skin-raised flex items-center justify-center py-8">
            <div id="kartu-jahit-preview" style={{ zoom: 2.6 }}>
              <KartuJahitContent card={card} qrDataUrl={qr} />
            </div>
          </div>

          <p id="kartu-jahit-hint" className="flex-shrink-0 text-center text-[11px] text-skin-text3 px-4 py-2">
            Nama penjahit sengaja dikosongkan — isi tangan saat kartu diserahkan. Printer: Epson L1250, kertas
            custom {CARD_W_MM}×{CARD_H_MM} mm, skala 100% (bukan &ldquo;Fit to page&rdquo;).
          </p>

          <div id="kartu-jahit-actions" className="flex-shrink-0 border-t-2 border-skin-bdr flex">
            <button
              onClick={onClose}
              className="py-4 px-5 text-sm tracking-[0.1em] uppercase font-semibold text-skin-text3 hover:text-skin-text transition border-r border-skin-bdr"
            >
              Tutup
            </button>
            <button
              onClick={() => window.print()}
              className="flex-1 py-4 text-sm tracking-[0.1em] uppercase font-semibold text-skin-accent-text hover:bg-skin-accent/10 transition"
            >
              Print Kartu
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
