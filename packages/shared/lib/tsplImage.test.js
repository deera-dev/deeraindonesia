import { describe, it, expect } from "vitest";
import {
  rgbaToGray,
  binarize,
  ditherFloydSteinberg,
  packBitmap,
  grayToBitmap,
  buildImageTspl,
  findBands,
  splitRows,
  MAX_PAGE_BYTES,
} from "./tsplImage";

const text = (u8) => Array.from(u8, (b) => String.fromCharCode(b)).join("");

describe("rgbaToGray", () => {
  it("hitam/putih/transparan (transparan = putih)", () => {
    const rgba = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 0]);
    expect(Array.from(rgbaToGray(rgba, 3, 1))).toEqual([0, 255, 255]);
  });
});

describe("binarize & dither", () => {
  it("binarize: gelap = 1", () => {
    expect(Array.from(binarize(Uint8Array.from([0, 100, 149, 150, 255])))).toEqual([1, 1, 1, 0, 0]);
  });

  it("dither: putih murni -> tanpa titik, hitam murni -> semua titik", () => {
    expect(ditherFloydSteinberg(new Uint8Array(16).fill(255), 4, 4).every((v) => v === 0)).toBe(true);
    expect(ditherFloydSteinberg(new Uint8Array(16).fill(0), 4, 4).every((v) => v === 1)).toBe(true);
  });

  it("dither: abu-abu tengah menghasilkan campuran titik (±50%)", () => {
    const out = ditherFloydSteinberg(new Uint8Array(64 * 64).fill(128), 64, 64);
    const ratio = out.reduce((s, v) => s + v, 0) / out.length;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.6);
  });
});

describe("packBitmap", () => {
  it("MSB-first, hitam = bit 0 (standar TSC), padding kanan putih", () => {
    // 10 px lebar: hitam di x=0 dan x=9
    const black = Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    const r = packBitmap(black, 10, 1);
    expect(r.widthBytes).toBe(2);
    expect(Array.from(r.bytes)).toEqual([0b01111111, 0b10111111]);
  });

  it("invert membalik polaritas (hitam = bit 1, padding bit 0)", () => {
    const black = Uint8Array.from([1, 0, 0, 0, 0, 0, 0, 0, 0, 1]);
    const r = packBitmap(black, 10, 1, { invert: true });
    expect(Array.from(r.bytes)).toEqual([0b10000000, 0b01000000]);
  });

  it("ukuran = widthBytes × tinggi", () => {
    const r = grayToBitmap(new Uint8Array(623 * 5).fill(255), 623, 5, { algorithm: "binary" });
    expect(r.widthBytes).toBe(78);
    expect(r.bytes.length).toBe(78 * 5);
  });
});

describe("buildImageTspl", () => {
  const bitmap = { widthBytes: 78, height: 20, bytes: new Uint8Array(78 * 20).fill(0xaa) };

  it("continuous: satu job, header SIZE/GAP/CLS + BITMAP + data + PRINT", () => {
    const out = buildImageTspl(bitmap, { paperWidthMm: "78", gapMm: 0 });
    const t = text(out);
    expect(t).toContain("SIZE 78 mm,4 mm");
    expect(t).toContain("GAP 0 mm,0 mm");
    expect(t).toContain("CLS\r\n");
    expect(t).toContain("BITMAP 0,0,78,20,0,");
    expect(t.endsWith("\r\nPRINT 1,1\r\n")).toBe(true);
    // data biner utuh (byte >= 128 tidak rusak)
    expect(out.filter((b) => b === 0xaa).length).toBe(78 * 20);
  });

  it("gapped: dipotong per label 150mm (1200 baris), tiap potongan label lengkap", () => {
    const tall = { widthBytes: 2, height: 2500, bytes: new Uint8Array(2 * 2500) };
    const t = text(buildImageTspl(tall, { paperWidthMm: "78", gapMm: 2, labelHeightMm: 150 }));
    expect((t.match(/PRINT 1,1/g) || []).length).toBe(3);
    expect(t).toContain("BITMAP 0,0,2,1200,0,");
    expect(t).toContain("BITMAP 0,0,2,100,0,"); // sisa 2500 - 2400
    expect(t).toContain("SIZE 78 mm,150 mm");
    expect(t).toContain("GAP 2 mm,0 mm");
  });
});

