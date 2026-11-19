import { describe, it, expect } from "vitest";
import { buildImageEscPos } from "./escposImage";
import { MAX_PAGE_BYTES } from "./tsplImage";

function gsV0Blocks(out) {
  const blocks = [];
  for (let i = 0; i + 8 <= out.length; i++) {
    if (out[i] === 0x1d && out[i + 1] === 0x76 && out[i + 2] === 0x30 && out[i + 3] === 0x00) {
      const widthBytes = out[i + 4] | (out[i + 5] << 8);
      const rows = out[i + 6] | (out[i + 7] << 8);
      blocks.push({ at: i, widthBytes, rows, dataBytes: widthBytes * rows });
    }
  }
  return blocks;
}

// ESC J n ("print and feed paper n dots") — dipakai utk ngisi jarak kosong
// antar section struk hasil trim findBands, lihat feedForBlankRows.
function escJFeeds(out) {
  const feeds = [];
  for (let i = 0; i + 3 <= out.length; i++) {
    if (out[i] === 0x1b && out[i + 1] === 0x4a) feeds.push(out[i + 2]);
  }
  return feeds;
}

describe("buildImageEscPos", () => {
  it("diawali ESC @ (init) lalu GS v 0 dengan lebar/tinggi little-endian, diakhiri feed baris", () => {
    const bitmap = { widthBytes: 2, height: 3, bytes: new Uint8Array(6).fill(0xaa), whiteByte: 0x00 };
    const out = buildImageEscPos(bitmap, { feedLines: 2 });
    expect(Array.from(out.subarray(0, 2))).toEqual([0x1b, 0x40]);
    expect(Array.from(out.subarray(2, 10))).toEqual([0x1d, 0x76, 0x30, 0x00, 2, 0, 3, 0]);
    expect(Array.from(out.subarray(10, 16))).toEqual([0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa]);
    expect(Array.from(out.subarray(16))).toEqual([0x0a, 0x0a]);
  });

  it("lebar/tinggi > 255 dikodekan 2 byte little-endian dengan benar", () => {
    const widthBytes = 300;
    const height = 260;
    // Isi BUKAN whiteByte supaya dianggap konten (bukan kosong) — kalau
    // disamakan dgn whiteByte malah ke-trim habis, tidak ada blok GS v0 sama
    // sekali (lihat tes trim di bawah).
    const bitmap = { widthBytes, height, bytes: new Uint8Array(widthBytes * height).fill(0xaa), whiteByte: 0x00 };
    const out = buildImageEscPos(bitmap, { feedLines: 0 });
    const blocks = gsV0Blocks(out);
    expect(blocks.length).toBeGreaterThan(0);
    const header = out.subarray(blocks[0].at, blocks[0].at + 8);
    expect(header[4]).toBe(widthBytes & 0xff);
    expect(header[5]).toBe((widthBytes >> 8) & 0xff);
    expect(header[6]).toBe(height & 0xff);
    expect(header[7]).toBe((height >> 8) & 0xff);
  });

  it("struk panjang dipecah jadi beberapa blok GS v 0 (buffer printer terbatas), tanpa kehilangan data", () => {
    const widthBytes = 78;
    const rows = Math.floor(MAX_PAGE_BYTES / widthBytes) * 2 + 100;
    const bytes = new Uint8Array(widthBytes * rows).fill(0xaa);
    const bitmap = { widthBytes, height: rows, bytes, whiteByte: 0x00 };
    const out = buildImageEscPos(bitmap);
    const blocks = gsV0Blocks(out);
    expect(blocks.length).toBeGreaterThanOrEqual(3);
    expect(blocks.reduce((s, b) => s + b.dataBytes, 0)).toBe(widthBytes * rows);
  });

  it("struk kecil (satu band konten) tetap satu blok GS v 0", () => {
    const bitmap = { widthBytes: 78, height: 50, bytes: new Uint8Array(78 * 50).fill(0xaa), whiteByte: 0x00 };
    const out = buildImageEscPos(bitmap);
    expect(gsV0Blocks(out).length).toBe(1);
  });
});

