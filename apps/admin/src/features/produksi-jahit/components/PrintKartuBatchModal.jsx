import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { qrDataUrl } from "../render";
import { jahitCardScanUrl } from "../utils";
import KartuJahitContent, { CARD_H_MM, CARD_W_MM } from "./KartuJahitContent";

const MM_TO_PX = 96 / 25.4;
const NATURAL_W_PX = Math.round(CARD_W_MM * MM_TO_PX);
const NATURAL_H_PX = Math.round(CARD_H_MM * MM_TO_PX);

export default function PrintKartuBatchModal({ cards, onClose }) {
  const [qrMap, setQrMap] = useState({});
  const outerRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (!cards?.length) {
      setQrMap({});
      return undefined;
    }
    let cancelled = false;
    Promise.all(
      cards.map((c) => qrDataUrl(jahitCardScanUrl(c.id), 400).then((url) => [c.id, url])),
    ).then((pairs) => {
      if (!cancelled) setQrMap(Object.fromEntries(pairs));
    });
    return () => {
      cancelled = true;
    };
  }, [cards]);

  useEffect(() => {
    const outer = outerRef.current;
    if (!outer) return;
    const update = () => {
      const w = outer.clientWidth;
      if (w > 0) setScale(Math.max(1, (w - 32) / NATURAL_W_PX));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(outer);
    return () => ro.disconnect();
  }, []);

  if (!cards?.length) return null;

  return createPortal(
    <>
      <style>{`
        @media print {
          html, body { height: auto !important; overflow: visible !important; }
          body > * { display: none !important; }
          #kartu-jahit-batch-overlay {
            display: block !important;
            position: static !important;
            inset: auto !important;
            background: none !important;
            backdrop-filter: none !important;
          }
          #kartu-jahit-batch-overlay > * { display: block !important; }
          #kartu-jahit-batch-actions, #kartu-jahit-batch-header, #kartu-jahit-batch-hint, #kartu-jahit-batch-backdrop { display: none !important; }
          #kartu-jahit-batch-preview-outer {
            display: block !important;
            padding: 0 !important;
            gap: 0 !important;
            overflow: visible !important;
          }
          .kartu-jahit-batch-item {
            width: ${CARD_W_MM}mm !important;
            height: ${CARD_H_MM}mm !important;
          }
          .kartu-jahit-batch-preview {
            transform: none !important;
            width: ${CARD_W_MM}mm !important;
          }
          #kartu-jahit-batch-wrapper {
            height: auto !important;
            max-height: none !important;
            position: static !important;
            overflow: visible !important;
            border: none !important;
            box-shadow: none !important;
            width: ${CARD_W_MM}mm !important;
          }
          .kartu-jahit-batch-item + .kartu-jahit-batch-item {
            break-before: page;
            page-break-before: always;
          }
          @page {
            size: ${CARD_W_MM}mm ${CARD_H_MM}mm;
            margin: 0;
          }
        }
      `}</style>

      <div
        id="kartu-jahit-batch-overlay"
        className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        <div id="kartu-jahit-batch-backdrop" className="absolute inset-0" onClick={onClose} />
        <div
          id="kartu-jahit-batch-wrapper"
          className="relative bg-skin-card w-full max-w-sm h-[100dvh] md:h-auto md:max-h-[90dvh] md:border-2 border-skin-bdr shadow-2xl overflow-hidden flex flex-col"
        >
          <div
            id="kartu-jahit-batch-header"
            className="flex-shrink-0 bg-skin-header px-4 py-3 flex items-center justify-between"
          >
            <div className="min-w-0">
              <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
                Cetak {cards.length} Kartu
              </span>
              <span className="ml-2 text-xs text-skin-accent-text font-mono">{cards[0]?.kode_produk}</span>
            </div>
            <button onClick={onClose} className="text-white/60 hover:text-white transition text-xl leading-none">
              ✕
            </button>
          </div>

          <div
            ref={outerRef}
            id="kartu-jahit-batch-preview-outer"
            className="overflow-y-auto overflow-x-hidden flex-1 bg-skin-raised flex flex-col items-center py-8 gap-6"
          >
            {cards.map((card) => (
              <div
                key={card.id}
                className="kartu-jahit-batch-item"
                style={{ width: NATURAL_W_PX, height: NATURAL_H_PX * scale }}
              >
                <div
                  className="kartu-jahit-batch-preview"
                  style={{ width: NATURAL_W_PX, transform: `scale(${scale})`, transformOrigin: "top center" }}
                >
                  <KartuJahitContent card={card} qrDataUrl={qrMap[card.id]} />
                </div>
              </div>
            ))}
          </div>

          <p id="kartu-jahit-batch-hint" className="flex-shrink-0 text-center text-[11px] text-skin-text3 px-4 py-2">
            {cards.length} kartu akan dicetak sekaligus, masing-masing 1 halaman. Printer: Epson L1250, kertas
            custom {CARD_W_MM}×{CARD_H_MM} mm, skala 100% (bukan &ldquo;Fit to page&rdquo;).
          </p>

          <div id="kartu-jahit-batch-actions" className="flex-shrink-0 border-t-2 border-skin-bdr flex">
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
              Print {cards.length} Kartu
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
