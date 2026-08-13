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

  it("returns empty ops and zeroed dimensions for empty/garbage input", () => {
    expect(parseTsplOps("")).toEqual({ widthMm: 0, heightMm: 0, gapMm: 0, ops: [] });
    expect(parseTsplOps("garbage input\r\nnot tspl at all\r\n")).toEqual({
      widthMm: 0,
      heightMm: 0,
      gapMm: 0,
      ops: [],
    });
  });

  it("handles null/undefined input without throwing", () => {
    expect(parseTsplOps(null)).toEqual({ widthMm: 0, heightMm: 0, gapMm: 0, ops: [] });
    expect(parseTsplOps(undefined)).toEqual({ widthMm: 0, heightMm: 0, gapMm: 0, ops: [] });
  });
});
