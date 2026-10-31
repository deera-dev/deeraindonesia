import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./queries", () => ({ useFotoCantikQuery: vi.fn() }));
vi.mock("@deera/shared/lib/cloudinary", () => ({ cldUrl: (u) => u }));

import { sharePhotos } from "./hooks";

const sale = { buyer_name: "A" };
const photo = { kode: "D-1", nama: "G", blob: new Blob(["x"], { type: "image/jpeg" }) };

describe("sharePhotos", () => {
  beforeEach(() => {
    delete navigator.share;
    delete navigator.canShare;
  });
  it("share file bila didukung", async () => {
    navigator.share = vi.fn().mockResolvedValue();
    navigator.canShare = vi.fn().mockReturnValue(true);
    const r = await sharePhotos(sale, [photo]);
    expect(r.method).toBe("share-file");
    expect(navigator.share.mock.calls[0][0].files).toHaveLength(1);
  });
  it("AbortError dianggap batal", async () => {
    navigator.share = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error("x"), { name: "AbortError" }));
    navigator.canShare = vi.fn().mockReturnValue(true);
    expect((await sharePhotos(sale, [photo])).method).toBe("aborted");
  });
  it("tanpa Web Share → unsupported, tidak membuka wa.me", async () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    expect((await sharePhotos(sale, [photo])).method).toBe("unsupported");
    expect(open).not.toHaveBeenCalled();
  });
});
