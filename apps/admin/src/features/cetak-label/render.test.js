import { describe, it, expect, vi } from "vitest";
import { drawLabel } from "./render";
import { LABEL_W, LABEL_H } from "./utils";

describe("drawLabel", () => {
  it("menggambar QR besar di atas dan teks 'KODE UKURAN' di bawah", () => {
    const rects = [];
    const texts = [];
    const ctx = {
      fillRect: (...a) => rects.push(a),
      fillText: (...a) => texts.push(a),
      measureText: () => ({ width: 100 }),
      set fillStyle(_) {},
      set font(_) {},
      set textAlign(_) {},
      set textBaseline(_) {},
    };
    const canvas = { getContext: () => ctx };
    drawLabel(canvas, { kode: "D-59-DMD", size: "Midi" });
    expect(canvas.width).toBe(LABEL_W);
    expect(canvas.height).toBe(LABEL_H);
    expect(texts[0][0]).toBe("D 59 DMD MIDI");
    const modules = rects.slice(1); // rect pertama = latar putih
    const maxY = Math.max(...modules.map((r) => r[1] + r[3]));
    const minY = Math.min(...modules.map((r) => r[1]));
    expect(minY).toBeGreaterThanOrEqual(4);
    expect(maxY).toBeLessThanOrEqual(LABEL_H - 34); // tidak menabrak baris teks
    expect(maxY - minY).toBeGreaterThan(190); // QR hampir setinggi area yang tersedia
  });
});
