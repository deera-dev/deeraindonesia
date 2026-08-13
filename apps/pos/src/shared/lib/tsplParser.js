/**
 * tsplParser.js — parser TSPL mentah → daftar operasi gambar ("ops").
 *
 * HANYA dipakai untuk preview visual di UI (TsplPrintPreview.jsx, tab
 * "Preview" di Struk.jsx) — sama sekali TIDAK dipakai di jalur print asli
 * (BLE/writeBle di useTsplPrinter.js). Tujuannya: pengguna bisa lihat kira-kira
 * seperti apa struk akan tercetak ("model struk tanpa logo" — sesuai command
 * TSPL yang benar-benar dikirim ke printer, bukan tampilan web StrukContent.jsx
 * yang ada logo/gambar) TANPA harus menyambungkan printer Bluetooth.
 *
 * Input: string hasil previewTspl()/generateTsplString() (useTsplPrinter.js).
 * Output: { widthMm, heightMm, gapMm, ops }
 *   - ops[].type === "text"    → { x, y, font, xm, ym, text }
 *   - ops[].type === "bar"     → { x, y, w, h }  (blok hitam solid)
 *   - ops[].type === "reverse" → { x, y, w, h }  (invert warna area ini)
 * Semua koordinat/ukuran dalam satuan dot — SAMA PERSIS dengan yang dipakai
 * generateTsplString() saat generate command, supaya posisi di preview
 * konsisten dengan cetakan asli.
 */
export function parseTsplOps(tsplText) {
  const lines = String(tsplText ?? "")
    .split(/\r\n/)
    .filter(Boolean);

  let widthMm = 0;
  let heightMm = 0;
  let gapMm = 0;
  const ops = [];

  for (const line of lines) {
    let m;
    if ((m = line.match(/^SIZE (\d+(?:\.\d+)?) mm,(\d+(?:\.\d+)?) mm$/))) {
      widthMm = Number(m[1]);
      heightMm = Number(m[2]);
      continue;
    }
    if ((m = line.match(/^GAP (\d+(?:\.\d+)?) mm,0 mm$/))) {
      gapMm = Number(m[1]);
      continue;
    }
    if ((m = line.match(/^TEXT (\d+),(\d+),"(\d+)",0,(\d+),(\d+),"(.*)"$/))) {
      ops.push({
        type: "text",
        x: Number(m[1]),
        y: Number(m[2]),
        font: m[3],
        xm: Number(m[4]),
        ym: Number(m[5]),
        text: m[6],
      });
      continue;
    }
    if ((m = line.match(/^BAR (\d+),(\d+),(\d+),(\d+)$/))) {
      ops.push({ type: "bar", x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) });
      continue;
    }
    if ((m = line.match(/^REVERSE (\d+),(\d+),(\d+),(\d+)$/))) {
      ops.push({ type: "reverse", x: Number(m[1]), y: Number(m[2]), w: Number(m[3]), h: Number(m[4]) });
      continue;
    }
    // Baris lain (CLS, PRINT 1,1, dll) sengaja diabaikan — tidak relevan
    // untuk preview visual.
  }

  return { widthMm, heightMm, gapMm, ops };
}
