import { describe, it, expect, vi } from "vitest";
vi.mock("@deera/shared/lib/cloudinary", () => ({ cldUrl: (u, o) => `${u}?w=${o.width}` }));
import { sizesByKode, uniqueKodes, pickPhotoUrl, buildShareText, photoFileName } from "./utils";

describe("foto-cantik utils", () => {
  it("uniqueKodes menghapus duplikat", () => {
    expect(uniqueKodes({ items: [{ kode: "A" }, { kode: "B" }, { kode: "A" }] })).toEqual(["A", "B"]);
    expect(uniqueKodes(null)).toEqual([]);
  });
  // BUG FIX (November 2026, saran POS) — Share Foto ke pembeli sekarang
  // utamakan Foto Seri Warna (kolase semua warna), baru jatuh ke foto
  // utama (satu warna) kalau Seri Warna belum diisi admin.
  it("pickPhotoUrl: seri_warna (kolase) > image > null", () => {
    expect(pickPhotoUrl({ image: "i", seri_warna: "s" })).toBe("s?w=1080");
    expect(pickPhotoUrl({ image: "i" })).toBe("i?w=1080");
    expect(pickPhotoUrl({})).toBeNull();
  });
  it("buildShareText menyebut pembeli dan produk", () => {
    const t = buildShareText({ buyer_name: "Wildan" }, [{ kode: "D-1", size: "MIDI" }]);
    expect(t).toContain("Kak Wildan");
    expect(t).toContain("• D-1 — MIDI");
  });
  it("photoFileName mengikuti tipe", () => {
    expect(photoFileName("D-1", { type: "image/webp" })).toBe("D-1.webp");
    expect(photoFileName("D-1", { type: "" })).toBe("D-1.jpg");
  });
  it("sizesByKode menggabungkan ukuran per kode", () => {
    const sale = { items: [{ kode: "A", size: "Midi" }, { kode: "A", size: "Gamis" }, { kode: "B", size: "midi" }] };
    expect(sizesByKode(sale)).toEqual({ A: "MIDI, GAMIS", B: "MIDI" });
  });
});
