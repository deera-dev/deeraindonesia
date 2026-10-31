import { toPng } from "html-to-image";
import { useRef, useState } from "react";
import { LABEL_TYPES, PAPER_WIDTHS, useTsplPrinter } from "../hooks/useTsplPrinter";
import StrukContent from "./StrukContent";

const LS_LABEL_TYPE = "deera-label-type";
const LS_PAPER_WIDTH = "deera-paper-width";
const LS_IMG_ALGO = "deera-img-algo";
const IMG_ALGOS = { dither: "Dithering", binary: "Biner" };
const STAGE_LABEL = {
  capture: "Menyiapkan gambar…",
  raster: "Mengolah gambar…",
  connect: "Menghubungkan printer…",
  send: "Mengirim ke printer…",
};
const DEFAULT_PAPER_WIDTH = "78";

const PREVIEW_PX_PER_DOT = 384 / 623;

function modalWidthPx(paperWidthMm, paperWidths) {
  const dots = paperWidths[paperWidthMm]?.dots ?? paperWidths[DEFAULT_PAPER_WIDTH].dots;
  return Math.round(dots * PREVIEW_PX_PER_DOT);
}

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
  } catch {}
}

function getSavedImgAlgo() {
  try {
    const v = localStorage.getItem(LS_IMG_ALGO);
    return v && IMG_ALGOS[v] ? v : "dither";
  } catch {
    return "dither";
  }
}
function saveImgOption(key, v) {
  try {
    localStorage.setItem(key, v);
  } catch {}
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
  } catch {}
}

