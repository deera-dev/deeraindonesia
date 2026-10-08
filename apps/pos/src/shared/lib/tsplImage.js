/**
 * tsplImage.js — ubah gambar struk (Versi A) jadi perintah TSPL BITMAP supaya
 * bisa dicetak langsung ke printer thermal BLE (permintaan Denny 2026-10-08:
 * "print versi A langsung seperti OpenLabel"). Versi B memakai perintah
 * teks (TEXT/BAR); Versi A adalah gambar PNG berlogo + QR, jadi harus
 * di-raster ke 1-bit (hitam/putih) lalu dikirim sebagai bitmap — persis
 * yang dilakukan OpenLabel ("Dithering"/"Binary", "Paper width").
 *
 * Fungsi di sini MURNI (tanpa DOM) kecuali `dataUrlToGray` yang memakai
 * canvas. Polaritas: standar TSC = bit 0 → titik dicetak (hitam), bit 1 →
 * kosong. Beberapa printer clone terbalik, makanya `invert` disediakan
 * (dipilih user di layar Struk, tersimpan).
 */

export const DOTS_PER_MM = 8; // 203 dpi

/** RGBA (canvas ImageData.data) → grayscale 0-255, alpha dilebur ke putih. */
export function rgbaToGray(rgba, w, h) {
  const gray = new Uint8Array(w * h);
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    const a = rgba[p + 3] / 255;
    const r = rgba[p] * a + 255 * (1 - a);
    const g = rgba[p + 1] * a + 255 * (1 - a);
    const b = rgba[p + 2] * a + 255 * (1 - a);
    gray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }
  return gray;
}

/** Biner: gelap (< threshold) = hitam. Return Uint8Array 1 = hitam. */
export function binarize(gray, threshold = 150) {
  const out = new Uint8Array(gray.length);
  for (let i = 0; i < gray.length; i++) out[i] = gray[i] < threshold ? 1 : 0;
  return out;
}

/** Floyd–Steinberg dithering. Return Uint8Array 1 = hitam. */
export function ditherFloydSteinberg(gray, w, h) {
  const buf = Float32Array.from(gray);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = buf[i];
      const val = old < 128 ? 0 : 255;
      out[i] = val === 0 ? 1 : 0;
      const err = old - val;
      if (x + 1 < w) buf[i + 1] += (err * 7) / 16;
      if (y + 1 < h) {
        if (x > 0) buf[i + w - 1] += (err * 3) / 16;
        buf[i + w] += (err * 5) / 16;
        if (x + 1 < w) buf[i + w + 1] += err / 16;
      }
    }
  }
  return out;
}

/**
 * Pack flag hitam (1 = hitam) jadi bitmap TSPL: MSB-first, baris dipadding ke
 * kelipatan 8 piksel. Standar: hitam → bit 0. `invert` membalik.
 * Return { widthBytes, height, bytes }.
 */
export function packBitmap(black, w, h, { invert = false } = {}) {
  const widthBytes = Math.ceil(w / 8);
  const bytes = new Uint8Array(widthBytes * h);
  // Padding kanan = putih (tidak dicetak).
  const whiteBit = invert ? 0 : 1;
  for (let y = 0; y < h; y++) {
    for (let bx = 0; bx < widthBytes; bx++) {
      let byte = 0;
      for (let k = 0; k < 8; k++) {
        const x = bx * 8 + k;
        const isBlack = x < w ? black[y * w + x] === 1 : false;
        const bit = isBlack ? 1 - whiteBit : whiteBit;
        byte |= bit << (7 - k);
      }
      bytes[y * widthBytes + bx] = byte;
    }
  }
  return { widthBytes, height: h, bytes, whiteByte: invert ? 0x00 : 0xff };
}

/** Gray → bitmap sesuai algoritma ("dither" | "binary"). */
export function grayToBitmap(gray, w, h, { algorithm = "dither", invert = false } = {}) {
  const black = algorithm === "binary" ? binarize(gray) : ditherFloydSteinberg(gray, w, h);
  return packBitmap(black, w, h, { invert });
}

const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);

