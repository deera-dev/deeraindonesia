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
import { useTsplPrinter, LABEL_TYPES, PAPER_WIDTHS, SPEEDS } from "../hooks/useTsplPrinter";
import StrukContent from "./StrukContent";

const LS_LABEL_TYPE = "deera-label-type";
const LS_PAPER_WIDTH = "deera-paper-width";
// Cetak gambar Versi A (permintaan Denny 2026-10-08, seperti OpenLabel):
// algoritma raster ("dither" | "binary") & polaritas bitmap (invert) —
// invert disediakan krn printer clone bisa memakai polaritas terbalik.
const LS_IMG_ALGO = "deera-img-algo";
const LS_IMG_SPEED = "deera-img-speed";
const IMG_ALGOS = { dither: "Dithering", binary: "Biner" };
const STAGE_LABEL = {
  capture: "Menyiapkan gambar…",
  raster: "Mengolah gambar…",
  connect: "Menghubungkan printer…",
  send: "Mengirim ke printer…",
};
// Default lebar kertas 78mm (keputusan Denny 2026-08 — dulu 100mm).
const DEFAULT_PAPER_WIDTH = "78";

// Lebar modal (struk-wrapper) sekarang MENGIKUTI lebar kertas terpilih
// (78mm/100mm) — permintaan Denny 2026-08 supaya modalnya beneran jadi
// preview ukuran cetak, bukan lebar tetap yang sama utk kedua pilihan
// kertas. Skala dihitung dari PAPER_WIDTHS[...].dots (dot count yg SAMA
// dipakai TSPL/Versi B) supaya kedua tab (Versi A & B) selalu tampil di
// lebar yg konsisten satu sama lain, dan proporsi 78mm vs 100mm akurat
// (100mm ≈ 28% lebih lebar dari 78mm, sama seperti rasio fisiknya).
// PREVIEW_PX_PER_DOT dipilih supaya 78mm (default) ≈ 384px — lebar yang
// sudah teruji nyaman utk baris qty×harga + total tanpa wrap berantakan.
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
  } catch {
    /* ignore */
  }
}

function getSavedImgAlgo() {
  try {
    const v = localStorage.getItem(LS_IMG_ALGO);
    return v && IMG_ALGOS[v] ? v : "dither";
  } catch {
    return "dither";
  }
}
function getSavedImgSpeed() {
  try {
    const v = localStorage.getItem(LS_IMG_SPEED);
    return v && SPEEDS?.[v] ? v : "cepat";
  } catch {
    return "cepat";
  }
}
function saveImgOption(key, v) {
  try {
    localStorage.setItem(key, v);
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
  const [imgAlgo, setImgAlgo] = useState(getSavedImgAlgo);

  const {
    printImageBle,
    busy: btBusy,
    progress: btProgress,
    timing: btTiming,
    error: btError,
    clearError,
  } = useTsplPrinter();
  // true selama struk di-capture jadi gambar (sebelum hook printer mulai).
  const [capturing, setCapturing] = useState(false);
  const [imgSpeed, setImgSpeed] = useState(getSavedImgSpeed);

  if (!sale) return null;
  const isRetur = sale.type === "retur";
  const isTukarTambah = sale.type === "tukar_tambah";

  async function captureImage(pixelRatio = 3) {
    if (!contentRef.current) return null;
    return toPng(contentRef.current, { quality: 1, pixelRatio, backgroundColor: "#ffffff" });
  }

  // Capture utk CETAK: resolusi pas lebar kertas (dots), bukan 3x — lebih
  // cepat dan tetap tajam karena nanti diskala ke lebar dots juga.
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
    // Cetak GAMBAR struk: raster ke bitmap lalu kirim langsung (cara OpenLabel).
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
      speed: imgSpeed,
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

  function handleImgSpeedChange(v) {
    setImgSpeed(v);
    saveImgOption(LS_IMG_SPEED, v);
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
          // Lebar mengikuti paperWidth terpilih (lihat modalWidthPx di atas)
          // — modal ini sekarang beneran preview proporsi ukuran kertas,
          // berlaku utk Versi A maupun Versi B (StrukContent & canvas TSPL
          // sama-sama width:100% dari wrapper ini). maxWidth:92vw jaga2 di
          // layar HP sempit supaya tidak overflow horizontal.
          style={{ width: modalWidthPx(paperWidth, PAPER_WIDTHS), maxWidth: "92vw" }}
          className="relative bg-skin-card mx-auto border-t-2 md:border-2 border-skin-bdr shadow-2xl overflow-hidden max-h-[90dvh] flex flex-col"
        >
          {/* Header */}
          <div className="flex-shrink-0 bg-[#1A1918] px-4 py-3 flex items-center justify-between">
            <span className="text-sm tracking-[0.15em] uppercase text-white font-medium">
              {isTukarTambah ? "Struk Tukar Tambah" : isRetur ? "Struk Retur" : "Struk Pembelian"}
            </span>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition text-xl leading-none"
            >
              ✕
            </button>
          </div>

          {/* Isi struk — overlay progres cetak menutupi area ini (bukan tombol) */}
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
                    <div className="h-full bg-[#CAB170]" style={{ width: `${btProgress.pct}%` }} />
                  </div>
                )}
              </div>
            )}
            {/* Konten struk (ref dipakai toPng utk Cetak/Simpan/Share) */}
            <div ref={contentRef}>
              <StrukContent sale={sale} />
            </div>
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
              {!btError && btTiming && <span className="block opacity-70">{btTiming}</span>}
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

          {/* Opsi cetak gambar */}
          {(
            <div className="flex-shrink-0 border-t border-skin-bdr-lt flex items-stretch">
              {Object.entries(IMG_ALGOS).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => handleImgAlgoChange(key)}
                  className={`flex-1 py-1.5 text-[10px] uppercase tracking-[0.06em] font-semibold transition ${
                    imgAlgo === key
                      ? "text-[#CAB170] bg-[#CAB170]/10"
                      : "text-skin-text4 hover:text-skin-text3"
                  }`}
                >
                  {label}
                </button>
              ))}
              <select
                aria-label="Kecepatan kirim"
                value={imgSpeed}
                onChange={(e) => handleImgSpeedChange(e.target.value)}
                className="flex-1 bg-transparent text-[10px] uppercase tracking-[0.06em] font-semibold text-skin-text4 text-center"
              >
                {Object.entries(SPEEDS ?? {}).map(([key, cfg]) => (
                  <option key={key} value={key}>
                    {cfg.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tombol aksi — 3 kolom */}
          <div
            id="struk-actions"
            className="flex-shrink-0 border-t-2 border-skin-bdr grid grid-cols-3"
          >
            <button
              onClick={handleBtPrint}
              disabled={btBusy || busy || capturing}
              className="py-4 text-xs tracking-[0.06em] uppercase font-semibold text-white bg-blue-700 hover:bg-blue-800 transition disabled:opacity-40 flex flex-col items-center gap-1"
            >
              <span>Print</span>
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
