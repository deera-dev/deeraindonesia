import {
  bleConnect,
  disconnectPrinter,
  scheduleIdleDisconnect,
  writeBleFast,
} from "@deera/shared/lib/blePrinter";
import { useState } from "react";
import { buildImageTspl, dataUrlToGray, grayToBitmap } from "../lib/tsplImage";

export const PAPER_WIDTHS = {
  100: { label: "100mm", dots: 800 },
  78: { label: "78mm (Bawaan)", dots: 623 },
};
const DEFAULT_PAPER_WIDTH = "78";

export const LABEL_TYPES = {
  continuous: { label: "Kontinu (roll terus)", gapMm: 0 },
  gapped: { label: "Putus (per struk)", gapMm: 2, heightMm: 150 },
};

export {
  disconnectPrinter,
  FAST_CHUNK_START,
  FAST_DELAY_MS,
  writeBleFast,
} from "@deera/shared/lib/blePrinter";

export function useTsplPrinter() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [timing, setTiming] = useState("");

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
        trim: true,
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
