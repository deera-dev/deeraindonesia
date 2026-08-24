/**
 * TsplPrintPreview.jsx — preview visual struk SESUAI command TSPL yang benar-
 * benar dikirim ke printer thermal (bukan tampilan web StrukContent.jsx yang
 * ada logo/gambar — printer TSPL cuma bisa TEXT/BAR/REVERSE, tanpa foto).
 *
 * Dipakai di tab "Preview" pada panel "Preview cetak" (Struk.jsx) supaya user
 * bisa lihat kira-kira hasil cetak sebelum benar-benar print, tanpa perlu
 * nyambungin printer Bluetooth.
 *
 * Multi-halaman: kertas "gapped" (pre-cut, gap tetap) bisa menghasilkan LEBIH
 * dari 1 label fisik kalau konten struk lebih panjang dari 1 label (lihat
 * pageBreak() di useTsplPrinter.js) — dulu preview cuma gambar halaman
 * pertama, jadi kelihatan "terpotong" tanpa ada cara melihat sisanya
 * (keluhan Denny 2026-08). Sekarang SETIAP halaman digambar sbg <canvas>
 * terpisah, ditumpuk vertikal, dgn label "Halaman X dari Y" kalau lebih dari
 * 1 — jadi preview selalu menunjukkan PERSIS berapa banyak label fisik yang
 * akan tercetak dan isi masing-masing.
 *
 * Alur: previewTspl() (useTsplPrinter.js) → parseTsplOps() (tsplParser.js,
 * mengembalikan array `pages`) → tiap halaman digambar ke <canvas> sendiri
 * pakai koordinat dot yang SAMA PERSIS dgn cetakan asli.
 */
import { useEffect, useRef } from "react";
import { previewTspl, PAPER_WIDTHS, FONT } from "../hooks/useTsplPrinter";
import { parseTsplOps } from "../lib/tsplParser";

function drawPage(ctx, canvas, ops) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ops.forEach((op) => {
    if (op.type === "bar") {
      ctx.fillStyle = "#000";
      ctx.fillRect(op.x, op.y, op.w, op.h);
      return;
    }
    if (op.type === "bitmap" && op.data) {
      // Logo asli (permintaan Denny 2026-08 "coba tambahkan logo asli") —
      // unpack bit demi bit dari `data` (binary string mentah dari
      // tsplParser.js, MSB-first per byte, row-major) jadi pixel kanvas.
      // widthPx dihitung dari widthBytes*8 krn command BITMAP TSPL sendiri
      // TIDAK menyimpan lebar pixel eksplisit (cuma widthBytes) — sama spt
      // yang benar2 "dilihat" printer fisik saat mencetak.
      try {
        const widthPx = op.widthBytes * 8;
        const imgData = ctx.createImageData(widthPx, op.height);
        const d = imgData.data;
        for (let row = 0; row < op.height; row++) {
          for (let col = 0; col < widthPx; col++) {
            const byte = op.data.charCodeAt(row * op.widthBytes + (col >> 3)) & 0xff;
            const bit = (byte >> (7 - (col % 8))) & 1; // 1 = cetak hitam
            const i = (row * widthPx + col) * 4;
            d[i] = 0;
            d[i + 1] = 0;
            d[i + 2] = 0;
            d[i + 3] = bit ? 255 : 0; // transparan kalau bit 0 (tidak dicetak)
          }
        }
        ctx.putImageData(imgData, op.x, op.y);
      } catch {
        /* createImageData bisa gagal di sebagian environment (mis. jsdom
           tanpa polyfill canvas penuh) — abaikan, bukan fatal, sama spt
           getImageData di blok "reverse" di bawah. */
      }
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
}

function TsplPageCanvas({ page, widthDots, testId }) {
  const canvasRef = useRef(null);
  const density = page.widthMm ? widthDots / page.widthMm : 8;
  const heightDots = Math.max(100, Math.round((page.heightMm || 0) * density));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    // jsdom (unit test) atau browser tanpa dukungan canvas 2d → skip gambar,
    // elemen <canvas>-nya sendiri tetap ter-render (lihat data-testid di bawah).
    if (!ctx) return;
    drawPage(ctx, canvas, page.ops);
  }, [page, widthDots, heightDots]);

  return (
    <canvas
      ref={canvasRef}
      width={widthDots}
      height={heightDots}
      data-testid={testId}
      style={{ width: "100%", height: "auto", display: "block", background: "#fff" }}
    />
  );
}

export default function TsplPrintPreview({ sale, labelType, paperWidth }) {
  const tsplText = previewTspl(sale, labelType, paperWidth);
  const parsed = parseTsplOps(tsplText);
  const widthDots = PAPER_WIDTHS[paperWidth]?.dots ?? PAPER_WIDTHS["78"].dots;
  const pages = parsed.pages?.length ? parsed.pages : [parsed];
  const isMultiPage = pages.length > 1;

  return (
    <div>
      {pages.map((page, i) => (
        <div key={i} style={isMultiPage ? { marginBottom: 16 } : undefined}>
          {isMultiPage && (
            <p
              style={{
                fontSize: 11,
                textAlign: "center",
                color: "#888",
                margin: "0 0 4px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
              }}
            >
              Halaman {i + 1} dari {pages.length}
            </p>
          )}
          <TsplPageCanvas
            page={page}
            widthDots={widthDots}
            testId={i === 0 ? "tspl-print-preview-canvas" : `tspl-print-preview-canvas-${i}`}
          />
        </div>
      ))}
    </div>
  );
}
