import { describe, it, expect, vi } from "vitest";
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: {} }));
import { stampKodeOnImage } from "./api";

describe("stampKodeOnImage", () => {
  it("fallback ke blob asli bila canvas tidak tersedia", async () => {
    const blob = new Blob(["x"], { type: "image/jpeg" });
    expect(await stampKodeOnImage(blob, { kode: "D-1", size: "MIDI" })).toBe(blob);
  });
  it("menggambar kode di canvas dan mengembalikan blob baru", async () => {
    const out = new Blob(["y"], { type: "image/jpeg" });
    const ctx = { drawImage: vi.fn(), fillRect: vi.fn(), fillText: vi.fn() };
    globalThis.createImageBitmap = vi.fn().mockResolvedValue({ width: 100, height: 200 });
    const spy = vi.spyOn(document, "createElement").mockImplementation((t) =>
      t === "canvas" ? { getContext: () => ctx, toBlob: (cb) => cb(out) } : document.constructor.prototype.createElement.call(document, t));
    const r = await stampKodeOnImage(new Blob(["x"]), { kode: "D-1", size: "MIDI" });
    spy.mockRestore();
    delete globalThis.createImageBitmap;
    expect(r).toBe(out);
    expect(ctx.fillText).toHaveBeenCalledWith("D-1", expect.any(Number), expect.any(Number));
  });
});
