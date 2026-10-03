import { describe, it, expect } from "vitest";
import {
  fmtRp,
  fmtDate,
  groupSaleItems,
  matchesSearch,
  extractDaerahQuery,
  buildPelangganGeocodeQueries,
  isApproxGeocodeMatch,
  extractDaerahFromNama,
} from "./utils";

describe("fmtRp", () => {
  it("format angka jadi Rp dengan separator ribuan ala Indonesia", () => {
    expect(fmtRp(15000)).toBe("Rp 15.000");
  });

  it("fallback ke 0 kalau input bukan angka", () => {
    expect(fmtRp(undefined)).toBe("Rp 0");
    expect(fmtRp(null)).toBe("Rp 0");
  });
});

describe("fmtDate", () => {
  it("format tanggal ala Indonesia (hari bulan tahun)", () => {
    expect(fmtDate("2026-03-05")).toMatch(/2026/);
  });

  it("dash kalau input kosong", () => {
    expect(fmtDate(null)).toBe("-");
    expect(fmtDate(undefined)).toBe("-");
  });
});

describe("groupSaleItems", () => {
  it("item flat (tanpa array warna) pakai qty langsung", () => {
    const result = groupSaleItems([{ kode: "D-07-OSK", size: "Midi", harga: 150000, hpp: 80000, qty: 3 }]);
    expect(result).toEqual([
      {
        kode: "D-07-OSK",
        size: "Midi",
        harga: 150000,
        hpp: 80000,
        qty: 3,
        subtotal: 450000,
        warnaBreakdown: [],
      },
    ]);
  });

  it("item per-warna: qty = total lintas warna, warnaBreakdown terisi", () => {
    const result = groupSaleItems([
      {
        kode: "D-07-OSK",
        size: "Midi",
        harga: 150000,
        hpp: 80000,
        warna: [
          { nama: "HITAM", qty: 2 },
          { nama: "MERAH", qty: 1 },
        ],
      },
    ]);
    expect(result[0].qty).toBe(3);
    expect(result[0].subtotal).toBe(450000);
    expect(result[0].warnaBreakdown).toEqual([
      { warna: "HITAM", qty: 2 },
      { warna: "MERAH", qty: 1 },
    ]);
  });

  it("array warna kosong [] dianggap flat, fallback ke item.qty", () => {
    const result = groupSaleItems([{ kode: "D-07-OSK", size: "Midi", harga: 150000, hpp: 80000, qty: 5, warna: [] }]);
    expect(result[0].qty).toBe(5);
    expect(result[0].warnaBreakdown).toEqual([]);
  });

  it("list kosong -> []", () => {
    expect(groupSaleItems([])).toEqual([]);
    expect(groupSaleItems(undefined)).toEqual([]);
  });
});

describe("matchesSearch", () => {
  const p = { nama: "Budi Santoso", no_hp: "081234567890" };

  it("query kosong -> selalu match", () => {
    expect(matchesSearch(p, "")).toBe(true);
    expect(matchesSearch(p, "   ")).toBe(true);
  });

  it("match sebagian nama, case-insensitive", () => {
    expect(matchesSearch(p, "budi")).toBe(true);
    expect(matchesSearch(p, "SANTOSO")).toBe(true);
  });

  it("match sebagian no_hp", () => {
    expect(matchesSearch(p, "08123")).toBe(true);
  });

  it("tidak match kalau tidak ada kecocokan sama sekali", () => {
    expect(matchesSearch(p, "zzz")).toBe(false);
  });
});

describe("extractDaerahQuery", () => {
  it("alamat dgn >=2 segmen koma -> ambil 2 segmen TERAKHIR + ', Indonesia'", () => {
    expect(extractDaerahQuery("Jl. Mawar No. 5, Kec. Taman, Sidoarjo")).toBe("Kec. Taman, Sidoarjo, Indonesia");
  });

  it("alamat dgn tepat 2 segmen -> ambil segmen terakhir saja (sisa 1 setelah buang yg pertama)", () => {
    expect(extractDaerahQuery("Jl. Mawar No. 5, Sidoarjo")).toBe("Sidoarjo, Indonesia");
  });

  it("alamat tanpa koma sama sekali -> null (tidak ada bagian coarse yg bisa dipisah)", () => {
    expect(extractDaerahQuery("Sidoarjo")).toBeNull();
  });

  it("alamat kosong/null -> null", () => {
    expect(extractDaerahQuery("")).toBeNull();
    expect(extractDaerahQuery(null)).toBeNull();
    expect(extractDaerahQuery(undefined)).toBeNull();
  });
});

