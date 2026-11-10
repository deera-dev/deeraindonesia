// Printer alternatif selain TSPL (tsplImage.js) — admin beli CASHCOW
// CT-321B buat struk POS, ternyata printernya tidak mengerti bahasa
// perintah TSPL sama sekali (teks command TSPL tercetak apa adanya sbg
// karakter, bukan dieksekusi — lihat foto struk yang dikirim admin).
// CASHCOW dipasarkan sbg printer "label & struk", jadi kemungkinan besar
// firmware-nya ESC/POS (bahasa standar printer struk/kasir), bukan TSPL
// (bahasa standar printer label). Raster generation (dataUrlToGray,
// grayToBitmap, dkk di tsplImage.js) dipakai bareng — cuma cara bungkus
// bitmap jadi perintah printer yang beda.
import { concat, splitRows, MAX_PAGE_BYTES } from "./tsplImage";

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Perintah ESC/POS raster image "GS v 0": bit=1 = cetak titik hitam —
// KEBALIKAN dari konvensi TSPL (bit=0 = hitam, lihat packBitmap di
// tsplImage.js). Panggil grayToBitmap(..., { invert: true }) sebelum
// kirim ke sini supaya polaritasnya benar (lihat useTsplPrinter.js).
export function buildImageEscPos(bitmap, { feedLines = 4 } = {}) {
  const { widthBytes, height, bytes, whiteByte = 0x00 } = bitmap;
  const segments = splitRows(bytes, widthBytes, height, Math.max(8, Math.floor(MAX_PAGE_BYTES / widthBytes)), whiteByte);
  const parts = [Uint8Array.from([ESC, 0x40])]; // ESC @ — initialize printer
  for (const [y0, y1] of segments) {
    const rows = y1 - y0;
    if (rows <= 0) continue;
    const slice = bytes.subarray(y0 * widthBytes, y1 * widthBytes);
    const xL = widthBytes & 0xff;
    const xH = (widthBytes >> 8) & 0xff;
    const yL = rows & 0xff;
    const yH = (rows >> 8) & 0xff;
    parts.push(Uint8Array.from([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]), slice);
  }
  parts.push(Uint8Array.from(new Array(feedLines).fill(LF)));
  return concat(parts);
}
