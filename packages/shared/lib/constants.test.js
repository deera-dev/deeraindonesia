import { describe, it, expect } from "vitest";
import { SIZE_PRESETS, formatHarga, buildKode } from "./constants";

describe("SIZE_PRESETS", () => {
  // Permintaan Denny 2026-09: tambah ukuran baru "Super Jumbo" (LD 130,
  // PB 140) — preset flat (bukan dipecah Midi/Gamis spt size lain),
  // ditaruh PALING AKHIR array (ukuran terbesar).
  it("berisi 5 preset ukuran baku", () => {
    expect(SIZE_PRESETS).toHaveLength(5);
    expect(SIZE_PRESETS.map((s) => s.size)).toEqual([
      "Midi",
      "Midi Jumbo",
      "Gamis",
      "Gamis Jumbo",
      "Super Jumbo",
    ]);
  });

  it("Super Jumbo punya LD 130 dan PB 140", () => {
    const superJumbo = SIZE_PRESETS.find((s) => s.size === "Super Jumbo");
    expect(superJumbo).toEqual({ size: "Super Jumbo", ld: 130, pb: 140 });
  });

  it("setiap preset punya ld dan pb numerik", () => {
    SIZE_PRESETS.forEach((preset) => {
      expect(typeof preset.ld).toBe("number");
      expect(typeof preset.pb).toBe("number");
    });
  });
});

describe("formatHarga", () => {
  it("mengembalikan string kosong untuk null", () => {
    expect(formatHarga(null)).toBe("");
  });

  it("mengembalikan string kosong untuk undefined", () => {
    expect(formatHarga(undefined)).toBe("");
  });

  it("mengembalikan string kosong untuk 0", () => {
    expect(formatHarga(0)).toBe("");
  });

  it("mengembalikan string kosong untuk string yang seluruhnya non-digit", () => {
    expect(formatHarga("abc")).toBe("");
  });

  it("memformat angka number biasa dengan separator ribuan id-ID", () => {
    expect(formatHarga(150000)).toBe("150.000");
  });

  it("membuang karakter non-digit dari input string sebelum format", () => {
    expect(formatHarga("Rp 75.000")).toBe("75.000");
  });
});

describe("buildKode", () => {
  it("mengembalikan string kosong saat angka dan bahan keduanya kosong", () => {
    expect(buildKode("", "")).toBe("");
  });

  it("mengembalikan string kosong saat keduanya hanya whitespace", () => {
    expect(buildKode("   ", "   ")).toBe("");
  });

  it("tetap membangun kode saat hanya angka yang kosong", () => {
    expect(buildKode("", "osk")).toBe("D--OSK");
  });

  it("tetap membangun kode saat hanya bahan yang kosong", () => {
    expect(buildKode("07", "")).toBe("D-07-");
  });

  it("membangun kode lengkap dan meng-uppercase bahan", () => {
    expect(buildKode("07", "osk")).toBe("D-07-OSK");
  });

  it("memangkas whitespace di sekitar angka dan bahan", () => {
    expect(buildKode("  82 ", " sfn ")).toBe("D-82-SFN");
  });
});
