import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import {
  useTsplPrinter,
  LABEL_TYPES,
  PRINTER_PROTOCOLS,
  paperWidthsFor,
  defaultPaperWidthFor,
  ACK_EVERY_DEFAULT,
  ACK_EVERY_OPTIONS,
  CHUNK_SIZE_DEFAULT,
  CHUNK_SIZE_OPTIONS,
  CROP_COLUMNS_DEFAULT,
} from "../hooks/useTsplPrinter";
import StrukContent from "./StrukContent";

const LS_LABEL_TYPE = "deera-label-type";
const LS_PAPER_WIDTH = "deera-paper-width";
const LS_IMG_ALGO = "deera-img-algo";
const LS_PROTOCOL = "deera-printer-protocol";
const LS_ACK_EVERY = "deera-printer-ack-every";
const LS_CHUNK_SIZE = "deera-printer-chunk-size";
const LS_CROP_COLUMNS = "deera-printer-crop-columns";
const IMG_ALGOS = { dither: "Dithering", binary: "Biner" };
const STAGE_LABEL = {
  capture: "Menyiapkan gambar…",
  raster: "Mengolah gambar…",
  connect: "Menghubungkan printer…",
  send: "Mengirim ke printer…",
};
const PREVIEW_PX_PER_DOT = 384 / 623;

