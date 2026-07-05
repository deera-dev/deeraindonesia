import { describe, it, expect } from "vitest";
import {
  DEFAULT_BIAYA_PASAR,
  localDateStr,
  getHariBukaPerMinggu,
  getHppPasarPerHari,
  getHppPasarPerPeriode,
  computeMarginPerPcs,
  computeBepLokasi,
  findEarliestMarketDate,
  computeSaldoHarian,
  computeTargetProduksi,
  getSisaHariMingguIni,
  computeKebutuhanBahanMingguan,
  computeProyeksiUtangVsSaldo,
} from "./bepUtils";

describe("DEFAULT_BIAYA_PASAR", () => {
  it("punya entri cideng dan tegalgubug", () => {
    expect(DEFAULT_BIAYA_PASAR.cideng).toBeDefined();
    expect(DEFAULT_BIAYA_PASAR.tegalgubug).toBeDefined();
  });
});

describe("localDateStr", () => {
  it("memformat tanggal eksplisit jadi YYYY-MM-DD dengan padding", () => {
    expect(localDateStr(new Date(2024, 0, 5))).toBe("2024-01-05");
  });

  it("memformat bulan/hari dua digit tanpa padding ekstra", () => {
    expect(localDateStr(new Date(2026, 10, 23))).toBe("2026-11-23");
  });

  it("default ke Date.now() ketika tidak diberi argumen", () => {
    expect(localDateStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("getHariBukaPerMinggu", () => {
  it("cideng buka 2 hari/minggu (Senin & Kamis)", () => {
    expect(getHariBukaPerMinggu("cideng")).toBe(2);
  });

  it("tegalgubug buka 1 hari/minggu (Jumat)", () => {
    expect(getHariBukaPerMinggu("tegalgubug")).toBe(1);
  });

  it("gudang buka 4 hari/minggu (hari sisanya)", () => {
    expect(getHariBukaPerMinggu("gudang")).toBe(4);
  });

  it("lokasi tidak dikenal buka 0 hari/minggu", () => {
    expect(getHariBukaPerMinggu("antartika")).toBe(0);
  });
});

describe("getHppPasarPerHari", () => {
  it("mengembalikan 0 ketika biayaRow falsy", () => {
    expect(getHppPasarPerHari(null, "cideng")).toBe(0);
    expect(getHppPasarPerHari(undefined, "cideng")).toBe(0);
  });

  it("menghitung transport + sewa/hari untuk lokasi valid", () => {
    const result = getHppPasarPerHari(DEFAULT_BIAYA_PASAR.cideng, "cideng");
    const expectedSewaPerHari = 50000000 / (2 * 52);
    expect(result).toBeCloseTo(180000 + expectedSewaPerHari, 5);
  });

  it("memakai fallback 0 untuk transport_per_trip & sewa_lapak_per_tahun yang hilang", () => {
    expect(getHppPasarPerHari({}, "cideng")).toBe(0);
  });

  it("sewaPerHari jadi 0 ketika hariBukaPerTahun = 0 (lokasi tidak dikenal)", () => {
    const result = getHppPasarPerHari({ transport_per_trip: 100, sewa_lapak_per_tahun: 999 }, "antartika");
    expect(result).toBe(100);
  });
});

describe("getHppPasarPerPeriode", () => {
  it("mengembalikan rekap perHari/perMinggu/perBulan/perTahun yang konsisten", () => {
    const result = getHppPasarPerPeriode(DEFAULT_BIAYA_PASAR.cideng, "cideng");
    expect(result.hariBukaPerMinggu).toBe(2);
    expect(result.perMinggu).toBeCloseTo(result.perHari * 2, 5);
    expect(result.perBulan).toBeCloseTo(result.perHari * 2 * 4.333, 5);
    expect(result.perTahun).toBeCloseTo(result.perHari * 2 * 52, 5);
  });
});

describe("computeMarginPerPcs", () => {
  it("menghitung margin blended dari beberapa transaksi sale", () => {
    const today = new Date(2026, 5, 30);
    const rows = [
      { date: "2026-06-20", type: "sale", items: [{ harga: 150000, hpp: 100000, qty: 2 }] },
      { date: "2026-06-25", type: "sale", items: [{ harga: 200000, hpp: 120000, qty: 1 }] },
    ];
    const result = computeMarginPerPcs(rows, { today });
    // margin: (150000-100000)*2 + (200000-120000)*1 = 100000+80000=180000; pcs=3
    expect(result.totalPcs).toBe(3);
    expect(result.marginPerPcs).toBeCloseTo(180000 / 3, 5);
    expect(result.hargaJualRataRata).toBeCloseTo((150000 * 2 + 200000 * 1) / 3, 5);
  });

  it("mengurangi margin & pcs untuk transaksi retur", () => {
    const today = new Date(2026, 5, 30);
    const rows = [
      { date: "2026-06-20", type: "sale", items: [{ harga: 150000, hpp: 100000, qty: 3 }] },
      { date: "2026-06-21", type: "retur", items: [{ harga: 150000, hpp: 100000, qty: 1 }] },
    ];
    const result = computeMarginPerPcs(rows, { today });
    expect(result.totalPcs).toBe(2);
  });

  it("memakai effQty dari array warna ketika tersedia", () => {
    const today = new Date(2026, 5, 30);
    const rows = [
      {
        date: "2026-06-20",
        type: "sale",
        items: [{ harga: 100000, hpp: 60000, warna: [{ warna: "HITAM", qty: 2 }, { warna: "MERAH", qty: 1 }] }],
      },
    ];
    const result = computeMarginPerPcs(rows, { today });
    expect(result.totalPcs).toBe(3);
  });

  it("memakai qty langsung ketika array warna kosong", () => {
    const today = new Date(2026, 5, 30);
    const rows = [{ date: "2026-06-20", type: "sale", items: [{ harga: 100000, hpp: 60000, warna: [], qty: 4 }] }];
    const result = computeMarginPerPcs(rows, { today });
    expect(result.totalPcs).toBe(4);
  });

  it("memakai fallback 0 untuk harga/hpp yang hilang", () => {
    const today = new Date(2026, 5, 30);
    const rows = [{ date: "2026-06-20", type: "sale", items: [{ qty: 1 }] }];
    const result = computeMarginPerPcs(rows, { today });
    expect(result.marginPerPcs).toBe(0);
  });

  it("mengabaikan baris tanpa field date saat windowDays aktif", () => {
    const today = new Date(2026, 5, 30);
    const rows = [{ type: "sale", items: [{ harga: 100000, hpp: 50000, qty: 1 }] }];
    // tanpa date, (s.date ?? "") >= since akan false untuk windowDays manapun -> totalPcs 0 -> fallback ke windowDays:0 -> tetap tidak ada match karena filter windowDays:0 tidak filter date sama sekali, jadi row ini akan ikut dihitung
    const result = computeMarginPerPcs(rows, { today, windowDays: 60 });
    expect(result.totalPcs).toBe(1);
  });

  it("fallback ke seluruh data ketika tidak ada transaksi dalam window", () => {
    const today = new Date(2026, 5, 30);
    const rows = [{ date: "2020-01-01", type: "sale", items: [{ harga: 100000, hpp: 50000, qty: 5 }] }];
    const result = computeMarginPerPcs(rows, { today, windowDays: 7 });
    expect(result.totalPcs).toBe(5);
  });

  it("mengembalikan nol ketika sama sekali tidak ada data (windowDays:0)", () => {
    const result = computeMarginPerPcs([], { windowDays: 0 });
    expect(result).toEqual({ marginPerPcs: 0, hargaJualRataRata: 0, totalPcs: 0 });
  });

  it("items default ke array kosong ketika tidak ada field items", () => {
    const result = computeMarginPerPcs([{ date: "2026-06-20", type: "sale" }], { today: new Date(2026, 5, 30) });
    expect(result.totalPcs).toBe(0);
  });

  it("warna.qty default ke 0 ketika hilang pada salah satu entri warna", () => {
    const today = new Date(2026, 5, 30);
    const rows = [
      {
        date: "2026-06-20",
        type: "sale",
        items: [{ harga: 100000, hpp: 60000, warna: [{ warna: "HITAM" }, { warna: "MERAH", qty: 2 }] }],
      },
    ];
    const result = computeMarginPerPcs(rows, { today });
    expect(result.totalPcs).toBe(2);
  });

  it("item tanpa warna dan tanpa qty dihitung 0 pcs", () => {
    const today = new Date(2026, 5, 30);
    const rows = [{ date: "2026-06-20", type: "sale", items: [{ harga: 100000, hpp: 60000 }] }];
    const result = computeMarginPerPcs(rows, { today });
    expect(result.totalPcs).toBe(0);
  });
});

describe("computeBepLokasi", () => {
  it("mengembalikan nol untuk semua field ketika marginPerPcs <= 0", () => {
    const result = computeBepLokasi(DEFAULT_BIAYA_PASAR.cideng, "cideng", 0, 100000);
    expect(result.pcsPerHari).toBe(0);
    expect(result.omzetPerTahun).toBe(0);
    expect(result.hppPasar).toBeDefined();
  });

  it("mengembalikan nol ketika marginPerPcs negatif", () => {
    const result = computeBepLokasi(DEFAULT_BIAYA_PASAR.cideng, "cideng", -500, 100000);
    expect(result.pcsPerHari).toBe(0);
  });

  it("menghitung BEP pcs & omzet untuk marginPerPcs positif", () => {
    const result = computeBepLokasi(DEFAULT_BIAYA_PASAR.cideng, "cideng", 50000, 150000);
    expect(result.pcsPerHari).toBeGreaterThan(0);
    expect(result.omzetPerHari).toBeCloseTo(result.pcsPerHari * 150000, 5);
    expect(result.omzetPerMinggu).toBeCloseTo(result.pcsPerMinggu * 150000, 5);
    expect(result.omzetPerBulan).toBeCloseTo(result.pcsPerBulan * 150000, 5);
    expect(result.omzetPerTahun).toBeCloseTo(result.pcsPerTahun * 150000, 5);
  });
});

describe("findEarliestMarketDate", () => {
  it("mengembalikan null ketika tidak ada baris sama sekali", () => {
    expect(findEarliestMarketDate([])).toBeNull();
  });

  it("mengabaikan lokasi gudang (bukan lokasi pasar)", () => {
    expect(findEarliestMarketDate([{ location: "gudang", date: "2026-01-01" }])).toBeNull();
  });

  it("mengabaikan baris tanpa date", () => {
    expect(findEarliestMarketDate([{ location: "cideng" }])).toBeNull();
  });

  it("menemukan tanggal paling awal di antara beberapa baris lokasi pasar", () => {
    const rows = [
      { location: "cideng", date: "2026-03-10" },
      { location: "tegalgubug", date: "2026-01-05" },
      { location: "cideng", date: "2026-02-15" },
      { location: "gudang", date: "2025-01-01" },
    ];
    expect(findEarliestMarketDate(rows)).toBe("2026-01-05");
  });

  it("tetap mempertahankan earliest ketika baris berikutnya tidak lebih awal", () => {
    const rows = [
      { location: "cideng", date: "2026-01-05" },
      { location: "cideng", date: "2026-02-01" },
    ];
    expect(findEarliestMarketDate(rows)).toBe("2026-01-05");
  });
});

describe("computeSaldoHarian", () => {
  it("mengembalikan ledger kosong & saldoAkhir 0 ketika startDate tidak diberikan", () => {
    const result = computeSaldoHarian({ salesRows: [], biayaMap: {}, marginPerPcs: 0, startDate: null });
    expect(result).toEqual({ ledger: [], saldoAkhir: 0 });
  });

  it("mereplay saldo harian lintas hari pasar & non-pasar dengan endDate eksplisit", () => {
    const result = computeSaldoHarian({
      salesRows: [
        { date: "2024-01-01", type: "sale", items: [{ harga: 200000, hpp: 100000, qty: 1 }] },
        { date: undefined, type: "sale", items: [{ harga: 1, hpp: 1, qty: 1 }] },
      ],
      biayaMap: DEFAULT_BIAYA_PASAR,
      marginPerPcs: 50000,
      startDate: "2024-01-01",
      endDate: "2024-01-05",
    });
    expect(result.ledger).toHaveLength(5);
    // 2024-01-01 = Senin -> cideng (market day)
    expect(result.ledger[0].lokasi).toBe("cideng");
    expect(result.ledger[0].isMarketDay).toBe(true);
    // 2024-01-02 = Selasa -> gudang (bukan market day)
    expect(result.ledger[1].lokasi).toBe("gudang");
    expect(result.ledger[1].isMarketDay).toBe(false);
    expect(result.ledger[1].hppPasarHariIni).toBe(0);
    expect(result.saldoAkhir).toBeCloseTo(result.ledger[4].saldoBaru, 5);
  });

  it("default endDate ke hari ini ketika tidak diberikan", () => {
    const todayStr = localDateStr();
    const result = computeSaldoHarian({
      salesRows: [],
      biayaMap: {},
      marginPerPcs: 0,
      startDate: todayStr,
    });
    expect(result.ledger).toHaveLength(1);
    expect(result.ledger[0].tanggal).toBe(todayStr);
  });

  it("status DEFISIT ketika saldoBaru negatif, TABUNGAN ketika >= 0", () => {
    const result = computeSaldoHarian({
      salesRows: [],
      biayaMap: DEFAULT_BIAYA_PASAR,
      marginPerPcs: 50000,
      startDate: "2024-01-01", // Senin, market day cideng -> ongkos > 0, tanpa penjualan -> defisit
      endDate: "2024-01-01",
    });
    expect(result.ledger[0].status).toBe("DEFISIT");

    const result2 = computeSaldoHarian({
      salesRows: [],
      biayaMap: DEFAULT_BIAYA_PASAR,
      marginPerPcs: 50000,
      startDate: "2024-01-02", // Selasa, bukan market day -> ongkos 0 -> saldo tetap 0 -> TABUNGAN
      endDate: "2024-01-02",
    });
    expect(result2.ledger[0].status).toBe("TABUNGAN");
  });

  it("targetPcsHariIni 0 ketika marginPerPcs tidak positif", () => {
    const result = computeSaldoHarian({
      salesRows: [],
      biayaMap: DEFAULT_BIAYA_PASAR,
      marginPerPcs: 0,
      startDate: "2024-01-01",
      endDate: "2024-01-01",
    });
    expect(result.ledger[0].targetPcsHariIni).toBe(0);
  });

  it("mengakumulasi >1 transaksi pada tanggal yang sama termasuk retur & items hilang", () => {
    const result = computeSaldoHarian({
      salesRows: [
        { date: "2024-01-01", type: "sale", items: [{ harga: 200000, hpp: 100000, qty: 2 }] },
        { date: "2024-01-01", type: "retur", items: [{ harga: 200000, hpp: 100000, qty: 1 }] },
        { date: "2024-01-01", type: "sale" }, // tanpa field items -> fallback ke []
      ],
      biayaMap: DEFAULT_BIAYA_PASAR,
      marginPerPcs: 50000,
      startDate: "2024-01-01",
      endDate: "2024-01-01",
    });
    expect(result.ledger[0].pcsLakuAktual).toBe(1);
    expect(result.ledger[0].marginTerkumpul).toBe(100000);
  });
});

describe("computeTargetProduksi", () => {
  it("menghitung target dengan default params (minggu depan)", () => {
    const result = computeTargetProduksi({
      saldoBerjalan: 0,
      biayaMap: DEFAULT_BIAYA_PASAR,
      marginPerPcs: 50000,
      biayaPerPcs: 30000,
    });
    expect(result.hppPasarPeriode).toBeGreaterThan(0);
    expect(result.targetProduksiPcs).toBeGreaterThanOrEqual(0);
    expect(result.modalBahanDibutuhkan).toBeCloseTo(result.targetProduksiPcs * 30000, 5);
  });

  it("pcsOngkosPasar 0 ketika marginPerPcs tidak positif", () => {
    const result = computeTargetProduksi({
      saldoBerjalan: 0,
      biayaMap: DEFAULT_BIAYA_PASAR,
      marginPerPcs: 0,
      biayaPerPcs: 30000,
    });
    expect(result.pcsOngkosPasar).toBe(0);
  });

  it("modalBahanDibutuhkan 0 ketika biayaPerPcs tidak diberikan", () => {
    const result = computeTargetProduksi({
      saldoBerjalan: 1_000_000,
      biayaMap: DEFAULT_BIAYA_PASAR,
      marginPerPcs: 50000,
    });
    expect(result.modalBahanDibutuhkan).toBe(0);
  });

  it("pcsKejarUtang null dianggap 0 lewat nullish coalescing", () => {
    const result = computeTargetProduksi({
      saldoBerjalan: 0,
      biayaMap: DEFAULT_BIAYA_PASAR,
      marginPerPcs: 50000,
      pcsTambahanPerMinggu: null,
    });
    expect(result.pcsTambahanPerMinggu).toBe(0);
    expect(result.pcsKejarUtang).toBe(0);
  });

  it("pcsKejarUtang proporsional terhadap hariKeDepan untuk pace mingguan eksplisit", () => {
    const result = computeTargetProduksi({
      saldoBerjalan: 0,
      biayaMap: DEFAULT_BIAYA_PASAR,
      marginPerPcs: 50000,
      pcsTambahanPerMinggu: 14,
      hariKeDepan: 7,
      mulaiOffsetHari: 0,
    });
    expect(result.pcsKejarUtang).toBeCloseTo(14, 5);
  });
});

describe("getSisaHariMingguIni", () => {
  it("mengembalikan 1 ketika hari ini Minggu", () => {
    // 2026-06-28 adalah Minggu
    expect(getSisaHariMingguIni(new Date(2026, 5, 28))).toBe(1);
  });

  it("mengembalikan sisa hari sampai Minggu untuk hari kerja", () => {
    // 2026-06-30 adalah Selasa (dow=2) -> 7-2+1=6
    expect(getSisaHariMingguIni(new Date(2026, 5, 30))).toBe(6);
  });

  it("mengembalikan 7 ketika hari ini Senin", () => {
    // 2024-01-01 adalah Senin (dow=1) -> 7-1+1=7
    expect(getSisaHariMingguIni(new Date(2024, 0, 1))).toBe(7);
  });
});

describe("computeKebutuhanBahanMingguan", () => {
  it("menghitung pcs & modal mingguan dalam window default", () => {
    const today = new Date(2026, 5, 30);
    const rows = [
      { date: "2026-06-20", type: "sale", items: [{ qty: 7 }] },
      { date: "2026-06-25", type: "sale", items: [{ qty: 7 }] },
    ];
    const result = computeKebutuhanBahanMingguan(rows, 50000, { today });
    expect(result.totalPcs).toBe(14);
    expect(result.pcsPerMinggu).toBeGreaterThan(0);
    expect(result.modalBahanMingguan).toBeCloseTo(result.pcsPerMinggu * 50000, 5);
  });

  it("mengurangi totalPcs untuk retur", () => {
    const today = new Date(2026, 5, 30);
    const rows = [
      { date: "2026-06-20", type: "sale", items: [{ qty: 10 }] },
      { date: "2026-06-21", type: "retur", items: [{ qty: 2 }] },
    ];
    const result = computeKebutuhanBahanMingguan(rows, 50000, { today });
    expect(result.totalPcs).toBe(8);
  });

  it("fallback ke seluruh data ketika window kosong lalu mengembalikan nol bila tetap kosong", () => {
    const result = computeKebutuhanBahanMingguan([], 50000, { windowDays: 7 });
    expect(result.totalPcs).toBe(0);
    expect(result.pcsPerMinggu).toBe(0);
    expect(result.modalBahanMingguan).toBe(0);
  });

  it("effectiveWindowDays dari rentang tanggal asli ketika windowDays=0 dan ada >=2 tanggal", () => {
    const rows = [
      { date: "2026-06-01", type: "sale", items: [{ qty: 7 }] },
      { date: "2026-06-15", type: "sale", items: [{ qty: 7 }] },
    ];
    const result = computeKebutuhanBahanMingguan(rows, 10000, { windowDays: 0 });
    expect(result.effectiveWindowDays).toBe(14);
  });

  it("effectiveWindowDays default 1 ketika windowDays=0 dan tanggal < 2 entri unik", () => {
    const rows = [{ date: "2026-06-01", type: "sale", items: [{ qty: 3 }] }];
    const result = computeKebutuhanBahanMingguan(rows, 10000, { windowDays: 0 });
    expect(result.effectiveWindowDays).toBe(1);
  });

  it("effectiveWindowDays default 1 ketika windowDays=0 dan tidak ada tanggal sama sekali", () => {
    const result = computeKebutuhanBahanMingguan([{ type: "sale", items: [] }], 10000, { windowDays: 0 });
    expect(result.effectiveWindowDays).toBe(1);
  });

  it("baris tanpa date diabaikan filter window (fallback ke string kosong)", () => {
    const today = new Date(2026, 5, 30);
    const rows = [{ type: "sale", items: [{ qty: 7 }] }];
    const result = computeKebutuhanBahanMingguan(rows, 50000, { today, windowDays: 60 });
    expect(result.totalPcs).toBe(7);
  });

  it("baris tanpa field items memakai fallback array kosong", () => {
    const today = new Date(2026, 5, 30);
    const rows = [{ date: "2026-06-20", type: "sale" }];
    const result = computeKebutuhanBahanMingguan(rows, 50000, { today, windowDays: 60 });
    expect(result.totalPcs).toBe(0);
  });

  it("modalBahanMingguan fallback ke 0 ketika hppRataRata tidak diberikan", () => {
    const today = new Date(2026, 5, 30);
    const rows = [{ date: "2026-06-20", type: "sale", items: [{ qty: 7 }] }];
    const result = computeKebutuhanBahanMingguan(rows, undefined, { today });
    expect(result.modalBahanMingguan).toBe(0);
  });
});

describe("computeProyeksiUtangVsSaldo", () => {
  it("biayaMap & utangRows undefined tidak menyebabkan error (nullish fallback)", () => {
    const result = computeProyeksiUtangVsSaldo({
      saldoSaatIni: 0,
      marginPerPcs: 1000,
      pcsPerMinggu: 10,
    });
    expect(result.skedul).toEqual([]);
    expect(result.netPerMinggu).toBe(10000);
    expect(result.bulanKekurangan).toBeNull();
    expect(result.totalUtang).toBe(0);
  });

  it("mengabaikan baris tanpa jatuh_tempo atau total_harga <= 0", () => {
    const result = computeProyeksiUtangVsSaldo({
      utangRows: [
        { jatuh_tempo: null, total_harga: 1000 },
        { jatuh_tempo: "2026-08-01", total_harga: 0 },
        { jatuh_tempo: "2026-08-01", total_harga: -500 },
      ],
      saldoSaatIni: 0,
      marginPerPcs: 1000,
      pcsPerMinggu: 10,
      biayaMap: {},
    });
    expect(result.skedul).toEqual([]);
  });

  it("mengakumulasi utang per bulan & menjaga tanggalTerakhir paling besar", () => {
    const today = new Date(2026, 5, 1);
    const result = computeProyeksiUtangVsSaldo({
      utangRows: [
        { jatuh_tempo: "2026-08-05", total_harga: 1_000_000 },
        { jatuh_tempo: "2026-08-20", total_harga: 500_000 },
        { jatuh_tempo: "2026-08-10", total_harga: 250_000 },
      ],
      saldoSaatIni: 10_000_000,
      marginPerPcs: 50000,
      pcsPerMinggu: 100,
      biayaMap: DEFAULT_BIAYA_PASAR,
      today,
    });
    expect(result.skedul).toHaveLength(1);
    expect(result.skedul[0].tanggalTerakhir).toBe("2026-08-20");
    expect(result.skedul[0].cumulativeUtang).toBe(1_750_000);
    expect(result.totalUtang).toBe(1_750_000);
  });

  it("menandai bulanKekurangan pada defisit pertama & tidak menimpa pada defisit berikutnya", () => {
    const today = new Date(2026, 5, 1);
    const result = computeProyeksiUtangVsSaldo({
      utangRows: [
        { jatuh_tempo: "2026-07-01", total_harga: 100_000_000 },
        { jatuh_tempo: "2026-09-01", total_harga: 100_000_000 },
      ],
      saldoSaatIni: 0,
      marginPerPcs: 1000,
      pcsPerMinggu: 1,
      biayaMap: {},
      today,
    });
    expect(result.bulanKekurangan).toBe("2026-07");
    expect(result.skedul[0].aman).toBe(false);
    expect(result.skedul[1].aman).toBe(false);
    expect(result.skedul[0].pcsTambahanDibutuhkan).toBeGreaterThan(0);
    expect(result.skedul[0].pcsTambahanPerMinggu).toBeGreaterThan(0);
  });

  it("aman=true ketika saldo proyeksi cukup menutup utang", () => {
    const today = new Date(2026, 5, 1);
    const result = computeProyeksiUtangVsSaldo({
      utangRows: [{ jatuh_tempo: "2026-07-01", total_harga: 100_000 }],
      saldoSaatIni: 50_000_000,
      marginPerPcs: 1000,
      pcsPerMinggu: 1,
      biayaMap: {},
      today,
    });
    expect(result.skedul[0].aman).toBe(true);
    expect(result.skedul[0].pcsTambahanDibutuhkan).toBe(0);
    expect(result.skedul[0].pcsTambahanPerMinggu).toBe(0);
  });

  it("mingguKeDepan diklem ke 0 ketika jatuh_tempo sudah lewat dari today", () => {
    const today = new Date(2026, 8, 1); // September, lebih lambat dari jatuh tempo Juli
    const result = computeProyeksiUtangVsSaldo({
      utangRows: [{ jatuh_tempo: "2026-07-01", total_harga: 1_000_000 }],
      saldoSaatIni: 0,
      marginPerPcs: 1000,
      pcsPerMinggu: 1,
      biayaMap: {},
      today,
    });
    expect(result.skedul[0].mingguKeDepan).toBe(0);
    // mingguKeDepan=0 -> pcsTambahanPerMinggu jatuh ke cabang "pcsTambahanDibutuhkan" langsung
    expect(result.skedul[0].pcsTambahanPerMinggu).toBe(result.skedul[0].pcsTambahanDibutuhkan);
  });

  it("netPerMinggu fallback ke 0 untuk marginPerPcs & pcsPerMinggu yang tidak diberikan", () => {
    const result = computeProyeksiUtangVsSaldo({
      saldoSaatIni: 0,
      biayaMap: {},
    });
    expect(result.netPerMinggu).toBe(0);
  });
});
