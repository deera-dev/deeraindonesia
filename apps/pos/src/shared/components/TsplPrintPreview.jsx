/**
 * TsplPrintPreview.jsx — preview visual struk SESUAI command TSPL yang benar-
 * benar dikirim ke printer thermal (bukan tampilan web StrukContent.jsx yang
 * ada logo/gambar — printer TSPL cuma bisa TEXT/BAR/REVERSE, tanpa foto).
 *
 * Dipakai di tab "Preview" pada panel "Preview cetak" (Struk.jsx) supaya user
 * bisa lihat kira-kira hasil cetak sebelum benar-benar print, tanpa perlu
 * nyambungin printer Bluetooth.
 *
 * Alur: previewTspl() (useTsplPrinter.js) → parseTsplOps() (tsplParser.js)
 * → digambar ke <canvas> pakai koordinat dot yang SAMA PERSIS dgn cetakan asli.
 */
import { useEffect, useRef } from "react";
import { previewTspl, PAPER_WIDTHS, FONT } from "../hooks/useTsplPrinter";
import { parseTsplOps } from "../lib/tsplParser";

export default function TsplPrintPreview({ sale, labelType, paperWidth }) {
  const canvasRef = useRef(null);
  const tsplText = previewTspl(sale, labelType, paperWidth);
  const parsed = parseTsplOps(tsplText);

  const widthDots = PAPER_WIDTHS[paperWidth]?.dots ?? PAPER_WIDTHS["78"].dots;
  const density = parsed.widthMm ? widthDots / parsed.widthMm : 8;
  const heightDots = Math.max(100, Math.round((parsed.heightMm || 0) * density));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // jsdom (unit test) atau browser tanpa dukungan canvas 2d → skip gambar,
    // elemen <canvas>-nya sendiri tetap ter-render (lihat data-testid di bawah).
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    parsed.ops.forEach((op) => {
      if (op.type === "bar") {
        ctx.fillStyle = "#000";
        ctx.fillRect(op.x, op.y, op.w, op.h);
        return;
      }
      if (op.type === "text" && op.text) {
        // Font bitmap printer (mis. "3" = 16×24 dot/karakter) py lebar sel TETAP
        // per karakter — TAPI font browser (Courier New dkk) TIDAK selebar itu
        // di ukuran px yang sama, jadi kalau langsung dispasi pakai charW dari
        // metrik printer, karakter jadi overlap/glitch (bug yang sempat
        // kejadian). Fix: gambar teks penuh dulu di font natural, ukur lebar
        // aslinya (measureText), lalu SCALE horizontal supaya total lebar
        // persis == charW × jumlah karakter (grid asli printer) — hasilnya
        // selalu pas, apa pun font yang dipakai browser.
        const meta = FONT[op.font] ?? FONT["2"];
        const fontPx = meta.h * op.ym;
        const cellW = meta.w * op.xm;
        const targetW = cellW * op.text.length;

        ctx.font = `700 ${fontPx}px "Courier New", monospace`;
        ctx.textBaseline = "top";
        ctx.fillStyle = "#000";
        const naturalW = ctx.measureText(op.text).width || targetW;
        const scaleX = targetW / naturalW;

        ctx.save();
        ctx.translate(op.x, op.y);
        ctx.scale(scaleX, 1);
        ctx.fillText(op.text, 0, 0);
        ctx.restore();
        return;
      }
      if (op.type === "reverse") {
        try {
          const imgData = ctx.getImageData(op.x, op.y, op.w, op.h);
          const d = imgData.data;
          for (let i = 0; i < d.length; i += 4) {
            d[i] = 255 - d[i];
            d[i + 1] = 255 - d[i + 1];
            d[i + 2] = 255 - d[i + 2];
          }
          ctx.putImageData(imgData, op.x, op.y);
        } catch {
          /* getImageData bisa gagal di sebagian environment — abaikan, bukan fatal */
        }
      }
    });
  }, [tsplText, widthDots, heightDots]);

  return (
    <canvas
      ref={canvasRef}
      width={widthDots}
      height={heightDots}
      data-testid="tspl-print-preview-canvas"
      style={{ width: "100%", height: "auto", display: "block", background: "#fff" }}
    />
  );
}
