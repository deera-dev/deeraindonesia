import { describe, it, expect } from "vitest";
import iconv from "./iconv-lite";

describe("iconv-lite stub", () => {
  it("encode converts ASCII string to Uint8Array", () => {
    const buf = iconv.encode("Hello", "PC437");
    expect(buf).toBeInstanceOf(Uint8Array);
    expect(buf[0]).toBe(72); // 'H'
    expect(buf[1]).toBe(101); // 'e'
  });

  it("encode ignores encoding parameter", () => {
    const a = iconv.encode("A", "PC437");
    const b = iconv.encode("A", "UTF-8");
    expect(a[0]).toBe(b[0]);
  });

  it("encode masks bytes to 0xff (ASCII range)", () => {
    const buf = iconv.encode("A", "PC437");
    for (const b of buf) {
      expect(b).toBeLessThanOrEqual(255);
    }
  });

  it("decode converts Uint8Array back to string", () => {
    const buf = new Uint8Array([72, 101, 108, 108, 111]);
    const result = iconv.decode(buf, "PC437");
    expect(result).toBe("Hello");
  });

  it("encode + decode roundtrip preserves ASCII", () => {
    const original = "Deera Indonesia";
    const buf = iconv.encode(original, "PC437");
    const decoded = iconv.decode(buf, "PC437");
    expect(decoded).toBe(original);
  });
});
