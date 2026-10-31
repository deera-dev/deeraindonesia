import qrcode from "qrcode-generator";
import { LABEL_H, LABEL_W, labelText, labelUrl } from "./utils";

const TEXT_H = 34;
const PAD = 4;
const FONT = "bold {size}px Arial, Helvetica, Roboto, sans-serif";
const LOGO_URL = "/logo-label.svg";
const LOGO_ASPECT = 4134 / 2824;

let logoPromise = null;
function loadLogo() {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      setTimeout(() => resolve(null), 3000);
      img.src = LOGO_URL;
    });
  }
  return logoPromise;
}

const fontAt = (size) => FONT.replace("{size}", size);

const odd = (v) => (Math.round(v) % 2 === 0 ? Math.round(v) + 1 : Math.round(v));

export async function drawLabel(canvas, { kode, size }) {
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

  const area = LABEL_H - TEXT_H - PAD * 2;
  const mod = Math.max(1, Math.floor(area / n));
  const qrSize = mod * n;
  const x0 = Math.round((LABEL_W - qrSize) / 2);
  const y0 = PAD + Math.floor((area - qrSize) / 2);

  let kx0 = 0;
  let kx1 = -1;
  let ky0 = 0;
  let ky1 = -1;
  if (logo) {
    const kw = odd(n * 0.27);
    const kh = odd(kw * LOGO_ASPECT);
    kx0 = Math.floor((n - kw) / 2);
    kx1 = kx0 + kw - 1;
    ky0 = Math.floor((n - kh) / 2);
    ky1 = ky0 + kh - 1;
  }

  ctx.fillStyle = "#000";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (!qr.isDark(r, c)) continue;
      if (c >= kx0 && c <= kx1 && r >= ky0 && r <= ky1) continue;
      ctx.fillRect(x0 + c * mod, y0 + r * mod, mod, mod);
    }
  }

  if (logo) {
    const boxW = (kx1 - kx0 + 1 - 2) * mod;
    const boxH = (ky1 - ky0 + 1 - 2) * mod;
    const scale = Math.min(boxW / logo.naturalWidth, boxH / logo.naturalHeight);
    const lw = Math.round(logo.naturalWidth * scale);
    const lh = Math.round(logo.naturalHeight * scale);
    const cx = x0 + ((kx0 + kx1 + 1) / 2) * mod;
    const cy = y0 + ((ky0 + ky1 + 1) / 2) * mod;
    ctx.drawImage(logo, Math.round(cx - lw / 2), Math.round(cy - lh / 2), lw, lh);
  }

  const text = labelText(kode, size);
  let fs = 30;
  ctx.font = fontAt(fs);
  while (ctx.measureText(text).width > LABEL_W - 16 && fs > 12) {
    fs -= 1;
    ctx.font = fontAt(fs);
  }
  ctx.fillStyle = "#000";
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

export async function labelGray({ kode, size }) {
  const canvas = document.createElement("canvas");
  const ctx = await drawLabel(canvas, { kode, size });
  const { data } = ctx.getImageData(0, 0, LABEL_W, LABEL_H);
  return { data, w: LABEL_W, h: LABEL_H };
}
