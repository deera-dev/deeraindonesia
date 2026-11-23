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