describe("buildImageEscPos - trim baris kosong (kirim lebih cepat)", () => {
  function makeRows(widthBytes, rowSpecs, whiteByte = 0x00) {
    // rowSpecs: array "0".repeat(n) utk baris kosong, atau byte isi (mis. 0xaa) utk baris berisi.
    const bytes = new Uint8Array(widthBytes * rowSpecs.length);
    rowSpecs.forEach((fill, r) => bytes.fill(fill, r * widthBytes, (r + 1) * widthBytes));
    return { widthBytes, height: rowSpecs.length, bytes, whiteByte };
  }

  // BUG FIX (November 2026, laporan admin: lebar struk sudah pas tapi
  // jarak antar section kerasa mepet) — baris kosong sekarang diganti
  // "ESC J n" (feed TEPAT n dots), bukan LF polos yg asumsinya meleset di
  // printer ini (lihat catatan di feedForBlankRows).
  it("baris kosong di awal/tengah/akhir diganti ESC J (feed presisi per-dot), BUKAN ikut dikirim sbg data GS v0", () => {
    const blank = new Array(10).fill(0x00);
    const isi = new Array(5).fill(0xaa);
    const bitmap = makeRows(4, [...blank, ...isi, ...blank, ...isi, ...blank]);
    const out = buildImageEscPos(bitmap, { feedLines: 0 });
    const blocks = gsV0Blocks(out);
    expect(blocks.length).toBe(2);
    expect(blocks[0].rows).toBe(5);
    expect(blocks[1].rows).toBe(5);
    expect(blocks.reduce((s, b) => s + b.dataBytes, 0)).toBe(4 * 10); // cuma 2×5 baris isi, bukan 25 baris total
    expect(escJFeeds(out)).toEqual([10, 10, 10]); // 3 gap kosong, masing2 persis 10 dots
  });

  it("gambar kosong seluruhnya -> tanpa blok GS v0 sama sekali, cuma ESC J + feed akhir (tear-off) polos", () => {
    const bitmap = { widthBytes: 4, height: 40, bytes: new Uint8Array(4 * 40).fill(0x00), whiteByte: 0x00 };
    const out = buildImageEscPos(bitmap, { feedLines: 2 });
    expect(gsV0Blocks(out)).toHaveLength(0);
    expect(escJFeeds(out)).toEqual([40]);
    // feedLines penutup (tear-off, bukan konten) tetap LF polos
    expect(Array.from(out.subarray(out.length - 2))).toEqual([0x0a, 0x0a]);
  });

  it("gap kosong > 255 dots dipecah jadi beberapa ESC J (maks 255/perintah), totalnya tetap pas", () => {
    const bitmap = { widthBytes: 4, height: 600, bytes: new Uint8Array(4 * 600).fill(0x00), whiteByte: 0x00 };
    const out = buildImageEscPos(bitmap, { feedLines: 0 });
    const feeds = escJFeeds(out);
    expect(feeds.every((n) => n <= 255)).toBe(true);
    expect(feeds.reduce((a, b) => a + b, 0)).toBe(600);
  });

  it("trim mengurangi total byte terkirim dibanding tanpa trim, utk struk dgn banyak spasi kosong", () => {
    const blank = new Array(50).fill(0x00);
    const isi = new Array(10).fill(0xaa);
    const bitmap = makeRows(78, [...blank, ...isi, ...blank]);
    const trimmed = buildImageEscPos(bitmap, { feedLines: 0, trim: true });
    const untrimmed = buildImageEscPos(bitmap, { feedLines: 0, trim: false });
    expect(trimmed.length).toBeLessThan(untrimmed.length);
  });

  it("trim: false -> perilaku lama (semua baris dikirim mentah2, tanpa pangkas blank)", () => {
    const bitmap = { widthBytes: 78, height: 50, bytes: new Uint8Array(78 * 50).fill(0x00), whiteByte: 0x00 };
    const out = buildImageEscPos(bitmap, { trim: false, feedLines: 0 });
    const blocks = gsV0Blocks(out);
    expect(blocks.length).toBe(1);
    expect(blocks[0].rows).toBe(50);
  });
});

