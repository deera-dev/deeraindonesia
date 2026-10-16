/**
 * render.js — gambar label 40×30 mm (320×240 titik, 203 dpi) ke canvas: QR di atas,
 * teks "KODE UKURAN" di bawah. Butuh DOM (canvas).
 */
import qrcode from "qrcode-generator";
import { LABEL_W, LABEL_H, labelText, labelUrl } from "./utils";

const TEXT_H = 34; // tinggi baris teks (titik)
const PAD = 4;

export function drawLabel(canvas, { kode, size }) {
  canvas.width = LABEL_W;
  canvas.height = LABEL_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);

  const qr = qrcode(0, "M");
  qr.addData(labelUrl(kode));
  qr.make();
  const n = qr.getModuleCount();
  // QR dibuat sebesar mungkin (setinggi area di atas teks). Modul tidak harus bulat:
  // tepi tiap modul dibulatkan ke titik terdekat, jadi ukuran modul 6–7 titik saja berbeda.
  const qrSize = LABEL_H - TEXT_H - PAD * 2;
  const m = qrSize / n;
  const x0 = Math.round((LABEL_W - qrSize) / 2);
  const y0 = PAD;
  ctx.fillStyle = "#000";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      const xa = Math.round(c * m);
      const xb = Math.round((c + 1) * m);
      const ya = Math.round(r * m);
      const yb = Math.round((r + 1) * m);
      ctx.fillRect(x0 + xa, y0 + ya, xb - xa, yb - ya);
    }
  }

  const text = labelText(kode, size);
  let fs = 28;
  ctx.font = `bold ${fs}px serif`;
  while (ctx.measureText(text).width > LABEL_W - 16 && fs > 12) {
    fs -= 1;
    ctx.font = `bold ${fs}px serif`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, LABEL_W / 2, LABEL_H - TEXT_H / 2);
  return ctx;
}

export function labelDataUrl({ kode, size }) {
  const canvas = document.createElement("canvas");
  drawLabel(canvas, { kode, size });
  return canvas.toDataURL("image/png");
}

/** Gray 0-255 label (untuk di-raster ke bitmap printer). */
export function labelGray({ kode, size }) {
  const canvas = document.createElement("canvas");
  const ctx = drawLabel(canvas, { kode, size });
  const { data } = ctx.getImageData(0, 0, LABEL_W, LABEL_H);
  return { data, w: LABEL_W, h: LABEL_H };
}
