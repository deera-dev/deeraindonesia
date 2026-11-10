// Printer alternatif selain TSPL (tsplImage.js) — admin beli CASHCOW
// CT-321B buat struk POS, ternyata printernya tidak mengerti bahasa
// perintah TSPL sama sekali (teks command TSPL tercetak apa adanya sbg
// karakter, bukan dieksekusi — lihat foto struk yang dikirim admin).
// CASHCOW dipasarkan sbg printer "label & struk", jadi kemungkinan besar
// firmware-nya ESC/POS (bahasa standar printer struk/kasir), bukan TSPL
// (bahasa standar printer label). Raster generation (dataUrlToGray,
// grayToBitmap, dkk di tsplImage.js) dipakai bareng — cuma cara bungkus
// bitmap jadi perintah printer yang beda.
//
// REVISI (November 2026, segera setelah PR #61 dibatalkan krn bikin GATT
// disconnect — admin: "pasti jalan tetep aja ga bakal bisa dipakai kalau
// sampe 220 detik"): 220 detik utk struk 112KB ≈ 500 byte/dtk — dekat
// sekali dgn kecepatan UART lambat umum (bridge "jembatan serial" ISSC
// UART, lihat blePrinter.js, kemungkinan merelay ke mesin cetak lewat
// serial yg jauh lebih lambat dari link BLE-nya sendiri). Kalau benar,
// cuma MENGURANGI JUMLAH BYTE yang beneran berarti (bukan ngerjain trik
// BLE lain yang sudah terbukti berisiko bikin disconnect) yang bisa
// mempercepat — baris yang KOSONG (whitespace di antara section struk)
// sekarang dilewati (findBands dari tsplImage.js, dipakai jg oleh TSPL),
// diganti feed kertas pakai line-feed polos (sudah terbukti jalan di
// printer ini — dipakai di `feedLines` penutup) alih-alih ikut dikirim
// sbg data bitmap kosong.
import { concat, splitRows, findBands, MAX_PAGE_BYTES } from "./tsplImage";

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// Perkiraan tinggi 1 baris line-feed default printer (dots) — dipakai
// CUMA utk ngisi ulang jarak kosong supaya spasi antar section struk
// kurang lebih kelihatan sama kayak aslinya. Tidak perlu presisi (area
// itu memang kosong), beda dikit tidak masalah secara visual.
const DOTS_PER_LF = 24;

function feedForBlankRows(rows) {
  if (rows <= 0) return new Uint8Array(0);
  const n = Math.max(1, Math.round(rows / DOTS_PER_LF));
  return Uint8Array.from(new Array(n).fill(LF));
}

function pushRasterRows(parts, bytes, widthBytes, y0, rows, whiteByte) {
  if (rows <= 0) return;
  const segments = splitRows(
    bytes.subarray(y0 * widthBytes, (y0 + rows) * widthBytes),
    widthBytes,
    rows,
    Math.max(8, Math.floor(MAX_PAGE_BYTES / widthBytes)),
    whiteByte,
  );
  for (const [s0, s1] of segments) {
    const segRows = s1 - s0;
    if (segRows <= 0) continue;
    const slice = bytes.subarray((y0 + s0) * widthBytes, (y0 + s1) * widthBytes);
    const xL = widthBytes & 0xff;
    const xH = (widthBytes >> 8) & 0xff;
    const yL = segRows & 0xff;
    const yH = (segRows >> 8) & 0xff;
    parts.push(Uint8Array.from([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]), slice);
  }
}

// Perintah ESC/POS raster image "GS v 0": bit=1 = cetak titik hitam —
// KEBALIKAN dari konvensi TSPL (bit=0 = hitam, lihat packBitmap di
// tsplImage.js). Panggil grayToBitmap(..., { invert: true }) sebelum
// kirim ke sini supaya polaritasnya benar (lihat useTsplPrinter.js).
export function buildImageEscPos(bitmap, { feedLines = 4, trim = true } = {}) {
  const { widthBytes, height, bytes, whiteByte = 0x00 } = bitmap;
  const parts = [Uint8Array.from([ESC, 0x40])]; // ESC @ — initialize printer

  if (trim) {
    const bands = findBands(bytes, widthBytes, 0, height, whiteByte);
    let cursor = 0;
    for (const band of bands) {
      parts.push(feedForBlankRows(band.y0 - cursor));
      pushRasterRows(parts, bytes, widthBytes, band.y0, band.y1 - band.y0, whiteByte);
      cursor = band.y1;
    }
    parts.push(feedForBlankRows(height - cursor));
  } else {
    pushRasterRows(parts, bytes, widthBytes, 0, height, whiteByte);
  }

  parts.push(Uint8Array.from(new Array(feedLines).fill(LF)));
  return concat(parts);
}
