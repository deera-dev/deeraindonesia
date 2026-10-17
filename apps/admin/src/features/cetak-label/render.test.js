import { describe, it, expect, vi } from "vitest";
import { drawLabel } from "./render";
import { LABEL_W, LABEL_H } from "./utils";

function fakeCanvas() {
  const rects = [];
  const texts = [];
  let fill = "";
  const ctx = {
    fillRect: (...a) => rects.push({ a, fill }),
    fillText: (...a) => texts.push({ a, fill }),
    measureText: () => ({ width: 100 }),
    drawImage: vi.fn(),
    set fillStyle(v) {
      fill = v;
    },
    get fillStyle() {
      return fill;
    },
    set font(_) {},
    set textAlign(_) {},
    set textBaseline(_) {},
  };
  return { canvas: { getContext: () => ctx }, rects, texts };
}

describe("drawLabel", () => {
  it("menggambar QR besar di atas dan teks 'KODE UKURAN' HITAM di bawah", async () => {
    const { canvas, rects, texts } = fakeCanvas();
    await drawLabel(canvas, { kode: "D-59-DMD", size: "Midi" });
    expect(canvas.width).toBe(LABEL_W);
    expect(canvas.height).toBe(LABEL_H);
    expect(texts[0].a[0]).toBe("D 59 DMD MIDI");
    expect(texts[0].fill).toBe("#000");
    const modules = rects.slice(1);
    const maxY = Math.max(...modules.map((r) => r.a[1] + r.a[3]));
    const minY = Math.min(...modules.map((r) => r.a[1]));
    expect(minY).toBeGreaterThanOrEqual(4);
    expect(maxY).toBeLessThanOrEqual(LABEL_H - 34);
    expect(maxY - minY).toBeGreaterThan(170);
    expect(new Set(modules.map((r) => r.a[2])).size).toBe(1);
  });
});
