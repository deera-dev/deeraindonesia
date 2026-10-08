/**
 * useTsplPrinter.js
 * Hook cetak struk ke thermal printer via TSPL + Web Bluetooth BLE.
 *
 * Struk dicetak sebagai GAMBAR (TSPL BITMAP, lihat ../lib/tsplImage.js).
 * Cetak teks TSPL ("Versi B") sudah dihapus 2026-10-08.
 *
 * Printer: Blueprint BP-TD110BT — 203 dpi, TSPL, BLE Generic FF00
 *   - ff02: write (HP→printer) ← yang dipakai
 * DPI 203 (BUKAN 300 — sudah dibuktikan lewat cetak fisik).
 */

import { useState } from "react";
import { buildImageTspl, dataUrlToGray, grayToBitmap } from "../lib/tsplImage";

// Pilihan lebar kertas — key adalah nilai mm yang dikirim apa adanya ke
// command TSPL `SIZE {mm} mm,...`. "78" = default (2026-08), "100" = opsi
// lama (dots TIDAK berubah).
export const PAPER_WIDTHS = {
  100: { label: "100mm", dots: 800 },
  78: { label: "78mm (Bawaan)", dots: 623 },
};
const DEFAULT_PAPER_WIDTH = "78";

// BLE service FF00 — hanya ff02 yang write
const FF00_SVC = "0000ff00-0000-1000-8000-00805f9b34fb";
const FF02_CHAR = "0000ff02-0000-1000-8000-00805f9b34fb";

// Kertas fisik "Putus (per struk)" Denny: 100mm × 150mm per label, gap 2mm
// (dikonfirmasi Denny 2026-08 — dulu ditebak gapMm=3, salah). heightMm FIXED
// di sini (150) — SENGAJA TIDAK dihitung dari panjang konten seperti mode
// continuous, karena kertas ini
// pre-cut di jarak TETAP: kalau kita kirim SIZE height yang lebih besar dari
// 150mm (dulu dihitung dinamis dari konten, bisa jauh lebih panjang), printer
// & kertas jadi TIDAK SINKRON — hasil cetak terpotong di titik acak / jadi
// 2-3 halaman berantakan (keluhan Denny). Dengan height FIXED=150mm, titik
// potong cetakan selalu sinkron dengan gap fisik kertas yang sesungguhnya.
export const LABEL_TYPES = {
  continuous: { label: "Kontinu (roll terus)", gapMm: 0 },
  gapped: { label: "Putus (per struk)", gapMm: 2, heightMm: 150 },
};

// ── BLE write CEPAT utk data gambar (BITMAP) ─────────────────────────────────
// Struk gambar ±80 KB: write-WITHOUT-response, paket besar, jeda pendek.
// Kalau paket ditolak (MTU lebih kecil) ukuran paket otomatis dibagi dua
// sampai minimal 20 byte, melanjutkan dari posisi yang sama.
export const FAST_CHUNK_START = 180;
// Jeda antar paket: 0 — Web Bluetooth sudah menunggu tiap paket selesai ditulis.
// (Pilihan Normal/Turbo dihapus 2026-10-08: Turbo 244 byte tidak mencetak.)
export const FAST_DELAY_MS = 0;

export async function writeBleFast(
  characteristic,
  data,
  { onProgress, chunk: chunkStart = FAST_CHUNK_START, delay = FAST_DELAY_MS } = {},
) {
  const props = characteristic.properties ?? {};
  const noResp = !!(props.writeWithoutResponse && characteristic.writeValueWithoutResponse);
  const write = (chunk) =>
    noResp
      ? characteristic.writeValueWithoutResponse(chunk)
      : characteristic.writeValueWithResponse
        ? characteristic.writeValueWithResponse(chunk)
        : characteristic.writeValue(chunk);

  let size = chunkStart;
  let offset = 0;
  while (offset < data.length) {
    const chunk = data.slice(offset, offset + size);
    try {
      await write(chunk);
    } catch (err) {
      if (size <= 20) throw err;
      size = Math.max(20, Math.floor(size / 2));
      continue; // ulangi dari offset yang sama dgn paket lebih kecil
    }
    offset += chunk.length;
    onProgress?.(Math.min(offset / data.length, 1));
    if (noResp && delay > 0 && offset < data.length) await new Promise((r) => setTimeout(r, delay));
  }
}

// ── BLE connect helper ───────────────────────────────────────────────────────
// Langsung ke ff02 tanpa delay — printer BP-TD110BT timeout cepat
// jika kita terlalu lama sebelum mulai kirim data.

//
// Percepatan (2026-10-08, "OpenLabel < 3 detik"): (1) koneksi DIPAKAI ULANG
// antar cetak (diputus otomatis setelah 60 dtk menganggur), (2) printer yang
// pernah dipilih DIINGAT (id di localStorage) dan disambung langsung lewat
// navigator.bluetooth.getDevices() tanpa dialog pilih perangkat, (3) kalau
// keduanya tidak tersedia, jatuh ke requestDevice seperti semula.
const LS_PRINTER_ID = "deera-bt-printer-id";
const IDLE_DISCONNECT_MS = 60000;
let _conn = null;
let _idleTimer = null;

