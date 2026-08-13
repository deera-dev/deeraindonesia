/**
 * Struk.jsx — Modal struk transaksi (print, simpan PNG, share WA, print BLE thermal).
 *
 * Props:
 *   sale    — objek transaksi
 *   onClose — () => void
 *
 * Konten visual struk → StrukContent.jsx
 *
 * SETUP LOGO:
 * Salin ke apps/pos/public/logo-deera.png (hitam/gelap, latar putih/transparent, ≈ 400×120 px)
 */
import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { useTsplPrinter, LABEL_TYPES, PAPER_WIDTHS } from "../hooks/useTsplPrinter";
import StrukContent from "./StrukContent";
import TsplPrintPreview from "./TsplPrintPreview";

const LS_LABEL_TYPE = "deera-label-type";
const LS_PAPER_WIDTH = "deera-paper-width";
// Default lebar kertas 78mm (keputusan Denny 2026-08 — dulu 100mm).
const DEFAULT_PAPER_WIDTH = "78";

function getSavedLabelType() {
  try {
    return localStorage.getItem(LS_LABEL_TYPE) || "continuous";
  } catch {
    return "continuous";
  }
}
function saveLabelType(v) {
  try {
    localStorage.setItem(LS_LABEL_TYPE, v);
  } catch {
    /* ignore */
  }
}

function getSavedPaperWidth() {
  try {
    return localStorage.getItem(LS_PAPER_WIDTH) || DEFAULT_PAPER_WIDTH;
  } catch {
    return DEFAULT_PAPER_WIDTH;
  }
}
function savePaperWidth(v) {
  try {
    localStorage.setItem(LS_PAPER_WIDTH, v);
  } catch {
    /* ignore */
  }
}