export default function Struk({ sale, onClose }) {
  const contentRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [btMsg, setBtMsg] = useState("");
  const [labelType, setLabelType] = useState(getSavedLabelType);
  const [paperWidth, setPaperWidth] = useState(getSavedPaperWidth);
  const [imgAlgo, setImgAlgo] = useState(getSavedImgAlgo);
  const [showSettings, setShowSettings] = useState(false);

  const {
    printImageBle,
    busy: btBusy,
    progress: btProgress,
    timing: btTiming,
    error: btError,
    clearError,
  } = useTsplPrinter();
  const [capturing, setCapturing] = useState(false);

  if (!sale) return null;
  const isRetur = sale.type === "retur";
  const isTukarTambah = sale.type === "tukar_tambah";

  async function captureImage(pixelRatio = 3) {
    if (!contentRef.current) return null;
    return toPng(contentRef.current, { quality: 1, pixelRatio, backgroundColor: "#ffffff" });
  }

  function printPixelRatio() {
    const w = contentRef.current?.offsetWidth;
    const dots = PAPER_WIDTHS[paperWidth]?.dots ?? PAPER_WIDTHS[DEFAULT_PAPER_WIDTH].dots;
    if (!w) return 2;
    return Math.min(3, Math.max(1, dots / w));
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
    let dataUrl;
    setCapturing(true);
    try {
      dataUrl = await captureImage(printPixelRatio());
    } catch (err) {
      setBtMsg("");
      alert("Gagal menyiapkan gambar struk: " + err.message);
      return;
    } finally {
      setCapturing(false);
    }
    const ok = await printImageBle(dataUrl, {
      labelType,
      paperWidthMm: paperWidth,
      algorithm: imgAlgo,
    });
    if (ok) setBtMsg("✓ Terkirim ke printer");
  }

  function handleLabelTypeChange(v) {
    setLabelType(v);
    saveLabelType(v);
  }

  function handleImgAlgoChange(v) {
    setImgAlgo(v);
    saveImgOption(LS_IMG_ALGO, v);
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
            height: auto !important;
            max-height: none !important;
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
          style={{ "--paper-w": `${modalWidthPx(paperWidth, PAPER_WIDTHS)}px` }}
          className="relative bg-skin-card mx-auto w-full h-[100dvh] md:w-[var(--paper-w)] md:max-w-[92vw] md:h-auto md:max-h-[90dvh] md:border-2 border-skin-bdr shadow-2xl overflow-hidden flex flex-col"
        >
          <div className="flex-shrink-0 bg-skin-header px-4 py-3 flex items-center justify-between">
            <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
              {isTukarTambah ? "Struk Tukar Tambah" : isRetur ? "Struk Retur" : "Struk Pembelian"}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowSettings((v) => !v)}
                aria-label="Pengaturan cetak"
                aria-expanded={showSettings}
                title="Pengaturan cetak"
                className={`transition leading-none ${showSettings ? "text-white" : "text-white/60 hover:text-white"}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>
              <button
                onClick={onClose}
                aria-label="Tutup"
                className="text-white/60 hover:text-white transition text-xl leading-none"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-1 relative">
            {(capturing || btBusy) && (
              <div
                data-testid="print-overlay"
                className="absolute inset-0 z-10 bg-black/55 flex flex-col items-center justify-center gap-3 text-white"
              >
                <span className="text-5xl font-bold tabular-nums">
                  {btProgress?.stage === "send" ? `${btProgress.pct}%` : "…"}
                </span>
                <span className="text-sm tracking-wide">
                  {STAGE_LABEL[capturing ? "capture" : (btProgress?.stage ?? "connect")]}
                </span>
                {btProgress?.stage === "send" && (
                  <div className="w-2/3 h-1.5 bg-white/25">
                    <div
                      className="h-full bg-skin-accent"
                      style={{ width: `${btProgress.pct}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            <div className="bg-black min-h-full flex justify-center">
              <div
                id="struk-paper"
                data-testid="struk-paper"
                style={{ width: modalWidthPx(paperWidth, PAPER_WIDTHS), maxWidth: "100%" }}
                className="bg-white"
              >
                <div ref={contentRef}>
                  <StrukContent sale={sale} />
                </div>
              </div>
            </div>
          </div>

          {(btError || btMsg) && (
            <div
              className={`flex-shrink-0 px-4 py-2 text-xs text-center leading-relaxed ${
                btError
                  ? "bg-red-50 text-red-700 border-t border-red-200"
                  : "bg-green-50 text-green-700 border-t border-green-200"
              }`}
            >
              {btError || btMsg}
              {!btError && btTiming && <span className="block opacity-70">{btTiming}</span>}
            </div>
          )}

          {showSettings && (
            <div
              data-testid="struk-settings"
              className="flex-shrink-0 border-t border-skin-bdr-lt px-3 pt-3 pb-2 space-y-2"
            >
              <div
                className="flex gap-1 bg-skin-page p-1 rounded-full"
                role="group"
                aria-label="Jenis label"
              >
                {Object.entries(LABEL_TYPES).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => handleLabelTypeChange(key)}
                    className={`flex-1 py-2 text-[11px] uppercase tracking-[0.06em] font-semibold rounded-full transition ${
                      labelType === key
                        ? "bg-skin-accent text-skin-on-accent shadow-sm"
                        : "text-skin-text2 hover:text-skin-text"
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
              <div
                className="flex gap-1 bg-skin-page p-1 rounded-full"
                role="group"
                aria-label="Lebar kertas"
              >
                {Object.entries(PAPER_WIDTHS).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => handlePaperWidthChange(key)}
                    className={`flex-1 py-2 text-[11px] uppercase tracking-[0.06em] font-semibold rounded-full transition ${
                      paperWidth === key
                        ? "bg-skin-accent text-skin-on-accent shadow-sm"
                        : "text-skin-text2 hover:text-skin-text"
                    }`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
              <div
                className="flex gap-1 bg-skin-page p-1 rounded-full"
                role="group"
                aria-label="Opsi cetak gambar"
              >
                {Object.entries(IMG_ALGOS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => handleImgAlgoChange(key)}
                    className={`flex-1 py-2 text-[11px] uppercase tracking-[0.06em] font-semibold rounded-full transition ${
                      imgAlgo === key
                        ? "bg-skin-accent text-skin-on-accent shadow-sm"
                        : "text-skin-text2 hover:text-skin-text"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div
            id="struk-actions"
            className="flex-shrink-0 border-t border-skin-bdr p-3 grid grid-cols-3 gap-2"
          >
            <button
              onClick={handleBtPrint}
              disabled={btBusy || busy || capturing}
              className="py-3.5 rounded-xl text-xs tracking-[0.06em] uppercase font-semibold text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span>Print</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={busy}
              className="py-3.5 rounded-xl text-xs tracking-[0.06em] uppercase font-semibold text-white bg-skin-neutral hover:bg-skin-neutral-hover transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span>{busy ? "..." : "Simpan"}</span>
            </button>
            <button
              onClick={handleShare}
              disabled={busy}
              className="py-3.5 rounded-xl text-xs tracking-[0.06em] uppercase font-semibold text-white bg-green-700 hover:bg-green-800 transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span>Share</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
