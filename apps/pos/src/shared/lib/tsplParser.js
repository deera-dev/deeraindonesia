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
 * ── PARSING BITMAP (2026-08, logo asli) ─────────────────────────────────────
 * Sejak command `BITMAP` ditambahkan (logo asli, lihat useTsplPrinter.js),
 * parser TIDAK BISA lagi cuma `text.split(/\r\n/)` di awal seperti dulu —
 * data biner BITMAP (byte 0-255 mentah) SANGAT MUNGKIN mengandung byte 0x0D
 * (\r) / 0x0A (\n) di tengah datanya, yang akan salah kepotong jadi banyak
 * "baris" palsu kalau di-split lebih dulu. Parser sekarang jalan dgn CURSOR
 * (indeks posisi di string mentah, BUKAN array baris): utk command BITMAP,
 * panjang data biner dihitung EKSPLISIT dari widthBytes×height yang ada di
 * header command itu sendiri (bukan dari mencari "\r\n" penutup) — jadi
 * berapa pun byte 0x0D/0x0A yang "kebetulan" ada di tengah data, tidak akan
 * memotong parsing di tempat yang salah. Command lain (TEXT/BAR/REVERSE/dst)
 * tetap aman di-parse per-baris seperti sebelumnya, karena command2 itu
 * murni ASCII (tidak pernah mengandung byte biner mentah).
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
 *   - ops[].type === "bitmap"  → { x, y, widthBytes, height, data } (data =
 *     "binary string" mentah, tiap code unit = 1 byte, MSB-first per baris)
 * Semua koordinat/ukuran dalam satuan dot — SAMA PERSIS dengan yang dipakai
 * generateTsplString() saat generate command, supaya posisi di preview
 * konsisten dengan cetakan asli.
 */

// Header BITMAP dicari via regex TERIKAT PANJANG (bukan cari "\r\n") —
// header-nya sendiri murni ASCII digit/koma jadi aman dibatasi panjang
// pendek (cukup utk 5 angka + separator, generous margin).
const BITMAP_HEADER_RE = /^BITMAP (\d+),(\d+),(\d+),(\d+),(\d+),/;

function parseOnePage(text, startIdx) {
  let widthMm = 0;
  let heightMm = 0;
  let gapMm = 0;
  const ops = [];
  let idx = startIdx;
  let pageEndIdx = text.length;

  while (idx < text.length) {
    // BITMAP: header dulu (ASCII, aman), lalu consume data biner sepanjang
    // widthBytes*height APA ADANYA (tidak peduli isinya, termasuk kalau ada
    // byte yang "kebetulan" sama dengan \r/\n).
    if (text.startsWith("BITMAP ", idx)) {
      const headerSlice = text.slice(idx, idx + 64);
      const m = headerSlice.match(BITMAP_HEADER_RE);
      if (m) {
        const [full, xs, ys, wbs, hs] = m;
        const widthBytes = Number(wbs);
        const height = Number(hs);
        const dataStart = idx + full.length;
        const dataLen = widthBytes * height;
        const data = text.slice(dataStart, dataStart + dataLen);
        ops.push({ type: "bitmap", x: Number(xs), y: Number(ys), widthBytes, height, data });
        idx = dataStart + dataLen;
        if (text.slice(idx, idx + 2) === "\r\n") idx += 2;
        continue;
      }
      // Header tidak match (data korup/terpotong) — jangan infinite loop,
      // anggap sisa teks bukan command yang dikenali & hentikan halaman ini.
      pageEndIdx = idx;
      break;
    }

    const nlIdx = text.indexOf("\r\n", idx);
    if (nlIdx === -1) {
      pageEndIdx = text.length;
      break;
    }
    const line = text.slice(idx, nlIdx);
    idx = nlIdx + 2;
    let mm;
    if ((mm = line.match(/^SIZE (\d+(?:\.\d+)?) mm,(\d+(?:\.\d+)?) mm$/))) {
      widthMm = Number(mm[1]);
      heightMm = Number(mm[2]);
      continue;
    }
    if ((mm = line.match(/^GAP (\d+(?:\.\d+)?) mm,0 mm$/))) {
      gapMm = Number(mm[1]);
      continue;
    }
    if ((mm = line.match(/^TEXT (\d+),(\d+),"(\d+)",0,(\d+),(\d+),"(.*)"$/))) {
      ops.push({
        type: "text",
        x: Number(mm[1]),
        y: Number(mm[2]),
        font: mm[3],
        xm: Number(mm[4]),
        ym: Number(mm[5]),
        text: mm[6],
      });
      continue;
    }
    if ((mm = line.match(/^BAR (\d+),(\d+),(\d+),(\d+)$/))) {
      ops.push({ type: "bar", x: Number(mm[1]), y: Number(mm[2]), w: Number(mm[3]), h: Number(mm[4]) });
      continue;
    }
    if ((mm = line.match(/^REVERSE (\d+),(\d+),(\d+),(\d+)$/))) {
      ops.push({ type: "reverse", x: Number(mm[1]), y: Number(mm[2]), w: Number(mm[3]), h: Number(mm[4]) });
      continue;
    }
    if (/^PRINT 1,1$/.test(line)) {
      // Batas halaman — berhenti di sini, sisa `text` (kalau ada) adalah
      // halaman berikutnya, diproses oleh pemanggil (parseTsplOps).
      pageEndIdx = idx;
      break;
    }
    // Baris lain (CLS, dll) sengaja diabaikan — tidak relevan utk preview.
    pageEndIdx = idx;
  }

  return { page: { widthMm, heightMm, gapMm, ops }, nextIdx: pageEndIdx };
}

export function parseTsplOps(tsplText) {
  const text = String(tsplText ?? "");
  const pages = [];
  let idx = 0;

  while (idx < text.length) {
    const { page, nextIdx } = parseOnePage(text, idx);
    pages.push(page);
    if (nextIdx <= idx) break; // jaga-jaga, cegah infinite loop di input aneh
    idx = nextIdx;
  }

  if (pages.length === 0) {
    pages.push({ widthMm: 0, heightMm: 0, gapMm: 0, ops: [] });
  }

  return { ...pages[0], pages };
}