function readSavedPrinterId() {
  try {
    return localStorage.getItem(LS_PRINTER_ID);
  } catch {
    return null;
  }
}
function savePrinterId(id) {
  try {
    if (id) localStorage.setItem(LS_PRINTER_ID, id);
  } catch {
    /* ignore */
  }
}

export function disconnectPrinter() {
  clearTimeout(_idleTimer);
  try {
    _conn?.server?.device?.gatt?.disconnect();
  } catch {
    /* ignore */
  }
  _conn = null;
}

function scheduleIdleDisconnect() {
  clearTimeout(_idleTimer);
  _idleTimer = setTimeout(disconnectPrinter, IDLE_DISCONNECT_MS);
}

async function openChar(server) {
  const svc = await server.getPrimaryService(FF00_SVC);
  return svc.getCharacteristic(FF02_CHAR);
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms)),
  ]);
}

async function bleConnect() {
  clearTimeout(_idleTimer);
  if (_conn?.server?.device?.gatt?.connected === true) return _conn;
  _conn = null;

  // Printer yang pernah dipilih → sambung langsung tanpa dialog.
  const savedId = readSavedPrinterId();
  if (savedId && typeof navigator.bluetooth.getDevices === "function") {
    try {
      const known = (await navigator.bluetooth.getDevices()).find((d) => d.id === savedId);
      if (known) {
        const server = await withTimeout(known.gatt.connect(), 8000);
        const char = await openChar(server);
        _conn = { server, char };
        return _conn;
      }
    } catch {
      /* jatuh ke dialog pilih perangkat */
    }
  }

  const device = await navigator.bluetooth.requestDevice({
    acceptAllDevices: true,
    optionalServices: [FF00_SVC],
  });
  const server = await device.gatt.connect();
  const char = await openChar(server);
  savePrinterId(device.id);
  _conn = { server, char };
  return _conn;
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useTsplPrinter() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // { stage: "connect" | "send", pct: 0..100 } selama proses cetak berjalan.
  const [progress, setProgress] = useState(null);
  // Ringkasan waktu cetak gambar terakhir (utk diagnosa kecepatan).
  const [timing, setTiming] = useState("");

  // Cetak GAMBAR struk (Versi A) langsung ke printer — cara kerja sama dgn
  // OpenLabel: gambar → 1-bit (Dithering/Biner) → TSPL BITMAP → BLE.
  async function printImageBle(dataUrl, options = {}) {
    const {
      labelType = "continuous",
      paperWidthMm = DEFAULT_PAPER_WIDTH,
      algorithm = "dither",
      invert = false,
    } = options;
    if (!navigator.bluetooth) {
      setError(
        "Web Bluetooth tidak tersedia. " +
          "Pastikan: (1) Chrome/Edge, (2) HTTPS, (3) Bluetooth aktif.",
      );
      return false;
    }

    setBusy(true);
    setError(null);
    try {
      const t0 = performance.now();
      setProgress({ stage: "raster", pct: 0 });
      const dots = PAPER_WIDTHS[paperWidthMm]?.dots ?? PAPER_WIDTHS[DEFAULT_PAPER_WIDTH].dots;
      const { gray, w, h } = await dataUrlToGray(dataUrl, dots);
      const bitmap = grayToBitmap(gray, w, h, { algorithm, invert });
      const label = LABEL_TYPES[labelType] ?? LABEL_TYPES.continuous;
      const bytes = buildImageTspl(bitmap, {
        paperWidthMm,
        gapMm: label.gapMm,
        labelHeightMm: labelType === "gapped" ? label.heightMm : null,
        trim: true, // hanya kirim area yang berisi (lebih sedikit byte = lebih cepat)
      });
      const t1 = performance.now();

      setProgress({ stage: "connect", pct: 0 });
      const conn = await bleConnect();
      const t2 = performance.now();

      await writeBleFast(conn.char, bytes, {
        onProgress: (p) => setProgress({ stage: "send", pct: Math.round(p * 100) }),
      });
      const t3 = performance.now();
      scheduleIdleDisconnect();
      const sec = (ms) => (ms / 1000).toFixed(1);
      const summary = `siap ${sec(t1 - t0)}s · sambung ${sec(t2 - t1)}s · kirim ${sec(t3 - t2)}s (${Math.round(bytes.length / 1024)} KB)`;
      console.log(`[TSPL IMG] ${w}x${h} dots — ${summary}`);
      setTiming(summary);
      return true;
    } catch (err) {
      disconnectPrinter();
      if (err.name === "NotFoundError") return false;
      setError(err.message || String(err));
      console.error("[TSPL IMG BLE] Error:", err);
      return false;
    } finally {
      setProgress(null);
      setBusy(false);
    }
  }

  return {
    printImageBle,
    busy,
    progress,
    timing,
    error,
    clearError: () => setError(null),
    connecting: busy,
  };
}
