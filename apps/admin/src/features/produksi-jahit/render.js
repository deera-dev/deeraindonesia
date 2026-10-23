import qrcode from "qrcode-generator";

const LOGO_URL = "/kartu-jahit-logo-qr.svg";

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

const odd = (v) => (Math.round(v) % 2 === 0 ? Math.round(v) + 1 : Math.round(v));

export async function drawQr(canvas, text, sizePx = 240) {
  const logo = await loadLogo();
  // Error correction level H (~30%) supaya QR tetap terbaca walau area
  // tengah ditutup logo Deera, sama seperti barcode produk di cetak-label.
  const qr = qrcode(0, "H");
  qr.addData(text);
  qr.make();
  const n = qr.getModuleCount();
  const mod = Math.max(1, Math.floor(sizePx / n));
  const size = mod * n;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, size, size);

  let kx0 = 0;
  let kx1 = -1;
  let ky0 = 0;
  let ky1 = -1;
  if (logo) {
    const kw = odd(n * 0.26);
    const kh = odd(kw * (logo.naturalHeight / logo.naturalWidth));
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
      ctx.fillRect(c * mod, r * mod, mod, mod);
    }
  }

  if (logo) {
    const boxW = (kx1 - kx0 + 1) * mod;
    const boxH = (ky1 - ky0 + 1) * mod;
    const scale = Math.min(boxW / logo.naturalWidth, boxH / logo.naturalHeight);
    const lw = Math.round(logo.naturalWidth * scale);
    const lh = Math.round(logo.naturalHeight * scale);
    const cx = ((kx0 + kx1 + 1) / 2) * mod;
    const cy = ((ky0 + ky1 + 1) / 2) * mod;
    ctx.fillStyle = "#fff";
    ctx.fillRect(Math.round(cx - lw / 2 - 2), Math.round(cy - lh / 2 - 2), lw + 4, lh + 4);
    ctx.drawImage(logo, Math.round(cx - lw / 2), Math.round(cy - lh / 2), lw, lh);
  }

  return ctx;
}

export async function qrDataUrl(text, sizePx = 240) {
  const canvas = document.createElement("canvas");
  await drawQr(canvas, text, sizePx);
  return canvas.toDataURL("image/png");
}
