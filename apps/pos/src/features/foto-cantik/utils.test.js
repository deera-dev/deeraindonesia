import { describe, it, expect, vi } from "vitest";
vi.mock("@deera/shared/lib/cloudinary", () => ({ cldUrl: (u, o) => `${u}?w=${o.width}` }));
import { uniqueKodes, pickPhotoUrl, buildShareText, photoFileName } from "./utils";

describe("foto-cantik utils", () => {
  it("uniqueKodes menghapus duplikat", () => {
    expect(uniqueKodes({ items: [{ kode: "A" }, { kode: "B" }, { kode: "A" }] })).toEqual(["A", "B"]);
    expect(uniqueKodes(null)).toEqual([]);
  });
  it("pickPhotoUrl: image > seri_warna > null", () => {
    expect(pickPhotoUrl({ image: "i", seri_warna: "s" })).toBe("i?w=1080");
    expect(pickPhotoUrl({ seri_warna: "s" })).toBe("s?w=1080");
    expect(pickPhotoUrl({})).toBeNull();
  });
  it("buildShareText menyebut pembeli dan produk", () => {
    const t = buildShareText({ buyer_name: "Wildan" }, [{ kode: "D-1", nama: "Gamis" }]);
    expect(t).toContain("Kak Wildan");
    expect(t).toContain("• D-1 — Gamis");
  });
  it("photoFileName mengikuti tipe", () => {
    expect(photoFileName("D-1", { type: "image/webp" })).toBe("D-1.webp");
    expect(photoFileName("D-1", { type: "" })).toBe("D-1.jpg");
  });
});
