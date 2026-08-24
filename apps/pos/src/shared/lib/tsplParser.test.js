import { describe, it, expect } from "vitest";
import { parseTsplOps } from "./tsplParser";

describe("parseTsplOps", () => {
  it("parses SIZE header into widthMm/heightMm", () => {
    const text = 'SIZE 78 mm,120 mm\r\nGAP 0 mm,0 mm\r\nCLS\r\nPRINT 1,1\r\n';
    const { widthMm, heightMm } = parseTsplOps(text);
    expect(widthMm).toBe(78);
    expect(heightMm).toBe(120);
  });

  it("parses GAP header into gapMm", () => {
    const text = 'SIZE 78 mm,120 mm\r\nGAP 3 mm,0 mm\r\nCLS\r\nPRINT 1,1\r\n';
    expect(parseTsplOps(text).gapMm).toBe(3);
  });

  it("parses a TEXT line into a text op with correct fields", () => {
    const text = 'TEXT 20,128,"2",0,1,1,"Hello World"\r\n';
    const { ops } = parseTsplOps(text);
    expect(ops).toEqual([
      { type: "text", x: 20, y: 128, font: "2", xm: 1, ym: 1, text: "Hello World" },
    ]);
  });

  it("parses xm/ym multipliers correctly (e.g. bold nama pembeli)", () => {
    const text = 'TEXT 20,178,"2",0,2,2,"RIMBI BREBES"\r\n';
    const { ops } = parseTsplOps(text);
    expect(ops[0]).toMatchObject({ xm: 2, ym: 2, text: "RIMBI BREBES" });
  });

  it("parses a BAR line into a bar op", () => {
    const text = "BAR 0,118,800,3\r\n";
    const { ops } = parseTsplOps(text);
    expect(ops).toEqual([{ type: "bar", x: 0, y: 118, w: 800, h: 3 }]);
  });

  it("parses a REVERSE line into a reverse op", () => {
    const text = "REVERSE 0,0,800,84\r\n";
    const { ops } = parseTsplOps(text);
    expect(ops).toEqual([{ type: "reverse", x: 0, y: 0, w: 800, h: 84 }]);
  });

  it("ignores CLS and PRINT lines (no op emitted)", () => {
    const text = "CLS\r\nPRINT 1,1\r\n";
    expect(parseTsplOps(text).ops).toEqual([]);
  });

  it("preserves command order in the ops array", () => {
    const text =
      'SIZE 78 mm,50 mm\r\n' +
      'GAP 0 mm,0 mm\r\n' +
      'CLS\r\n' +
      'TEXT 20,8,"2",0,4,2,"DEERA"\r\n' +
      "REVERSE 0,0,623,84\r\n" +
      "BAR 0,118,623,3\r\n" +
      "PRINT 1,1\r\n";
    const { ops } = parseTsplOps(text);
    expect(ops.map((o) => o.type)).toEqual(["text", "reverse", "bar"]);
  });

  describe("BITMAP (logo asli, permintaan Denny 2026-08 'coba tambahkan logo asli')", () => {
    it("parses a BITMAP line into a bitmap op with raw data of EXACTLY widthBytes*height chars", () => {
      const data = "\x01\x02\x03\x04\x05\x06"; // 6 byte = widthBytes(2) * height(3)
      const text = `BITMAP 10,20,2,3,0,${data}\r\n`;
      const { ops } = parseTsplOps(text);
      expect(ops).toEqual([{ type: "bitmap", x: 10, y: 20, widthBytes: 2, height: 3, data }]);
    });

    it("survives raw bitmap bytes that LOOK LIKE \\r\\n (0x0D 0x0A) embedded mid-data — TIDAK boleh salah kepotong", () => {
      // byte ke-3/4 dari data sengaja \r\n (0x0D 0x0A) — kalau parser masih
      // naif split(/\r\n/), ini akan salah dianggap batas baris & memotong
      // data bitmap + merusak parsing command sesudahnya.
      const data = "\x00\xff\r\n\xff\x00"; // 6 byte = widthBytes(3) * height(2)
      const text = `BITMAP 0,0,3,2,0,${data}\r\nTEXT 5,5,"2",0,1,1,"Sesudah Bitmap"\r\n`;
      const { ops } = parseTsplOps(text);
      expect(ops[0]).toEqual({ type: "bitmap", x: 0, y: 0, widthBytes: 3, height: 2, data });
      expect(ops[1]).toEqual({
        type: "text",
        x: 5,
        y: 5,
        font: "2",
        xm: 1,
        ym: 1,
        text: "Sesudah Bitmap",
      });
    });

    it("preserves order when BITMAP is mixed with TEXT/BAR/REVERSE", () => {
      const data = "\xff\xff"; // widthBytes(1) * height(2)
      const text =
        'SIZE 78 mm,50 mm\r\n' +
        'GAP 0 mm,0 mm\r\n' +
        'CLS\r\n' +
        `BITMAP 1,1,1,2,0,${data}\r\n` +
        'TEXT 20,8,"2",0,4,2,"DEERA"\r\n' +
        "REVERSE 0,0,623,84\r\n" +
        "BAR 0,118,623,3\r\n" +
        "PRINT 1,1\r\n";
      const { ops } = parseTsplOps(text);
      expect(ops.map((o) => o.type)).toEqual(["bitmap", "text", "reverse", "bar"]);
    });

    it("multi-halaman (gapped) TETAP terpisah dgn benar walau ada BITMAP di tiap halaman", () => {
      const data = "\x0d\x0a"; // sengaja PERSIS \r\n, widthBytes(1) * height(2)
      const text =
        `SIZE 78 mm,150 mm\r\nGAP 2 mm,0 mm\r\nCLS\r\nBITMAP 0,0,1,2,0,${data}\r\nPRINT 1,1\r\n` +
        `SIZE 78 mm,150 mm\r\nGAP 2 mm,0 mm\r\nCLS\r\nBITMAP 0,0,1,2,0,${data}\r\nPRINT 1,1\r\n`;
      const { pages } = parseTsplOps(text);
      expect(pages).toHaveLength(2);
      expect(pages[0].ops).toEqual([{ type: "bitmap", x: 0, y: 0, widthBytes: 1, height: 2, data }]);
      expect(pages[1].ops).toEqual([{ type: "bitmap", x: 0, y: 0, widthBytes: 1, height: 2, data }]);
    });
  });

  it("returns empty ops and zeroed dimensions for empty/garbage input", () => {
    const empty = { widthMm: 0, heightMm: 0, gapMm: 0, ops: [] };
    expect(parseTsplOps("")).toEqual({ ...empty, pages: [empty] });
    expect(parseTsplOps("garbage input\r\nnot tspl at all\r\n")).toEqual({
      ...empty,
      pages: [empty],
    });
  });

  it("handles null/undefined input without throwing", () => {
    const empty = { widthMm: 0, heightMm: 0, gapMm: 0, ops: [] };
    expect(parseTsplOps(null)).toEqual({ ...empty, pages: [empty] });
    expect(parseTsplOps(undefined)).toEqual({ ...empty, pages: [empty] });
  });

  describe("Multi-halaman (PRINT 1,1 sbg penanda batas halaman)", () => {
    it("returns a single-entry pages array for a single SIZE/…/PRINT block (mode continuous, atau gapped yg muat 1 label)", () => {
      const text = 'SIZE 78 mm,120 mm\r\nGAP 0 mm,0 mm\r\nCLS\r\nTEXT 20,8,"2",0,1,1,"Hello"\r\nPRINT 1,1\r\n';
      const { pages } = parseTsplOps(text);
      expect(pages).toHaveLength(1);
      expect(pages[0].heightMm).toBe(120);
      expect(pages[0].ops).toEqual([{ type: "text", x: 20, y: 8, font: "2", xm: 1, ym: 1, text: "Hello" }]);
    });

    it("splits into 2 pages when 2 SIZE/…/PRINT blocks are concatenated (gapped, konten > 1 label)", () => {
      const text =
        'SIZE 78 mm,150 mm\r\nGAP 2 mm,0 mm\r\nCLS\r\nTEXT 20,8,"2",0,1,1,"Halaman 1"\r\nPRINT 1,1\r\n' +
        'SIZE 78 mm,150 mm\r\nGAP 2 mm,0 mm\r\nCLS\r\nTEXT 20,8,"2",0,1,1,"Halaman 2"\r\nPRINT 1,1\r\n';
      const { pages } = parseTsplOps(text);
      expect(pages).toHaveLength(2);
      expect(pages[0].ops[0].text).toBe("Halaman 1");
      expect(pages[1].ops[0].text).toBe("Halaman 2");
      expect(pages[0].heightMm).toBe(150);
      expect(pages[1].heightMm).toBe(150);
    });

    it("top-level widthMm/heightMm/gapMm/ops mirror pages[0] (backward-compatible dgn caller lama yg baca 1 halaman)", () => {
      const text =
        'SIZE 78 mm,150 mm\r\nGAP 2 mm,0 mm\r\nCLS\r\nTEXT 20,8,"2",0,1,1,"Satu"\r\nPRINT 1,1\r\n' +
        'SIZE 78 mm,150 mm\r\nGAP 2 mm,0 mm\r\nCLS\r\nTEXT 20,8,"2",0,1,1,"Dua"\r\nPRINT 1,1\r\n';
      const result = parseTsplOps(text);
      expect(result.heightMm).toBe(result.pages[0].heightMm);
      expect(result.ops).toEqual(result.pages[0].ops);
    });
  });
});
