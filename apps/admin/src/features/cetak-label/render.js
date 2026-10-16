/**
 * render.js — gambar label 40×30 mm (320×240 titik, 203 dpi) ke canvas: QR di atas,
 * teks "KODE UKURAN" di bawah. Butuh DOM (canvas).
 */
import qrcode from "qrcode-generator";
import { LABEL_W, LABEL_H, labelText, labelUrl } from "./utils";

const TEXT_H = 34; // tinggi baris teks (titik)
const PAD = 4;
const FONT = "Braise"; // font display Deera (sama dengan judul kode di aplikasi)
const LOGO_URL = "/logo-label.png"; // logo hitam polos (tajam saat dicetak 1-bit)
const LOGO_SIZE = 56; // tinggi logo di tengah QR (titik)

let logoPromise = null;
function loadLogo() {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null); // tanpa logo pun label tetap bisa dicetak
      setTimeout(() => resolve(null), 3000); // jaga-jaga: jangan menggantung bila gambar tak kunjung termuat
      img.src = LOGO_URL;
    });
  }
  return logoPromise;
}

async function ensureFont() {
  try {
    await document.fonts?.load(`28px ${FONT}`);
  } catch {
    /* pakai serif bawaan */
  }
}

export async function drawLabel(canvas, { kode, size }) {
  await ensureFont();
  const logo = await loadLogo();
  canvas.width = LABEL_W;
  canvas.height = LABEL_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, LABEL_W, LABEL_H);

  const qr = qrcode(0, "H");
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

  // Logo Deera di tengah QR (ECC level H menjaga QR tetap terbaca): kotak putih + logo.
  if (logo) {
    const lh = LOGO_SIZE;
    const lw = Math.round((logo.naturalWidth / logo.naturalHeight) * lh);
    const cx = x0 + qrSize / 2;
    const cy = y0 + qrSize / 2;
    const pad = 5;
    ctx.fillStyle = "#fff";
    ctx.fillRect(Math.round(cx - lw / 2 - pad), Math.round(cy - lh / 2 - pad), lw + pad * 2, lh + pad * 2);
    ctx.drawImage(logo, Math.round(cx - lw / 2), Math.round(cy - lh / 2), lw, lh);
  }

  const text = labelText(kode, size);
  let fs = 30;
  ctx.font = `${fs}px ${FONT}, serif`;
  while (ctx.measureText(text).width > LABEL_W - 16 && fs > 12) {
    fs -= 1;
    ctx.font = `${fs}px ${FONT}, serif`;
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, LABEL_W / 2, LABEL_H - TEXT_H / 2);
  return ctx;
}

export async function labelDataUrl({ kode, size }) {
  const canvas = document.createElement("canvas");
  await drawLabel(canvas, { kode, size });
  return canvas.toDataURL("image/png");
}

/** Gray 0-255 label (untuk di-raster ke bitmap printer). */
export async function labelGray({ kode, size }) {
  const canvas = document.createElement("canvas");
  const ctx = await drawLabel(canvas, { kode, size });
  const { data } = ctx.getImageData(0, 0, LABEL_W, LABEL_H);
  return { data, w: LABEL_W, h: LABEL_H };
}
