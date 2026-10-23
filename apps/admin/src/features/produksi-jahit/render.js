import qrcode from "qrcode-generator";

export function drawQr(canvas, text, sizePx = 240) {
  const qr = qrcode(0, "M");
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
  ctx.fillStyle = "#000";
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(c * mod, r * mod, mod, mod);
    }
  }
  return ctx;
}

export function qrDataUrl(text, sizePx = 240) {
  const canvas = document.createElement("canvas");
  drawQr(canvas, text, sizePx);
  return canvas.toDataURL("image/png");
}
