
export const LABEL = { widthMm: 40, heightMm: 30, gapMm: 2, dotsPerMm: 8 };
export const LABEL_W = LABEL.widthMm * LABEL.dotsPerMm;
export const LABEL_H = LABEL.heightMm * LABEL.dotsPerMm;
export const MAX_COPIES = 999;

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