describe("trim pita kosong (kirim lebih cepat)", () => {
  // 4 byte lebar, 30 baris putih (0xff) dgn 2 pita berisi
  function make() {
    const bytes = new Uint8Array(4 * 30).fill(0xff);
    for (let r = 2; r < 5; r++) bytes[r * 4 + 1] = 0x00; // pita 1: baris 2-4, kolom-byte 1
    for (let r = 20; r < 22; r++) {
      bytes[r * 4 + 0] = 0x0f;
      bytes[r * 4 + 3] = 0xf0; // pita 2: baris 20-21, kolom-byte 0..3
    }
    return { widthBytes: 4, height: 30, bytes, whiteByte: 0xff };
  }

  it("findBands: baris putih dilewati, kolom dipangkas, celah kecil tidak memecah", () => {
    const b = make();
    expect(findBands(b.bytes, 4, 0, 30)).toEqual([
      { y0: 2, y1: 5, bx0: 1, bx1: 2 },
      { y0: 20, y1: 22, bx0: 0, bx1: 4 },
    ]);
    // celah 3 baris (< 8) tidak memecah pita
    const c = new Uint8Array(4 * 10).fill(0xff);
    c[0] = 0;
    c[4 * 4] = 0;
    expect(findBands(c, 4, 0, 10)).toHaveLength(1);
  });

  it("buildImageTspl trim: hanya BITMAP pita berisi, x/y/lebar benar, byte lebih sedikit", () => {
    const b = make();
    const full = buildImageTspl(b, { paperWidthMm: "78" });
    const out = buildImageTspl(b, { paperWidthMm: "78", trim: true });
    const t = text(out);
    expect(t).toContain("BITMAP 8,2,1,3,0,");
    expect(t).toContain("BITMAP 0,20,4,2,0,");
    expect(t).not.toContain("BITMAP 0,0,4,30");
    expect(t.endsWith("PRINT 1,1\r\n")).toBe(true);
    expect(out.length).toBeLessThan(full.length);
  });

  it("gambar putih seluruhnya tetap menghasilkan label kosong (CLS + PRINT)", () => {
    const blank = { widthBytes: 4, height: 8, bytes: new Uint8Array(32).fill(0xff), whiteByte: 0xff };
    const t = text(buildImageTspl(blank, { paperWidthMm: "78", trim: true }));
    expect(t).not.toContain("BITMAP");
    expect(t).toContain("CLS");
    expect(t).toContain("PRINT 1,1");
  });

  it("invert: putih = 0x00 dihormati", () => {
    const b = { widthBytes: 2, height: 4, bytes: new Uint8Array(8), whiteByte: 0x00 };
    b.bytes[2] = 0xff;
    expect(findBands(b.bytes, 2, 0, 4, 0x00)).toEqual([{ y0: 1, y1: 2, bx0: 0, bx1: 1 }]);
  });
});

describe("struk panjang dipecah (buffer halaman printer terbatas)", () => {
  // 2 byte lebar → maxRows = 100000; pakai maxRows kecil lewat splitRows langsung
  function makeBitmap(rows, widthBytes = 4) {
    const bytes = new Uint8Array(rows * widthBytes).fill(0xff);
    return { widthBytes, height: rows, bytes, whiteByte: 0xff };
  }

  it("splitRows: tiap segmen <= maxRows, kelipatan 8, tanpa kehilangan baris", () => {
    const b = makeBitmap(100);
    const segs = splitRows(b.bytes, 4, 100, 40);
    expect(segs[0][0]).toBe(0);
    expect(segs.at(-1)[1]).toBe(100);
    for (let i = 0; i < segs.length; i++) {
      expect(segs[i][1] - segs[i][0]).toBeLessThanOrEqual(40);
      if (i > 0) expect(segs[i][0]).toBe(segs[i - 1][1]);
      if (i < segs.length - 1) expect(segs[i][1] % 8).toBe(0);
    }
  });

  it("splitRows: memotong di baris putih, bukan di tengah teks", () => {
    const b = makeBitmap(100);
    for (let r = 0; r < 100; r++) if (r !== 32 && r !== 33) b.bytes.fill(0x00, r * 4, r * 4 + 4); // semua gelap kecuali baris 32-33
    const segs = splitRows(b.bytes, 4, 100, 40);
    expect(segs[0][1]).toBe(32);
  });

  it("buildImageTspl kontinu besar → beberapa job SIZE/PRINT, tinggi mm job tengah pas", () => {
    const rows = Math.floor(MAX_PAGE_BYTES / 78) * 2 + 100;
    const bitmap = { widthBytes: 78, height: rows, bytes: new Uint8Array(78 * rows).fill(0xff), whiteByte: 0xff };
    const t = text(buildImageTspl(bitmap, { paperWidthMm: "78", gapMm: 0, trim: true }));
    const jobs = t.match(/PRINT 1,1/g) || [];
    expect(jobs.length).toBeGreaterThanOrEqual(3);
    const heights = [...t.matchAll(/SIZE 78 mm,(\d+) mm/g)].map((m) => Number(m[1]));
    // job tengah = baris/8 mm persis (bilangan bulat)
    const maxRows = Math.floor(Math.floor(MAX_PAGE_BYTES / 78) / 8) * 8;
    expect(heights[0]).toBe(maxRows / 8);
  });

  it("struk kecil tetap satu job", () => {
    const t = text(buildImageTspl(makeBitmap(100, 78), { paperWidthMm: "78" }));
    expect((t.match(/PRINT 1,1/g) || []).length).toBe(1);
  });

  it("job tengah TEAR OFF, job terakhir TEAR ON; struk satu job tanpa perintah TEAR", () => {
    const rows = Math.floor(MAX_PAGE_BYTES / 78) * 2 + 100;
    const bitmap = { widthBytes: 78, height: rows, bytes: new Uint8Array(78 * rows).fill(0xff), whiteByte: 0xff };
    const t = text(buildImageTspl(bitmap, { paperWidthMm: "78", trim: true }));
    const jobs = (t.match(/PRINT 1,1/g) || []).length;
    expect((t.match(/SET TEAR OFF/g) || []).length).toBe(jobs - 1);
    expect((t.match(/SET TEAR ON/g) || []).length).toBe(1);
    expect(t.lastIndexOf("SET TEAR ON")).toBeGreaterThan(t.lastIndexOf("SET TEAR OFF"));
    const small = text(buildImageTspl(makeBitmap(100, 78), { paperWidthMm: "78" }));
    expect(small).not.toContain("TEAR");
  });
});