export default function Struk({ sale, onClose }) {
  const contentRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [btMsg, setBtMsg] = useState("");
  const [labelType, setLabelType] = useState(getSavedLabelType);
  const [paperWidth, setPaperWidth] = useState(getSavedPaperWidth);
  // Tab "Versi A" (default, value "styled") = tampilan struk biasa (ada
  // logo, dipakai jg utk Simpan/Share via toPng). Tab "Versi B" (value
  // "print") = replika visual APA YANG BENAR-BENAR DICETAK printer thermal
  // (TSPL: cuma TEXT/BAR, TANPA logo/gambar).
  const [contentTab, setContentTab] = useState("styled");

  const { printBle, busy: btBusy, error: btError, clearError } = useTsplPrinter();

  if (!sale) return null;
  const isRetur = sale.type === "retur";

  async function captureImage() {
    if (!contentRef.current) return null;
    return toPng(contentRef.current, { quality: 1, pixelRatio: 3, backgroundColor: "#ffffff" });
  }

  async function handleDownload() {
    setBusy(true);
    try {
      const dataUrl = await captureImage();
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `struk-deera-${sale.date ?? "today"}.png`;
      a.click();
    } catch (err) {
      alert("Gagal export: " + err.message);
    }
    setBusy(false);
  }

  async function handleShare() {
    setBusy(true);
    try {
      const dataUrl = await captureImage();
      const blob = await fetch(dataUrl).then((r) => r.blob());
      const fname = `struk-deera-${sale.date ?? "today"}.png`;
      const file = new File([blob], fname, { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Struk Deera Indonesia" });
        return;
      }
      // Fallback: download + buka WA Web
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = fname;
      a.click();
      setTimeout(() => window.open("https://web.whatsapp.com", "_blank"), 400);
    } catch (err) {
      if (err.name !== "AbortError") alert("Gagal share: " + err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleBtPrint() {
    clearError();
    setBtMsg("");
    const ok = await printBle(sale, labelType, paperWidth);
    if (ok) setBtMsg("✓ Terkirim ke printer");
  }

  function handleLabelTypeChange(v) {
    setLabelType(v);
    saveLabelType(v);
  }

  function handlePaperWidthChange(v) {
    setPaperWidth(v);
    savePaperWidth(v);
  }

  return (
    <>
      <style>{`
        @media print {
          body > * { display: none !important; }
          #struk-overlay { display: block !important; }
          #struk-overlay > * { display: block !important; }
          #struk-actions { display: none !important; }
          #struk-wrapper {
            position: static !important;
            border: none !important;
            box-shadow: none !important;
            width: ${paperWidth}mm !important;
            max-width: ${paperWidth}mm !important;
          }
        }
      `}</style>

      <div
        id="struk-overlay"
        className="fixed inset-0 z-50 flex flex-col justify-end md:items-center md:justify-center bg-black/70 backdrop-blur-sm"
      >
        <div className="absolute inset-0" onClick={onClose} />

        <div
          id="struk-wrapper"
          className="relative bg-skin-card w-full max-w-xs mx-auto border-t-2 md:border-2 border-skin-bdr shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-[#1A1918] px-4 py-3 flex items-center justify-between">
            <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
              {isRetur ? "Struk Retur" : "Struk Pembelian"}
            </span>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {/* Tab: "Versi A" (tampilan biasa, ada logo) vs "Versi B" (replika
              APA YANG BENAR-BENAR DICETAK printer thermal — TSPL cuma
              TEXT/BAR, tanpa logo/gambar). Sengaja dinamai "Versi A/B"
              (bukan "Preview"/"Preview Cetak") — user bilang nama teknis
              begitu bikin bingung. */}
          <div className="flex-shrink-0 border-b border-skin-bdr-lt flex">
            <button
              type="button"
              onClick={() => setContentTab("styled")}
              className={`flex-1 py-2 text-[11px] uppercase tracking-[0.06em] font-semibold transition ${
                contentTab === "styled"
                  ? "text-[#CAB170] border-b-2 border-[#CAB170]"
                  : "text-skin-text4 hover:text-skin-text3"
              }`}
            >
              Versi A
            </button>
            <button
              type="button"
              onClick={() => setContentTab("print")}
              className={`flex-1 py-2 text-[11px] uppercase tracking-[0.06em] font-semibold transition ${
                contentTab === "print"
                  ? "text-[#CAB170] border-b-2 border-[#CAB170]"
                  : "text-skin-text4 hover:text-skin-text3"
              }`}
            >
              Versi B
            </button>
          </div>

          {/* Isi struk */}
          <div className="overflow-y-auto flex-1">
            {/* Konten asli (ref dipakai toPng utk Simpan/Share) — SELALU
                di-mount (bukan display:none) supaya capture tetap valid
                walau tab "Versi B" sedang aktif; kalau nonaktif cuma
                digeser keluar viewport via position:fixed, BUKAN
                opacity/visibility (html-to-image akan capture blank kalau
                opacity/visibility disembunyikan). */}
            <div
              ref={contentRef}
              style={contentTab === "print" ? { position: "fixed", left: "-9999px", top: 0 } : undefined}
            >
              <StrukContent sale={sale} />
            </div>

            {contentTab === "print" && (
              <div className="p-3 bg-skin-raised">
                <TsplPrintPreview sale={sale} labelType={labelType} paperWidth={paperWidth} />
              </div>
            )}
          </div>

          {/* Status BT */}
          {(btError || btMsg) && (
            <div
              className={`flex-shrink-0 px-4 py-2 text-xs text-center leading-relaxed ${
                btError
                  ? "bg-red-50 text-red-700 border-t border-red-200"
                  : "bg-green-50 text-green-700 border-t border-green-200"
              }`}
            >
              {btError || btMsg}
            </div>
          )}

          {/* Pilihan jenis label */}
          <div className="flex-shrink-0 border-t border-skin-bdr-lt flex">
            {Object.entries(LABEL_TYPES).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => handleLabelTypeChange(key)}
                className={`flex-1 py-1.5 text-[10px] uppercase tracking-[0.06em] font-semibold transition ${
                  labelType === key
                    ? "text-[#CAB170] bg-[#CAB170]/10"
                    : "text-skin-text4 hover:text-skin-text3"
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Pilihan lebar kertas */}
          <div className="flex-shrink-0 border-t border-skin-bdr-lt flex">
            {Object.entries(PAPER_WIDTHS).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => handlePaperWidthChange(key)}
                className={`flex-1 py-1.5 text-[10px] uppercase tracking-[0.06em] font-semibold transition ${
                  paperWidth === key
                    ? "text-[#CAB170] bg-[#CAB170]/10"
                    : "text-skin-text4 hover:text-skin-text3"
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Tombol aksi — 3 kolom */}
          <div
            id="struk-actions"
            className="flex-shrink-0 border-t-2 border-skin-bdr grid grid-cols-3"
          >
            <button
              onClick={handleBtPrint}
              disabled={btBusy || busy}
              className="py-4 text-xs tracking-[0.06em] uppercase font-semibold text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span>{btBusy ? "..." : "Print"}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={busy}
              className="py-4 text-xs tracking-[0.06em] uppercase font-semibold text-white bg-[#6B6560] hover:bg-[#4A4540] transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span>{busy ? "..." : "Simpan"}</span>
            </button>
            <button
              onClick={handleShare}
              disabled={busy}
              className="py-4 text-xs tracking-[0.06em] uppercase font-semibold text-white bg-green-700 hover:bg-green-800 transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
