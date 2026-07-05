import { describe, it, expect } from "vitest";
import { generateWAText } from "./waFormat";

describe("generateWAText", () => {
  it("membangun teks WA lengkap dengan variant yang punya harga > 0", () => {
    const product = {
      kode: "D-07-OSK",
      nama: "Gamis Cantik",
      bahan: "Ceruti Ottoman",
      variants: [
        { size: "Midi", harga: 150000 },
        { size: "Gamis", harga: 175000 },
      ],
    };

    const text = generateWAText(product);

    expect(text).toContain("*D-07-OSK*");
    expect(text).toContain("*Gamis Cantik*");
    expect(text).toContain("Bahan: Ceruti Ottoman");
    expect(text).toContain("- Midi (LD 110 | PB 130) — Rp 150.000");
    expect(text).toContain("- Gamis (LD 110 | PB 140) — Rp 175.000");
    expect(text).toContain("https://deera.id/code/D-07-OSK");
  });

  it("memfilter variant dengan harga 0 atau negatif", () => {
    const product = {
      kode: "D-08-SFN",
      nama: "Mukena Indah",
      bahan: "Sifon",
      variants: [
        { size: "Midi", harga: 0 },
        { size: "Gamis", harga: -100 },
        { size: "Gamis Jumbo", harga: 200000 },
      ],
    };

    const text = generateWAText(product);

    expect(text).not.toContain("- Midi");
    expect(text).not.toContain("- Gamis (");
    expect(text).toContain("- Gamis Jumbo (LD 120 | PB 140) — Rp 200.000");
  });

  it("fallback ke array kosong saat variants tidak ada", () => {
    const product = { kode: "D-09-XYZ", nama: "Produk Tanpa Variant" };

    const text = generateWAText(product);

    expect(text).toContain("Ukuran & Harga:");
    expect(text).toContain("Bahan: ");
  });

  it("fallback bahan ke string kosong saat tidak ada", () => {
    const product = {
      kode: "D-10-ABC",
      nama: "Produk Tanpa Bahan",
      variants: [{ size: "Midi", harga: 100000 }],
    };

    const text = generateWAText(product);

    expect(text).toContain("Bahan: \n");
  });

  it("menggunakan fallback '-' untuk ld/pb saat size tidak ada di SIZE_PRESETS", () => {
    const product = {
      kode: "D-11-UNK",
      nama: "Produk Size Unik",
      bahan: "Katun",
      variants: [{ size: "Custom Size", harga: 90000 }],
    };

    const text = generateWAText(product);

    expect(text).toContain("- Custom Size (LD - | PB -) — Rp 90.000");
  });

  it("menyertakan URL video jika product.video ada", () => {
    const product = {
      kode: "D-12-VID",
      nama: "Gamis Video",
      bahan: "Moscrepe",
      video: "https://res.cloudinary.com/deera/video/upload/v1234/sample.mp4",
      variants: [{ size: "Midi", harga: 160000 }],
    };

    const text = generateWAText(product);

    expect(text).toContain("Video produk:");
    expect(text).toContain("https://res.cloudinary.com/deera/video/upload/v1234/sample.mp4");
  });

  it("tidak menyertakan bagian video jika product.video tidak ada", () => {
    const product = {
      kode: "D-13-NOV",
      nama: "Gamis Tanpa Video",
      bahan: "Silk",
      variants: [{ size: "Gamis", harga: 200000 }],
    };

    const text = generateWAText(product);

    expect(text).not.toContain("Video produk:");
  });
});
