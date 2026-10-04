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

import { buildGmapsDirUrl } from "./utils";

describe("buildGmapsDirUrl", () => {
  it("null kalau tidak ada stop", () => {
    expect(buildGmapsDirUrl(null, [])).toBeNull();
  });
  it("1 stop: destination saja; origin opsional", () => {
    const u = new URL(buildGmapsDirUrl(null, [{ lat: 1, lng: 2 }]));
    expect(u.searchParams.get("destination")).toBe("1,2");
    expect(u.searchParams.has("origin")).toBe(false);
    expect(u.searchParams.has("waypoints")).toBe(false);
  });
  it("beberapa stop: terakhir = destination, sisanya waypoints urut", () => {
    const u = new URL(buildGmapsDirUrl({ lat: 0, lng: 0 }, [{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }, { lat: 3, lng: 3 }]));
    expect(u.searchParams.get("origin")).toBe("0,0");
    expect(u.searchParams.get("destination")).toBe("3,3");
    expect(u.searchParams.get("waypoints")).toBe("1,1|2,2");
  });
});

import { guessDaerahFromAddress, isDuplicateToko, buildTokoPayloadFromPlace, clusterPoints } from "./utils";

describe("guessDaerahFromAddress", () => {
  it("ambil kota/kabupaten sebelum provinsi, buang prefix Kota/Kabupaten", () => {
    expect(guessDaerahFromAddress("Jl. A No.1, Kec. Tegal Tim., Kota Tegal, Jawa Tengah 52121, Indonesia")).toBe("Tegal");
    expect(guessDaerahFromAddress("Jl. B, Kabupaten Indramayu, Jawa Barat 45211, Indonesia")).toBe("Indramayu");
  });
  it('"" kalau tidak yakin (kecamatan/jalan/terlalu pendek)', () => {
    expect(guessDaerahFromAddress("Jl. A, Kec. X, Jawa Tengah, Indonesia")).toBe("");
    expect(guessDaerahFromAddress("Tegal")).toBe("");
    expect(guessDaerahFromAddress(null)).toBe("");
  });
});

describe("isDuplicateToko", () => {
  const list = [{ nama: "UD Putra Toserba", lat: -6.9, lng: 109.1 }, { nama: "Lain", lat: null, lng: null }];
  it("nama sama (abaikan spasi/tanda baca/huruf besar)", () => {
    expect(isDuplicateToko({ nama: "ud putra-toserba", lat: 0, lng: 0 }, list)).toBe(true);
  });
  it("titik < 50 m dianggap duplikat, jauh tidak", () => {
    expect(isDuplicateToko({ nama: "Beda", lat: -6.90001, lng: 109.10001 }, list)).toBe(true);
    expect(isDuplicateToko({ nama: "Beda", lat: -6.91, lng: 109.1 }, list)).toBe(false);
  });
});

describe("buildTokoPayloadFromPlace", () => {
  it("tanpa detail: status belum, catatan sumber saja", () => {
    const p = buildTokoPayloadFromPlace({ nama: "T", alamat: "Jl. A, Kec. B, Kota Tegal, Jawa Tengah, Indonesia" });
    expect(p).toMatchObject({ nama: "T", daerah: "Tegal", no_hp: "", status_approach: "belum", catatan: "Dari Google Maps." });
  });
  it("dengan detail: telp, rating, website, jam buka masuk", () => {
    const p = buildTokoPayloadFromPlace(
      { nama: "T", alamat: "x" },
      { noHp: "0812", rating: 4.5, ratingCount: 9, website: "https://t.id", jamBuka: ["Senin: 08-17"] },
    );
    expect(p.no_hp).toBe("0812");
    expect(p.catatan).toContain("Rating Google: 4.5 (9 ulasan)");
    expect(p.catatan).toContain("Website: https://t.id");
    expect(p.catatan).toContain("Jam buka:\nSenin: 08-17");
  });
});

describe("clusterPoints", () => {
  const pts = [
    { id: 1, lat: -6.9, lng: 109.1 },
    { id: 2, lat: -6.9001, lng: 109.1001 },
    { id: 3, lat: -2, lng: 118 },
  ];
  it("zoom rendah: titik berdekatan digabung; jauh tetap terpisah; pusat = rata-rata", () => {
    const c = clusterPoints(pts, 5);
    expect(c).toHaveLength(2);
    const big = c.find((x) => x.items.length === 2);
    expect(big.lat).toBeCloseTo(-6.90005, 4);
  });
  it("zoom tinggi: semua terpisah; input kosong aman", () => {
    expect(clusterPoints(pts, 20)).toHaveLength(3);
    expect(clusterPoints([], 5)).toEqual([]);
    expect(clusterPoints(null, 5)).toEqual([]);
  });
});
