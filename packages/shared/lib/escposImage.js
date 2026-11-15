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
// diganti feed kertas tepat per-dot (`ESC J n`, lihat feedForBlankRows di
// bawah) alih-alih ikut dikirim sbg data bitmap kosong.
import { concat, splitRows, findBands, MAX_PAGE_BYTES } from "./tsplImage";

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// BUG FIX (November 2026, laporan admin: lebar struk sudah pas setelah PR
// #78, tapi jarak antar section struk kerasa mepet) — root cause: jarak
// kosong (hasil trim findBands) sebelumnya diisi ulang pakai line-feed
// polos (`\n`), dgn asumsi 1 LF ≈ 24 dots. Asumsi itu cuma perkiraan
// default tinggi baris font printer — beda2 per printer/firmware/setting
// font, jadi gampang meleset (lebih pendek dari gap aslinya = kelihatan
// mepet). `ESC J n` ("print and feed paper") majukan kertas TEPAT n dots
// (0-255/perintah, dirantai kalau gap-nya lebih panjang) — tidak
// tergantung tinggi baris default printer sama sekali, jadi presisi di
// printer mana pun.
function feedForBlankRows(rows) {
  if (rows <= 0) return new Uint8Array(0);
  const parts = [];
  let remaining = Math.round(rows);
  while (remaining > 0) {
    const n = Math.min(255, remaining);
    parts.push(Uint8Array.from([ESC, 0x4a, n]));
    remaining -= n;
  }
  return concat(parts);
}

// Eksperimen admin (November 2026, "diakali kayak TSPL" — TSPL BITMAP
// punya offset X bawaan jadi bisa kirim strip SEMPIT per bagian konten,
// GS v 0 ESC/POS tidak punya parameter offset X sama sekali, selalu
// dianggap mulai dari margin kiri). `colRange` ([bx0, bx1] dlm BYTE, dari
// findBands — sama persis yg dipakai TSPL) kalau diisi, raster row
// di-crop ke rentang kolom itu saja (makara datanya), diposisikan lewat
// `ESC $` sebelum blok GS v 0 (lihat buildImageEscPos). TIDAK aktif
// default krn efek `ESC $` pada mode grafis belum tentu didukung identik
// di semua klon ESC/POS murah — perlu dicek visual (lurus/geser) di
// printer fisik sebelum dipercaya.
function pushRasterRows(parts, bytes, widthBytes, y0, rows, whiteByte, colRange = null) {
  if (rows <= 0) return;
  let regionBytes = bytes;
  let regionWidthBytes = widthBytes;
  let regionY0 = y0;

  if (colRange) {
    const [bx0, bx1] = colRange;
    regionWidthBytes = bx1 - bx0;
    if (regionWidthBytes <= 0) return;
    const cropped = new Uint8Array(regionWidthBytes * rows);
    for (let r = 0; r < rows; r++) {
      const src = (y0 + r) * widthBytes + bx0;
      cropped.set(bytes.subarray(src, src + regionWidthBytes), r * regionWidthBytes);
    }
    regionBytes = cropped;
    regionY0 = 0;
  }

  const segments = splitRows(
    regionBytes.subarray(regionY0 * regionWidthBytes, (regionY0 + rows) * regionWidthBytes),
    regionWidthBytes,
    rows,
    Math.max(8, Math.floor(MAX_PAGE_BYTES / regionWidthBytes)),
    whiteByte,
  );
  for (const [s0, s1] of segments) {
    const segRows = s1 - s0;
    if (segRows <= 0) continue;
    const slice = regionBytes.subarray((regionY0 + s0) * regionWidthBytes, (regionY0 + s1) * regionWidthBytes);
    const xL = regionWidthBytes & 0xff;
    const xH = (regionWidthBytes >> 8) & 0xff;
    const yL = segRows & 0xff;
    const yH = (segRows >> 8) & 0xff;
    parts.push(Uint8Array.from([GS, 0x76, 0x30, 0x00, xL, xH, yL, yH]), slice);
  }
}

// ESC $ nL nH — "Set absolute print position". Unit-nya "horizontal
// motion unit" printer, yg DEFAULT-nya umumnya 1 dot di printhead
// 203dpi, tapi ini TIDAK dijamin sama di semua firmware/klon (beda dari
// `ESC J n` yg unitnya memang selalu dots, lihat feedForBlankRows) —
// makanya pakainya di belakang flag eksperimen `cropColumns`, bukan
// default.
function buildAbsolutePosition(dots) {
  const n = Math.max(0, Math.min(65535, Math.round(dots)));
  return Uint8Array.from([ESC, 0x24, n & 0xff, (n >> 8) & 0xff]);
}

// Perintah ESC/POS raster image "GS v 0": bit=1 = cetak titik hitam —
// KEBALIKAN dari konvensi TSPL (bit=0 = hitam, lihat packBitmap di
// tsplImage.js). Panggil grayToBitmap(..., { invert: true }) sebelum
// kirim ke sini supaya polaritasnya benar (lihat useTsplPrinter.js).
export function buildImageEscPos(bitmap, { feedLines = 4, trim = true, cropColumns = false } = {}) {
  const { widthBytes, height, bytes, whiteByte = 0x00 } = bitmap;
  const parts = [Uint8Array.from([ESC, 0x40])]; // ESC @ — initialize printer

  if (trim) {
    const bands = findBands(bytes, widthBytes, 0, height, whiteByte);
    let cursor = 0;
    for (const band of bands) {
      parts.push(feedForBlankRows(band.y0 - cursor));
      if (cropColumns) {
        parts.push(buildAbsolutePosition(band.bx0 * 8));
        pushRasterRows(parts, bytes, widthBytes, band.y0, band.y1 - band.y0, whiteByte, [band.bx0, band.bx1]);
      } else {
        pushRasterRows(parts, bytes, widthBytes, band.y0, band.y1 - band.y0, whiteByte);
      }
      cursor = band.y1;
    }
    parts.push(feedForBlankRows(height - cursor));
  } else {
    pushRasterRows(parts, bytes, widthBytes, 0, height, whiteByte);
  }

  parts.push(Uint8Array.from(new Array(feedLines).fill(LF)));
  return concat(parts);
}
