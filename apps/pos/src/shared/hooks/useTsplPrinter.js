
import { useState } from "react";
import { buildImageTspl, dataUrlToGray, grayToBitmap } from "../lib/tsplImage";
import { buildImageEscPos } from "../lib/escposImage";
import { writeBleFast, disconnectPrinter, bleConnect, scheduleIdleDisconnect } from "@deera/shared/lib/blePrinter";

export const PAPER_WIDTHS = {
  100: { label: "100mm", dots: 800 },
  78: { label: "78mm (Bawaan)", dots: 623 },
};
const DEFAULT_PAPER_WIDTH = "78";

export const LABEL_TYPES = {
  continuous: { label: "Kontinu (roll terus)", gapMm: 0 },
  gapped: { label: "Putus (per struk)", gapMm: 2, heightMm: 150 },
};

// Protokol bahasa perintah printer — admin beli CASHCOW CT-321B, ternyata
// tidak mengerti TSPL sama sekali (command text-nya tercetak apa adanya,
// bukan dieksekusi). CASHCOW dipasarkan sbg printer "label & struk", jadi
// kemungkinan besar ESC/POS (bahasa printer struk/kasir umum). Default
// tetap "tspl" (printer yang sudah didukung sebelumnya tidak terpengaruh).
export const PRINTER_PROTOCOLS = {
  tspl: { label: "TSPL (printer label)" },
  escpos: { label: "ESC/POS (printer struk)" },
};
const DEFAULT_PROTOCOL = "tspl";

export {
  FAST_CHUNK_START,
  FAST_DELAY_MS,
  writeBleFast,
  disconnectPrinter,
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
      protocol = DEFAULT_PROTOCOL,
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
      // ESC/POS "GS v 0": bit=1 = hitam — kebalikan konvensi TSPL
      // (bit=0 = hitam, lihat packBitmap di tsplImage.js) — balik polaritas
      // (invert) hanya utk ESC/POS, tanpa ubah perilaku TSPL yang sudah ada.
      const bitmap = grayToBitmap(gray, w, h, {
        algorithm,
        invert: protocol === "escpos" ? !invert : invert,
      });
      const label = LABEL_TYPES[labelType] ?? LABEL_TYPES.continuous;
      const bytes =
        protocol === "escpos"
          ? buildImageEscPos(bitmap)
          : buildImageTspl(bitmap, {
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
        // ESC/POS — percobaan ke-3: ack tiap paket (forceResponse) TERBUKTI
        // reliabel tapi lambat (220 detik utk 112KB, krn tiap paket = 1
        // round-trip Bluetooth penuh), padahal app lain (OpenLabel) berhasil
        // cepat DAN reliabel ngirim struk yang SAMA PERSIS ke printer yang
        // SAMA — jadi ini bukan batas fisik printer/koneksinya, murni soal
        // caranya kita kirim data. Dugaan: OpenLabel pakai "tanpa respons"
        // (writeWithoutResponse, cepat krn TIDAK nunggu balasan) tapi dgn
        // jeda kecil antar paket (bukan 0 spt percobaan PERTAMA yang gagal) —
        // ngasih waktu buffer internal chip utk ngosongin tanpa perlu
        // sinkron penuh pakai ack. Coba pola itu: balik ke writeWithoutResponse
        // (forceResponse dilepas, writeBleFast pilih sendiri — characteristic
        // ini support writeWithoutResponse) + delay kecil.
        delay: protocol === "escpos" ? 15 : undefined,
      });
      const t3 = performance.now();
      // ESC/POS (CASHCOW CT-321B & sejenisnya, chip "jembatan serial" BLE) —
      // laporan admin: print pertama jalan (telat), print berikutnya di
      // koneksi yang SAMA (masih idle-cached) kadang diam total walau
      // "Terkirim ke printer" sukses tanpa error. Dugaan: firmware-nya
      // tidak tahan terima stream kedua di koneksi yang sudah terbuka —
      // putus & connect ulang tiap print (bukan idle-cache 60dtk spt TSPL)
      // supaya tiap print dapat koneksi baru & segar. Lebih lambat
      // (~3-4dtk ekstra per print) tapi diharapkan lebih konsisten/reliabel
      // utk printer tipe ini.
      if (protocol === "escpos") disconnectPrinter();
      else scheduleIdleDisconnect();
      const sec = (ms) => (ms / 1000).toFixed(1);
      const summary = `siap ${sec(t1 - t0)}s · sambung ${sec(t2 - t1)}s · kirim ${sec(t3 - t2)}s (${Math.round(bytes.length / 1024)} KB)`;
      const tag = protocol === "escpos" ? "ESCPOS IMG" : "TSPL IMG";
      console.log(`[${tag}] ${w}x${h} dots — ${summary}`);
      setTiming(summary);
      return true;
    } catch (err) {
      disconnectPrinter();
      if (err.userCancelled) return false;
      setError(err.message || String(err));
      console.error("[PRINTER BLE] Error:", err);
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