// ESC $ nL nH ("set absolute print position") — dipakai sebelum tiap blok
// GS v0 kalau cropColumns aktif, lihat buildAbsolutePosition.
function escDollarPositions(out) {
  const positions = [];
  for (let i = 0; i + 4 <= out.length; i++) {
    if (out[i] === 0x1b && out[i + 1] === 0x24) positions.push(out[i + 2] | (out[i + 3] << 8));
  }
  return positions;
}

// Eksperimen admin (November 2026, "diakali kayak TSPL" — TSPL BITMAP
// pangkas kiri-kanan per bagian konten lewat offset X bawaannya, GS v 0
// ESC/POS tidak punya itu) — cropColumns pangkas kolom kosong jg, bukan
// cuma baris, lewat ESC $ + GS v0 yang lebih sempit. TIDAK aktif default
// krn ESC $ di mode grafis belum tentu didukung identik di semua klon
// ESC/POS murah (lihat catatan di escposImage.js).
describe("buildImageEscPos - cropColumns (eksperimen pangkas kiri-kanan)", () => {
  function makeColBand(widthBytes, rows, { bx0, bx1, fillA = 0xaa, fillB = 0xbb }) {
    const bytes = new Uint8Array(widthBytes * rows).fill(0x00);
    for (let r = 0; r < rows; r++) {
      for (let b = bx0; b < bx1; b++) {
        bytes[r * widthBytes + b] = b === bx0 ? fillA : fillB;
      }
    }
    return { widthBytes, height: rows, bytes, whiteByte: 0x00 };
  }

  it("default (cropColumns tidak diisi) -> tidak ada ESC $ sama sekali, lebar GS v0 tetap penuh (perilaku lama tidak berubah)", () => {
    const bitmap = makeColBand(10, 6, { bx0: 3, bx1: 5 });
    const out = buildImageEscPos(bitmap, { feedLines: 0 });
    expect(escDollarPositions(out)).toEqual([]);
    expect(gsV0Blocks(out)[0].widthBytes).toBe(10);
  });

  it("cropColumns: true -> ESC $ diposisikan ke bx0*8, lebar GS v0 dipangkas ke lebar kontennya saja", () => {
    const bitmap = makeColBand(10, 6, { bx0: 3, bx1: 5 });
    const out = buildImageEscPos(bitmap, { feedLines: 0, cropColumns: true });
    expect(escDollarPositions(out)).toEqual([3 * 8]);
    const blocks = gsV0Blocks(out);
    expect(blocks.length).toBe(1);
    expect(blocks[0].widthBytes).toBe(2); // bx1(5) - bx0(3)
    expect(blocks[0].rows).toBe(6);
  });

  it("cropColumns: true -> data yg dikirim persis kolom kontennya saja, urutan per baris tetap benar", () => {
    const bitmap = makeColBand(10, 3, { bx0: 3, bx1: 5, fillA: 0xaa, fillB: 0xbb });
    const out = buildImageEscPos(bitmap, { feedLines: 0, cropColumns: true });
    const block = gsV0Blocks(out)[0];
    const data = out.subarray(block.at + 8, block.at + 8 + block.dataBytes);
    expect(Array.from(data)).toEqual([0xaa, 0xbb, 0xaa, 0xbb, 0xaa, 0xbb]); // 3 baris × [fillA, fillB]
  });

  it("cropColumns: true -> total byte terkirim lebih sedikit drpd cropColumns: false, utk konten yg tidak selebar halaman", () => {
    const bitmap = makeColBand(78, 20, { bx0: 30, bx1: 32 });
    const cropped = buildImageEscPos(bitmap, { feedLines: 0, cropColumns: true });
    const full = buildImageEscPos(bitmap, { feedLines: 0, cropColumns: false });
    expect(cropped.length).toBeLessThan(full.length);
  });

  it("band yg memang selebar halaman (bx0=0) -> ESC $ 0 (no-op), hasil tetap benar", () => {
    const bitmap = { widthBytes: 4, height: 3, bytes: new Uint8Array(12).fill(0xaa), whiteByte: 0x00 };
    const out = buildImageEscPos(bitmap, { feedLines: 0, cropColumns: true });
    expect(escDollarPositions(out)).toEqual([0]);
    expect(gsV0Blocks(out)[0].widthBytes).toBe(4);
  });
});
