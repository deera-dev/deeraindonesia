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
import { writeBleFast, disconnectPrinter, bleConnect, scheduleIdleDisconnect } from "@deera/shared/lib/blePrinter";

// Pilihan lebar kertas — key adalah nilai mm yang dikirim apa adanya ke
// command TSPL `SIZE {mm} mm,...`. "78" = default (2026-08), "100" = opsi
// lama (dots TIDAK berubah).
export const PAPER_WIDTHS = {
  100: { label: "100mm", dots: 800 },
  78: { label: "78mm (Bawaan)", dots: 623 },
};
const DEFAULT_PAPER_WIDTH = "78";

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

export {
  FAST_CHUNK_START,
  FAST_DELAY_MS,
  writeBleFast,
  disconnectPrinter,
} from "@deera/shared/lib/blePrinter";

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
