/**
 * tsplParser.js — parser TSPL mentah → daftar operasi gambar ("ops"), per
 * HALAMAN (label fisik).
 *
 * HANYA dipakai untuk preview visual di UI (TsplPrintPreview.jsx, tab
 * "Preview" di Struk.jsx) — sama sekali TIDAK dipakai di jalur print asli
 * (BLE/writeBle di useTsplPrinter.js). Tujuannya: pengguna bisa lihat kira-kira
 * seperti apa struk akan tercetak ("model struk tanpa logo" — sesuai command
 * TSPL yang benar-benar dikirim ke printer, bukan tampilan web StrukContent.jsx
 * yang ada logo/gambar) TANPA harus menyambungkan printer Bluetooth.
 *
 * Multi-halaman: untuk kertas "gapped" (pre-cut, gap tetap), generateTsplString()
 * bisa mengirim BEBERAPA blok SIZE/GAP/CLS/…/PRINT berurutan sekaligus (kalau
 * konten struk lebih panjang dari 1 label fisik — lihat pageBreak() di
 * useTsplPrinter.js) — masing-masing blok mewakili SATU label fisik. Parser
 * ini membaca "PRINT 1,1" sebagai PENANDA BATAS HALAMAN dan mengembalikan
 * SETIAP halaman sbg entry terpisah di array `pages`, supaya UI bisa
 * menampilkan "halaman berikutnya" dengan benar (bukan cuma halaman
 * pertama yang keliatan terpotong).
 *
 * Input: string hasil previewTspl()/generateTsplString() (useTsplPrinter.js).
 * Output: { widthMm, heightMm, gapMm, ops, pages }
 *   - Field widthMm/heightMm/gapMm/ops TETAP ada di level atas (mirror
 *     pages[0]) — backward-compatible dgn kode/test lama yg cuma baca 1
 *     halaman (mis. mode "continuous", yang SELALU 1 halaman).
 *   - pages[].{ widthMm, heightMm, gapMm, ops } — satu entry per halaman.
 *   - ops[].type === "text"    → { x, y, font, xm, ym, text }
 *   - ops[].type === "bar"     → { x, y, w, h }  (blok hitam solid)
 *   - ops[].type === "reverse" → { x, y, w, h }  (invert warna area ini)
 * Semua koordinat/ukuran dalam satuan dot — SAMA PERSIS dengan yang dipakai
 * generateTsplString() saat generate command, supaya posisi di preview
 * konsisten dengan cetakan asli.
 */
function parseOnePage(lines) {
  let widthMm = 0;
  let heightMm = 0;
  let gapMm = 0;
  const ops = [];
  let consumed = 0;

  for (let i = 0; i < lines.length; i++) {
    consumed = i + 1;
    const line = lines[i];
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
    if (/^PRINT 1,1$/.test(line)) {
      // Batas halaman — berhenti di sini, sisa `lines` (kalau ada) adalah
      // halaman berikutnya, diproses oleh pemanggil (parseTsplOps).
      break;
    }
    // Baris lain (CLS, dll) sengaja diabaikan — tidak relevan utk preview.
  }

  return { page: { widthMm, heightMm, gapMm, ops }, consumed };
}

export function parseTsplOps(tsplText) {
  const lines = String(tsplText ?? "")
    .split(/\r\n/)
    .filter(Boolean);

  const pages = [];
  let idx = 0;
  while (idx < lines.length) {
    const { page, consumed } = parseOnePage(lines.slice(idx));
    pages.push(page);
    if (consumed <= 0) break; // jaga-jaga, cegah infinite loop di input aneh
    idx += consumed;
  }

  if (pages.length === 0) {
    pages.push({ widthMm: 0, heightMm: 0, gapMm: 0, ops: [] });
  }

  return { ...pages[0], pages };
}