function concat(parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

/**
 * Cari "pita" berisi di bitmap: baris yang seluruhnya putih dilewati (struk
 * banyak ruang kosong antar bagian), dan tiap pita dipangkas ke kolom-byte
 * yang benar-benar berisi. Hasilnya jauh lebih sedikit byte utk dikirim lewat
 * BLE (bagian paling lambat). Celah putih < `minGapRows` baris tidak
 * memecah pita (menghindari ratusan BITMAP kecil utk jarak antar-huruf).
 * Mengembalikan [{y0, y1, bx0, bx1}] (y1/bx1 eksklusif) relatif ke `rowStart`.
 */
export function findBands(bytes, widthBytes, rowStart, rows, whiteByte = 0xff, minGapRows = 8) {
  const bands = [];
  let cur = null;
  let blank = 0;
  for (let r = 0; r < rows; r++) {
    const off = (rowStart + r) * widthBytes;
    let first = -1;
    let last = -1;
    for (let b = 0; b < widthBytes; b++) {
      if (bytes[off + b] !== whiteByte) {
        if (first < 0) first = b;
        last = b;
      }
    }
    if (first < 0) {
      if (cur && ++blank >= minGapRows) {
        bands.push(cur);
        cur = null;
      }
      continue;
    }
    if (!cur) cur = { y0: r, y1: r + 1, bx0: first, bx1: last + 1 };
    else {
      cur.y1 = r + 1;
      cur.bx0 = Math.min(cur.bx0, first);
      cur.bx1 = Math.max(cur.bx1, last + 1);
    }
    blank = 0;
  }
  if (cur) bands.push(cur);
  return bands;
}

/**
 * Susun stream TSPL lengkap (byte). `continuous`: satu job, tinggi = tinggi
 * gambar. `gapped`: kertas pre-cut — gambar dipotong per `labelHeightMm`
 * (tiap potongan = 1 label lengkap, sama seperti Versi B).
 */
// Buffer halaman printer terbatas (struk panjang ±3370 baris × 78 byte ≈ 256 KB
// terpotong di printer Denny, 2026-10-08). Struk kontinu yang lebih besar dari
// ini dipecah jadi beberapa job berurutan, dipotong di baris putih.
export const MAX_PAGE_BYTES = 200000;

/**
 * Bagi tinggi gambar jadi segmen [start, end) yang masing-masing ≤ maxRows,
 * batas dipilih di baris putih & kelipatan 8 baris (supaya tinggi kertas
 * per job pas dalam mm dan tidak memotong teks). Tanpa baris putih di
 * 40% terakhir → potong keras di kelipatan 8.
 */
export function splitRows(bytes, widthBytes, height, maxRows, whiteByte = 0xff) {
  const isWhite = (r) => {
    for (let b = 0; b < widthBytes; b++) if (bytes[r * widthBytes + b] !== whiteByte) return false;
    return true;
  };
  const maxAligned = Math.max(8, Math.floor(maxRows / 8) * 8);
  const segs = [];
  let start = 0;
  while (height - start > maxAligned) {
    const lim = start + maxAligned;
    const floor = start + Math.floor(maxAligned * 0.6);
    let cut = lim;
    for (let r = lim; r >= floor; r -= 8) {
      if (r + 1 < height && isWhite(r) && isWhite(r + 1)) {
        cut = r;
        break;
      }
    }
    segs.push([start, cut]);
    start = cut;
  }
  segs.push([start, height]);
  return segs;
}

export function buildImageTspl(bitmap, { paperWidthMm, gapMm = 0, labelHeightMm = null, trim = false }) {
  const { widthBytes, height, bytes, whiteByte = 0xff } = bitmap;
  let segments;
  if (labelHeightMm) {
    const pageRows = Math.round(labelHeightMm * DOTS_PER_MM);
    segments = [];
    for (let y = 0; y < height; y += pageRows) segments.push([y, Math.min(height, y + pageRows)]);
  } else {
    segments = splitRows(bytes, widthBytes, height, Math.floor(MAX_PAGE_BYTES / widthBytes), whiteByte);
  }
  const parts = [];
  for (let i = 0; i < segments.length; i++) {
    const [y0, y1] = segments[i];
    const rows = y1 - y0;
    const isLast = i === segments.length - 1;
    const slice = bytes.subarray(y0 * widthBytes, (y0 + rows) * widthBytes);
    // Kontinu: job tengah pas kelipatan 8 baris (tanpa celah antar job),
    // job terakhir +1 mm margin bawah.
    const heightMm = labelHeightMm ?? (isLast ? Math.ceil((rows + 8) / DOTS_PER_MM) : rows / DOTS_PER_MM);
    parts.push(
      ascii(`SIZE ${paperWidthMm} mm,${heightMm} mm\r\nGAP ${gapMm} mm,0 mm\r\nDIRECTION 0\r\nCLS\r\n`),
    );
    if (trim) {
      // Hanya kirim pita yang berisi; sisanya dibiarkan putih oleh CLS.
      for (const band of findBands(bytes, widthBytes, y0, rows, whiteByte)) {
        const bw = band.bx1 - band.bx0;
        const bh = band.y1 - band.y0;
        const chunk = new Uint8Array(bw * bh);
        for (let r = 0; r < bh; r++) {
          const src = (y0 + band.y0 + r) * widthBytes + band.bx0;
          chunk.set(bytes.subarray(src, src + bw), r * bw);
        }
        parts.push(ascii(`BITMAP ${band.bx0 * 8},${band.y0},${bw},${bh},0,`), chunk, ascii("\r\n"));
      }
      parts.push(ascii("PRINT 1,1\r\n"));
    } else {
      parts.push(ascii(`BITMAP 0,0,${widthBytes},${rows},0,`), slice, ascii("\r\nPRINT 1,1\r\n"));
    }
  }
  return concat(parts);
}

/**
 * Muat dataURL PNG, skala ke lebar `widthDots` (tinggi proporsional), kembalikan
 * { gray, w, h }. Latar transparan jadi putih. Butuh DOM (Image + canvas).
 */
export async function dataUrlToGray(dataUrl, widthDots) {
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Gagal memuat gambar struk"));
    el.src = dataUrl;
  });
  const w = widthDots;
  const h = Math.max(1, Math.round((img.naturalHeight * w) / img.naturalWidth));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  return { gray: rgbaToGray(data, w, h), w, h };
}
