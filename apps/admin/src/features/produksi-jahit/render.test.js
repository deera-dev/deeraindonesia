import { describe, it, expect, vi } from "vitest";
import { drawQr } from "./render";

function fakeCanvas() {
  const rects = [];
  let fill = "";
  const ctx = {
    fillRect: (...a) => rects.push({ a, fill }),
    drawImage: vi.fn(),
    set fillStyle(v) {
      fill = v;
    },
    get fillStyle() {
      return fill;
    },
  };
  return { canvas: { getContext: () => ctx }, rects };
}

describe("drawQr", () => {
  it("mengisi canvas dengan modul QR hitam di atas latar putih", async () => {
    const { canvas, rects } = fakeCanvas();
    await drawQr(canvas, "11111111-2222-3333-4444-555555555555", 240);
    expect(canvas.width).toBeGreaterThan(0);
    expect(canvas.height).toBe(canvas.width);
    expect(rects[0].fill).toBe("#fff");
    expect(rects[0].a).toEqual([0, 0, canvas.width, canvas.height]);
    const modules = rects.slice(1);
    expect(modules.length).toBeGreaterThan(10);
    expect(modules.every((r) => r.fill === "#000")).toBe(true);
  });

  it("menghasilkan QR yang berbeda untuk teks (card id) yang berbeda", async () => {
    const a = fakeCanvas();
    await drawQr(a.canvas, "aaaaaaaa-0000-0000-0000-000000000000", 240);
    const b = fakeCanvas();
    await drawQr(b.canvas, "bbbbbbbb-1111-1111-1111-111111111111", 240);
    expect(a.rects.length).not.toBe(0);
    expect(a.rects).not.toEqual(b.rects);
  });
});
