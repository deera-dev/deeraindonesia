import { buildImageEscPos } from "@deera/shared/lib/escposImage";

export const LABEL = { widthMm: 40, heightMm: 30, gapMm: 2, dotsPerMm: 8 };
export const LABEL_W = LABEL.widthMm * LABEL.dotsPerMm;
export const LABEL_H = LABEL.heightMm * LABEL.dotsPerMm;
export const MAX_COPIES = 999;

// Protokol bahasa printer BLE, sama seperti di POS (useTsplPrinter.js) —
// TSPL (printer label, bisa "PRINT 1,N" cetak N salinan dari satu bitmap
// yang dikirim) vs ESC/POS (printer struk/label kombo spt CASHCOW CT-321B
// yang tidak mengerti TSPL sama sekali).
export const PRINTER_PROTOCOLS = {
  tspl: { label: "TSPL (printer label)" },
  escpos: { label: "ESC/POS (printer struk)" },
};
export const DEFAULT_PROTOCOL = "tspl";

// BUG FIX (November 2026, laporan admin: "hasil cetak labelnya miring
// tidak ditengah" pakai ESC/POS di printer kombo spt CASHCOW CT-321B) --
// label kita selalu 40mm (320 dot) lebarnya, tapi printer struk/label
// kombo ESC/POS bisa dipakai di beberapa lebar kertas fisik berbeda
// (admin: 40mm mode Label, 80mm mode Struk/Receipt). GS v 0 (ESC/POS
// raster) SELALU cetak mulai dari margin kiri kepala cetak -- kalau
// kertas fisiknya lebih lebar dari 320 dot (mis. 80mm/576 dot), gambar
// label-nya nempel di kiri, bukan di tengah kertas. Lebar dot 576 utk
// 80mm sama persis dengan yang sudah terbukti di POS (useTsplPrinter.js
// ESCPOS_PAPER_WIDTHS) -- printer fisiknya sama (CASHCOW CT-321B dkk).
export const ESCPOS_PAPER_WIDTHS = {
  40: { label: "40mm (mode Label)", dots: LABEL_W },
  80: { label: "80mm (mode Struk/Receipt)", dots: 576 },
};
export const DEFAULT_ESCPOS_PAPER_WIDTH = "40";

// Tengahin bitmap label (320 dot) di dalam kertas fisik yang lebih lebar
// dgn nambah kolom kosong (whiteByte) kiri-kanan secara merata -- kalau
// kertas fisiknya SAMA/lebih sempit dari label (mis. mode Label 40mm),
// tidak ada yang perlu ditambah. Granularity per-byte (8 dot) cukup utk
// mata, tidak perlu presisi per-pixel.
export function centerBitmapInWidth(bitmap, targetWidthDots) {
  const targetWidthBytes = Math.ceil(targetWidthDots / 8);
  const { widthBytes, height, bytes, whiteByte = 0x00 } = bitmap;
  if (targetWidthBytes <= widthBytes) return bitmap;
  const padLeftBytes = Math.floor((targetWidthBytes - widthBytes) / 2);
  const out = new Uint8Array(targetWidthBytes * height).fill(whiteByte);
  for (let r = 0; r < height; r++) {
    out.set(
      bytes.subarray(r * widthBytes, (r + 1) * widthBytes),
      r * targetWidthBytes + padLeftBytes,
    );
  }
  return { widthBytes: targetWidthBytes, height, bytes: out, whiteByte };
}

const SITE = "https://deera.id";

export function labelText(kode, size) {
  return `${String(kode ?? "").replace(/-/g, " ")} ${String(size ?? "")}`.trim().toUpperCase();
}

export function labelUrl(kode) {
  return `${SITE}/q/${encodeURIComponent(kode)}`;
}

export function buildLabelRows(producedBySize) {
  return Object.entries(producedBySize ?? {})
    .filter(([size]) => !!size)
    .map(([size, qty]) => ({ size, produced: Number(qty) || 0, qty: Number(qty) || 0 }));
}

export function clampCopies(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, MAX_COPIES);
}

export function totalCopies(rows) {
  return rows.reduce((s, r) => s + (r.qty || 0), 0);
}

const ascii = (s) => Uint8Array.from(s, (c) => c.charCodeAt(0) & 0xff);

export function buildLabelJob(bitmap, copies) {
  const { widthBytes, height, bytes } = bitmap;
  const head = ascii(
    `SIZE ${LABEL.widthMm} mm,${LABEL.heightMm} mm\r\nGAP ${LABEL.gapMm} mm,0 mm\r\nDIRECTION 0\r\nCLS\r\nBITMAP 0,0,${widthBytes},${height},0,`,
  );
  const tail = ascii(`\r\nPRINT 1,${copies}\r\n`);
  const out = new Uint8Array(head.length + bytes.length + tail.length);
  out.set(head, 0);
  out.set(bytes, head.length);
  out.set(tail, head.length + bytes.length);
  return out;
}

// ESC/POS "GS v 0" tidak punya parameter jumlah salinan spt TSPL
// "PRINT 1,N" -- satu-satunya cara cetak N salinan adalah kirim ulang
// raster yang sama persis N kali (bitmap-nya sendiri dibangun sekali saja
// di sini, bukan di-render ulang, supaya tidak mahal).
export function buildLabelJobEscPos(bitmap, copies) {
  const one = buildImageEscPos(bitmap);
  return concatJobs(new Array(Math.max(0, copies)).fill(one));
}

export function concatJobs(jobs) {
  const total = jobs.reduce((n, j) => n + j.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const j of jobs) {
    out.set(j, off);
    off += j.length;
  }
  return out;
}
