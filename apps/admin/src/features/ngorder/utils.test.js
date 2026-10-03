import { describe, it, expect } from "vitest";
import {
  latestItemByKode,
  summarizeTokoItems,
  STATUS_LABEL,
  summarizeByDaerah,
  distinctDaerahList,
  buildGeocodeQuery,
  tokoWithLocation,
  tokoNeedingGeocode,
} from "./utils";

function item(kode, status, created_at) {
  return { id: `${kode}-${created_at}`, kode, status, created_at };
}

describe("latestItemByKode", () => {
  it("ambil item dengan created_at terbesar per kode", () => {
    const items = [
      item("D-01", "tidak_dipilih", "2026-10-01T00:00:00Z"),
      item("D-01", "dipilih", "2026-10-15T00:00:00Z"),
      item("D-02", "pending", "2026-10-05T00:00:00Z"),
    ];
    const map = latestItemByKode(items);
    expect(map.get("D-01").status).toBe("dipilih");
    expect(map.get("D-02").status).toBe("pending");
    expect(map.size).toBe(2);
  });

  it("list kosong menghasilkan map kosong", () => {
    expect(latestItemByKode([]).size).toBe(0);
    expect(latestItemByKode(undefined).size).toBe(0);
  });
});

describe("summarizeTokoItems", () => {
  const items = [
    item("D-01", "dipilih", "2026-10-01T00:00:00Z"),
    item("D-02", "tidak_dipilih", "2026-10-01T00:00:00Z"),
    item("D-03", "pending", "2026-10-01T00:00:00Z"),
  ];
  const products = [
    { kode: "D-01", nama: "A" },
    { kode: "D-02", nama: "B" },
    { kode: "D-03", nama: "C" },
    { kode: "D-04", nama: "D (belum dikirim)" },
  ];

  it("hitung counts dikirim/dipilih/tidakDipilih/pending/belumDikirim dgn benar", () => {
    const summary = summarizeTokoItems(items, products);
    expect(summary.counts).toEqual({
      dikirim: 3,
      dipilih: 1,
      tidakDipilih: 1,
      pending: 1,
      belumDikirim: 1,
    });
    expect(summary.belumDikirim[0].kode).toBe("D-04");
  });

  it("kode yang sama dikirim ulang (resend setelah tidak_dipilih) — status terbaru menang", () => {
    const resent = [
      ...items,
      item("D-02", "pending", "2026-10-20T00:00:00Z"), // dikirim lagi, lebih baru
    ];
    const summary = summarizeTokoItems(resent, products);
    expect(summary.counts.tidakDipilih).toBe(0);
    expect(summary.counts.pending).toBe(2); // D-02 (resend) + D-03
  });

  it("list items kosong -> semua produk masuk belumDikirim", () => {
    const summary = summarizeTokoItems([], products);
    expect(summary.counts.dikirim).toBe(0);
    expect(summary.counts.belumDikirim).toBe(4);
  });
});

describe("STATUS_LABEL", () => {
  it("punya label utk semua status yang dipakai", () => {
    expect(STATUS_LABEL.dipilih).toBe("Dipilih");
    expect(STATUS_LABEL.tidak_dipilih).toBe("Tidak Dipilih");
    expect(STATUS_LABEL.pending).toBe("Menunggu");
  });
});

describe("distinctDaerahList", () => {
  it("daerah unik terurut A-Z, kosong/null diabaikan", () => {
    const toko = [
      { daerah: "Sidoarjo" },
      { daerah: "Surabaya" },
      { daerah: "Sidoarjo" },
      { daerah: null },
      { daerah: "" },
    ];
    expect(distinctDaerahList(toko)).toEqual(["Sidoarjo", "Surabaya"]);
  });

  it("list kosong -> []", () => {
    expect(distinctDaerahList([])).toEqual([]);
  });
});

describe("summarizeByDaerah", () => {
  const toko = [
    { daerah: "Sidoarjo", status_approach: "sudah", kesan: "tertarik" },
    { daerah: "Sidoarjo", status_approach: "sudah", kesan: "belum_tertarik" },
    { daerah: "Sidoarjo", status_approach: "belum" },
    { daerah: "Surabaya", status_approach: "sudah", kesan: "tertarik" },
    { daerah: null, status_approach: "belum" },
  ];

  it("grup per daerah dgn hitungan sudahApproach/tertarik/belumTertarik/belumApproach", () => {
    const summary = summarizeByDaerah(toko);
    const sidoarjo = summary.find((g) => g.daerah === "Sidoarjo");
    expect(sidoarjo).toEqual({
      daerah: "Sidoarjo",
      total: 3,
      sudahApproach: 2,
      tertarik: 1,
      belumTertarik: 1,
      belumApproach: 1,
    });
  });

  it("toko tanpa daerah masuk grup 'Belum Ditentukan', selalu di akhir", () => {
    const summary = summarizeByDaerah(toko);
    expect(summary[summary.length - 1].daerah).toBe("Belum Ditentukan");
  });

  it("list kosong -> []", () => {
    expect(summarizeByDaerah([])).toEqual([]);
  });
});

describe("buildGeocodeQuery", () => {
  it("pakai alamat + daerah + Indonesia kalau semua terisi", () => {
    const q = buildGeocodeQuery({ nama: "UD Putra Toserba", alamat: "Jl. Mawar No. 1", daerah: "Sidoarjo" });
    expect(q).toBe("Jl. Mawar No. 1, Sidoarjo, Indonesia");
  });

  it("fallback ke nama toko kalau alamat kosong", () => {
    const q = buildGeocodeQuery({ nama: "Hara Boutique", alamat: "", daerah: "Surabaya" });
    expect(q).toBe("Hara Boutique, Surabaya, Indonesia");
  });

  it("tidak duplikasi daerah kalau sudah disebut di alamat", () => {
    const q = buildGeocodeQuery({ nama: "Toko X", alamat: "Jl. A, Sidoarjo", daerah: "Sidoarjo" });
    expect(q).toBe("Jl. A, Sidoarjo, Indonesia");
  });

  it("minimal nama + Indonesia kalau alamat & daerah kosong", () => {
    expect(buildGeocodeQuery({ nama: "Toko Y" })).toBe("Toko Y, Indonesia");
  });
});

describe("tokoWithLocation / tokoNeedingGeocode", () => {
  const toko = [
    { id: "1", lat: -7.2, lng: 112.7, alamat: "A" },
    { id: "2", lat: null, lng: null, alamat: "B" },
    { id: "3", lat: null, lng: null, alamat: "", daerah: "" },
    { id: "4", lat: null, lng: null, daerah: "Sidoarjo" },
  ];

  it("tokoWithLocation hanya toko yg lat+lng terisi", () => {
    expect(tokoWithLocation(toko).map((t) => t.id)).toEqual(["1"]);
  });

  it("tokoNeedingGeocode: belum ada lat/lng TAPI punya alamat atau daerah", () => {
    expect(tokoNeedingGeocode(toko).map((t) => t.id)).toEqual(["2", "4"]);
  });

  it("list kosong -> []", () => {
    expect(tokoWithLocation([])).toEqual([]);
    expect(tokoNeedingGeocode([])).toEqual([]);
  });
});