describe("buildPelangganGeocodeQueries", () => {
  it("alamat dgn koma -> 3 query: full+Indonesia, full apa adanya, lalu daerah coarse", () => {
    const result = buildPelangganGeocodeQueries("Jl. Mawar No. 5, Kec. Taman, Sidoarjo");
    expect(result).toEqual([
      "Jl. Mawar No. 5, Kec. Taman, Sidoarjo, Indonesia",
      "Jl. Mawar No. 5, Kec. Taman, Sidoarjo",
      "Kec. Taman, Sidoarjo, Indonesia",
    ]);
  });

  it("alamat tanpa koma -> cuma 2 query (tidak ada fallback coarse)", () => {
    const result = buildPelangganGeocodeQueries("Sidoarjo");
    expect(result).toEqual(["Sidoarjo, Indonesia", "Sidoarjo"]);
  });
});

describe("isApproxGeocodeMatch", () => {
  it("true kalau matchedQuery persis sama dgn hasil extractDaerahQuery", () => {
    const alamat = "Jl. Mawar No. 5, Kec. Taman, Sidoarjo";
    expect(isApproxGeocodeMatch(alamat, "Kec. Taman, Sidoarjo, Indonesia")).toBe(true);
  });

  it("false kalau matchedQuery adalah alamat lengkap (titik pasti, bukan approx)", () => {
    const alamat = "Jl. Mawar No. 5, Kec. Taman, Sidoarjo";
    expect(isApproxGeocodeMatch(alamat, `${alamat}, Indonesia`)).toBe(false);
  });

  it("false kalau alamat tidak punya koma (tidak ada coarse query sama sekali)", () => {
    expect(isApproxGeocodeMatch("Sidoarjo", "Sidoarjo, Indonesia")).toBe(false);
  });
});

describe("extractDaerahFromNama", () => {
  it("ambil kata TERAKHIR kalau match whitelist daerah (nama orang + daerah)", () => {
    expect(extractDaerahFromNama("Azizah Indramayu")).toBe("Indramayu, Indonesia");
    expect(extractDaerahFromNama("Apip Sukabumi")).toBe("Sukabumi, Indonesia");
    expect(extractDaerahFromNama("Devi Semarang")).toBe("Semarang, Indonesia");
  });

  it("kenali singkatan kota yang konsisten dipakai (TG/TGR/TGL/PWK/PKL/MKS/BKL)", () => {
    expect(extractDaerahFromNama("Ali TGR")).toBe("Tangerang, Indonesia");
    expect(extractDaerahFromNama("Dama TG")).toBe("Tangerang, Indonesia");
    expect(extractDaerahFromNama("Anggi TGL")).toBe("Tegal, Indonesia");
    expect(extractDaerahFromNama("Aat PWK")).toBe("Purwakarta, Indonesia");
    expect(extractDaerahFromNama("Ani PKL")).toBe("Pekalongan, Indonesia");
  });

  it("kenali daerah 2 kata (Banjar Negara) dari 2 token terakhir", () => {
    expect(extractDaerahFromNama("Afandi Banjar Negara")).toBe("Banjarnegara, Indonesia");
  });

  it("buang anotasi dalam kurung sebelum cek token terakhir", () => {
    expect(extractDaerahFromNama("Tante Tati (LIVE)")).toBeNull();
  });

  it("null kalau TIDAK ADA token yang dikenali whitelist — JANGAN menebak dari nama orang/brand", () => {
    expect(extractDaerahFromNama("Alfi Fatih")).toBeNull();
    expect(extractDaerahFromNama("Bunda Rafa")).toBeNull();
    expect(extractDaerahFromNama("Ami Collection")).toBeNull();
    expect(extractDaerahFromNama("Charlie")).toBeNull();
  });

  it("null kalau nama kosong/null", () => {
    expect(extractDaerahFromNama("")).toBeNull();
    expect(extractDaerahFromNama(null)).toBeNull();
    expect(extractDaerahFromNama(undefined)).toBeNull();
  });

  it("pisah token pakai spasi ATAU dash, ambil token terakhir setelah dash", () => {
    expect(extractDaerahFromNama("Windi - TG")).toBe("Tangerang, Indonesia");
  });
});