function modalWidthPx(dots) {
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
function saveImgOption(key, v) {
  try {
    localStorage.setItem(key, v);
  } catch {
  }
}

function getSavedPaperWidth(protocol) {
  try {
    const v = localStorage.getItem(LS_PAPER_WIDTH);
    const widths = paperWidthsFor(protocol);
    return v && widths[v] ? v : defaultPaperWidthFor(protocol);
  } catch {
    return defaultPaperWidthFor(protocol);
  }
}
function savePaperWidth(v) {
  try {
    localStorage.setItem(LS_PAPER_WIDTH, v);
  } catch {
  }
}

function getSavedProtocol() {
  try {
    const v = localStorage.getItem(LS_PROTOCOL);
    return v && PRINTER_PROTOCOLS[v] ? v : "tspl";
  } catch {
    return "tspl";
  }
}
function saveProtocol(v) {
  try {
    localStorage.setItem(LS_PROTOCOL, v);
  } catch {
  }
}

// Eksperimen kecepatan ESC/POS (November 2026, admin: "coba kita
// eksperimen" soal print terasa lambat/stutter) — ackEvery dibuat bisa
// diubah dari UI supaya admin bisa uji beberapa nilai langsung di printer
// fisik tanpa perlu update aplikasi tiap coba. Lihat ACK_EVERY_OPTIONS &
// catatan trade-off di useTsplPrinter.js.
function getSavedAckEvery() {
  try {
    const v = parseInt(localStorage.getItem(LS_ACK_EVERY), 10);
    return ACK_EVERY_OPTIONS.includes(v) ? v : ACK_EVERY_DEFAULT;
  } catch {
    return ACK_EVERY_DEFAULT;
  }
}
function saveAckEvery(v) {
  try {
    localStorage.setItem(LS_ACK_EVERY, String(v));
  } catch {
  }
}

// Eksperimen ukuran paket (November 2026, admin: ackEvery terbukti nyaris
// tidak ngaruh ke kecepatan — "kayanya ack ga ngaruh deh") — satu2nya
// lever yang tersisa adalah ukuran paket BLE itu sendiri. Lihat
// CHUNK_SIZE_OPTIONS & catatan risiko di useTsplPrinter.js (512B pernah
// bikin disconnect — titik tengahnya belum pernah diuji).
function getSavedChunkSize() {
  try {
    const v = parseInt(localStorage.getItem(LS_CHUNK_SIZE), 10);
    return CHUNK_SIZE_OPTIONS.includes(v) ? v : CHUNK_SIZE_DEFAULT;
  } catch {
    return CHUNK_SIZE_DEFAULT;
  }
}
function saveChunkSize(v) {
  try {
    localStorage.setItem(LS_CHUNK_SIZE, String(v));
  } catch {
  }
}

// Eksperimen "diakali kayak TSPL" (November 2026, admin: TSPL BITMAP bisa
// pangkas kiri-kanan per bagian konten, GS v 0 ESC/POS belum) — toggle
// on/off (bukan daftar angka spt ackEvery/chunkSize) krn cuma 2 keadaan:
// pakai ESC $ buat mangkas kolom kosong, atau tidak. Default OFF — WAJIB
// dicek visual lurus/geser di printer fisik sebelum dipercaya, lihat
// catatan risiko di useTsplPrinter.js.
function getSavedCropColumns() {
  try {
    return localStorage.getItem(LS_CROP_COLUMNS) === "1";
  } catch {
    return CROP_COLUMNS_DEFAULT;
  }
}
function saveCropColumns(v) {
  try {
    localStorage.setItem(LS_CROP_COLUMNS, v ? "1" : "0");
  } catch {
  }
}

export default function Struk({ sale, onClose }) {
  const contentRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [btMsg, setBtMsg] = useState("");
  const [labelType, setLabelType] = useState(getSavedLabelType);
  const [imgAlgo, setImgAlgo] = useState(getSavedImgAlgo);
  const [protocol, setProtocol] = useState(getSavedProtocol);
  const [paperWidth, setPaperWidth] = useState(() => getSavedPaperWidth(protocol));
  const [ackEvery, setAckEvery] = useState(getSavedAckEvery);
  const [chunkSize, setChunkSize] = useState(getSavedChunkSize);
  const [cropColumns, setCropColumns] = useState(getSavedCropColumns);
  const [showSettings, setShowSettings] = useState(false);

  const paperWidths = paperWidthsFor(protocol);
  const dots = paperWidths[paperWidth]?.dots ?? paperWidths[defaultPaperWidthFor(protocol)].dots;

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
      protocol,
      ...(protocol === "escpos" ? { ackEvery, chunkSize, cropColumns } : {}),
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

  function handleAckEveryChange(v) {
    setAckEvery(v);
    saveAckEvery(v);
  }

  function handleChunkSizeChange(v) {
    setChunkSize(v);
    saveChunkSize(v);
  }

  function handleCropColumnsToggle() {
    const next = !cropColumns;
    setCropColumns(next);
    saveCropColumns(next);
  }

  function handleProtocolChange(v) {
    setProtocol(v);
    saveProtocol(v);
    // Preset "Lebar kertas" TSPL ("78"/"100") dan ESC/POS ("58"/"80") beda
    // dot-width (lihat catatan di ESCPOS_PAPER_WIDTHS) — reset ke default
    // protokol baru supaya tidak kebawa key dari protokol sebelumnya.
    const widths = paperWidthsFor(v);
    const next = widths[paperWidth] ? paperWidth : defaultPaperWidthFor(v);
    if (next !== paperWidth) {
      setPaperWidth(next);
      savePaperWidth(next);
    }
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
          style={{ "--paper-w": `${modalWidthPx(dots)}px` }}
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
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
                    <div className="h-full bg-skin-accent" style={{ width: `${btProgress.pct}%` }} />
                  </div>
                )}
              </div>
            )}
            <div className="bg-black min-h-full flex justify-center">
              <div
                id="struk-paper"
                data-testid="struk-paper"
                style={{ width: modalWidthPx(dots), maxWidth: "100%" }}
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
          <div data-testid="struk-settings" className="flex-shrink-0 border-t border-skin-bdr-lt px-3 pt-3 pb-2 space-y-2">
            <div className="flex gap-1 bg-skin-page p-1 rounded-full" role="group" aria-label="Protokol printer">
              {Object.entries(PRINTER_PROTOCOLS).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleProtocolChange(key)}
                  className={`flex-1 py-2 text-[11px] uppercase tracking-[0.06em] font-semibold rounded-full transition ${
                    protocol === key
                      ? "bg-skin-accent text-skin-on-accent shadow-sm"
                      : "text-skin-text2 hover:text-skin-text"
                  }`}
                >
                  {cfg.label}
                </button>
              ))}
            </div>
            {protocol === "tspl" && (
              <div className="flex gap-1 bg-skin-page p-1 rounded-full" role="group" aria-label="Jenis label">
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
            )}
            <div className="flex gap-1 bg-skin-page p-1 rounded-full" role="group" aria-label="Lebar kertas">
              {Object.entries(paperWidths).map(([key, cfg]) => (
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
            {protocol === "escpos" && (
              <div className="space-y-1">
                <p className="text-[10px] tracking-[0.06em] uppercase text-skin-text4 px-1">
                  Eksperimen kecepatan — makin besar makin cepat, tapi makin berisiko printer macet/disconnect
                </p>
                <div className="flex gap-1 bg-skin-page p-1 rounded-full" role="group" aria-label="Ack tiap N paket">
                  {ACK_EVERY_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => handleAckEveryChange(n)}
                      className={`flex-1 py-2 text-[11px] uppercase tracking-[0.06em] font-semibold rounded-full transition ${
                        ackEvery === n
                          ? "bg-skin-accent text-skin-on-accent shadow-sm"
                          : "text-skin-text2 hover:text-skin-text"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] tracking-[0.06em] uppercase text-skin-text4 px-1 pt-1">
                  Eksperimen ukuran paket (byte) — 512 PERNAH bikin printer disconnect, naikkan pelan2 &
                  cek hasil cetak tiap kali (bisa "sukses" tanpa error tapi hasilnya rusak)
                </p>
                <div className="flex gap-1 bg-skin-page p-1 rounded-full" role="group" aria-label="Ukuran paket">
                  {CHUNK_SIZE_OPTIONS.map((n) => (
                    <button
                      key={n}
                      onClick={() => handleChunkSizeChange(n)}
                      className={`flex-1 py-2 text-[11px] uppercase tracking-[0.06em] font-semibold rounded-full transition ${
                        chunkSize === n
                          ? "bg-skin-accent text-skin-on-accent shadow-sm"
                          : "text-skin-text2 hover:text-skin-text"
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] tracking-[0.06em] uppercase text-skin-text4 px-1 pt-1">
                  Eksperimen pangkas kolom kosong kiri-kanan — WAJIB cek fisik lurus/tidak geser,
                  jangan cuma lihat pesan "Terkirim"
                </p>
                <button
                  type="button"
                  onClick={handleCropColumnsToggle}
                  aria-pressed={cropColumns}
                  className={`w-full py-2 text-[11px] uppercase tracking-[0.06em] font-semibold rounded-full transition ${
                    cropColumns
                      ? "bg-skin-accent text-skin-on-accent shadow-sm"
                      : "bg-skin-page text-skin-text2 hover:text-skin-text"
                  }`}
                >
                  Pangkas kolom kosong: {cropColumns ? "Aktif" : "Nonaktif"}
                </button>
              </div>
            )}
            <div className="flex gap-1 bg-skin-page p-1 rounded-full" role="group" aria-label="Opsi cetak gambar">
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
