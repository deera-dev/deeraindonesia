import { describe, it, expect } from "vitest";
import {
  rgbaToGray,
  binarize,
  ditherFloydSteinberg,
  packBitmap,
  grayToBitmap,
  buildImageTspl,
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
