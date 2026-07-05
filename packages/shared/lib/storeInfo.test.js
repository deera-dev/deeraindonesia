import { describe, it, expect } from "vitest";
import { STORE_INFO } from "./storeInfo";

describe("STORE_INFO", () => {
  it("memiliki shape data toko yang lengkap", () => {
    expect(STORE_INFO).toMatchObject({
      nama: "Deera Indonesia",
      tagline: "Graceful Elegance",
      website: "deera.id",
      wa: "+62811947254",
    });
  });

  it("memiliki minimal satu rekening bank dengan field lengkap", () => {
    expect(Array.isArray(STORE_INFO.rekening)).toBe(true);
    expect(STORE_INFO.rekening.length).toBeGreaterThan(0);
    STORE_INFO.rekening.forEach((rek) => {
      expect(typeof rek.bank).toBe("string");
      expect(typeof rek.no).toBe("string");
      expect(typeof rek.atas_nama).toBe("string");
    });
  });
});
