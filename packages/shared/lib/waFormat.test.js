import { describe, it, expect } from "vitest";
import { generateWAText, generateWABulkText } from "./waFormat";

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

  it("tidak menyertakan URL video mentah / label 'Video produk:' meskipun product.video ada — link /code/:kode sudah cukup", () => {
    const product = {
      kode: "D-12-VID",
      nama: "Gamis Video",
      bahan: "Moscrepe",
      video: "https://res.cloudinary.com/deera/video/upload/v1234/sample.mp4",
      variants: [{ size: "Midi", harga: 160000 }],
    };

    const text = generateWAText(product);

    expect(text).toContain("Foto dan video lengkap & detail:");
    expect(text).toContain("https://deera.id/code/D-12-VID");
    expect(text).not.toContain("Video produk:");
    expect(text).not.toContain("https://res.cloudinary.com/deera/video/upload/v1234/sample.mp4");
  });

  it("output identik baik product.video ada maupun tidak (video tidak lagi mempengaruhi teks)", () => {
    const base = {
      kode: "D-13-NOV",
      nama: "Gamis Tanpa Video",
      bahan: "Silk",
      variants: [{ size: "Gamis", harga: 200000 }],
    };

    const textWithoutVideo = generateWAText(base);
    const textWithVideo = generateWAText({
      ...base,
      video: "https://res.cloudinary.com/deera/video/upload/v1/x.mp4",
    });

    expect(textWithVideo).toBe(textWithoutVideo);
  });

  it("tidak menyertakan 'Stok terbatas' (dihapus dari template)", () => {
    const product = {
      kode: "D-14-ABC",
      nama: "Produk X",
      bahan: "Katun",
      variants: [{ size: "Midi", harga: 100000 }],
    };

    const text = generateWAText(product);

    expect(text.toLowerCase()).not.toContain("stok terbatas");
  });

  it("menyertakan baris 'Katalog Deera lain' SEBELUM baris Instagram", () => {
    const product = {
      kode: "D-15-XYZ",
      nama: "Produk Y",
      bahan: "Sutra",
      variants: [{ size: "Midi", harga: 120000 }],
    };

    const text = generateWAText(product);

    expect(text).toContain("Katalog Deera lain: https://deera.id/");
    const katalogIdx = text.indexOf("Katalog Deera lain:");
    const instagramIdx = text.indexOf("Instagram:");
    expect(katalogIdx).toBeGreaterThan(-1);
    expect(instagramIdx).toBeGreaterThan(-1);
    expect(katalogIdx).toBeLessThan(instagramIdx);
  });
});

describe("generateWABulkText", () => {
  const productA = {
    kode: "D-01-OSK",
    nama: "Gamis A",
    bahan: "Ceruti",
    variants: [{ size: "Midi", harga: 150000 }],
  };
  const productB = {
    kode: "D-02-SFN",
    nama: "Mukena B",
    bahan: "Sifon",
    variants: [{ size: "Gamis", harga: 175000 }],
  };

  it("menyertakan blok tiap produk (kode, nama, ukuran, bahan, link)", () => {
    const text = generateWABulkText([productA, productB]);

    expect(text).toContain("*D-01-OSK*");
    expect(text).toContain("*Gamis A*");
    expect(text).toContain("- Midi (LD 110 | PB 130) — Rp 150.000");
    expect(text).toContain("https://deera.id/code/D-01-OSK");

    expect(text).toContain("*D-02-SFN*");
    expect(text).toContain("*Mukena B*");
    expect(text).toContain("- Gamis (LD 110 | PB 140) — Rp 175.000");
    expect(text).toContain("https://deera.id/code/D-02-SFN");
  });

  it("salam & footer (katalog/Instagram/TikTok) HANYA muncul sekali, tidak per produk", () => {
    const text = generateWABulkText([productA, productB]);

    const countOccurrences = (needle) => text.split(needle).length - 1;
    expect(countOccurrences("Assalamu'alaikum")).toBe(1);
    expect(countOccurrences("Katalog Deera lain:")).toBe(1);
    expect(countOccurrences("Instagram:")).toBe(1);
    expect(countOccurrences("TikTok:")).toBe(1);
  });

  it("memisahkan tiap blok produk dengan separator garis", () => {
    const text = generateWABulkText([productA, productB]);
    expect(text).toContain("━━━━━━━━━━━━━━━━━━━━━");

    const kodeAIdx = text.indexOf("*D-01-OSK*");
    const sepIdx = text.indexOf("━━━━━━━━━━━━━━━━━━━━━");
    const kodeBIdx = text.indexOf("*D-02-SFN*");
    expect(kodeAIdx).toBeLessThan(sepIdx);
    expect(sepIdx).toBeLessThan(kodeBIdx);
  });

  it("bekerja dengan satu produk saja (tanpa separator)", () => {
    const text = generateWABulkText([productA]);
    expect(text).toContain("*D-01-OSK*");
    expect(text).not.toContain("━━━━━━━━━━━━━━━━━━━━━");
  });

  it("array kosong: tidak melempar, tetap menghasilkan salam+footer", () => {
    const text = generateWABulkText([]);
    expect(text).toContain("Assalamu'alaikum");
    expect(text).toContain("Katalog Deera lain:");
  });

  it("fallback ke array kosong saat argumen undefined", () => {
    const text = generateWABulkText(undefined);
    expect(text).toContain("Assalamu'alaikum");
  });
});
