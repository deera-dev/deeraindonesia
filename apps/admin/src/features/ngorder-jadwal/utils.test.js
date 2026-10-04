import { describe, it, expect } from "vitest";
import {
  fmtRp, localDateStr, fmtTanggalRange, durasiHari, totalBiaya, biayaPerKategori, summarizeTrip, sortTrips,
  validateTrip, addTokoToTrip, removeTokoFromTrip, toggleTokoVisited, addSampelToTrip, removeSampelFromTrip,
  changeSampelQty, addBiaya, removeBiaya, duplicateTripPayload, buildTripShareText,
} from "./utils";

describe("format", () => {
  it("fmtRp", () => {
    expect(fmtRp(1250000)).toBe("Rp 1.250.000");
    expect(fmtRp(null)).toBe("Rp 0");
  });
  it("localDateStr memakai tanggal lokal", () => {
    expect(localDateStr(new Date(2026, 9, 3, 23, 59))).toBe("2026-10-03");
  });
  it("fmtTanggalRange: sama hari / satu bulan / lintas bulan / lintas tahun", () => {
    expect(fmtTanggalRange("2026-10-03", "2026-10-03")).toBe("3 Okt 2026");
    expect(fmtTanggalRange("2026-10-03", "2026-10-07")).toBe("3–7 Okt 2026");
    expect(fmtTanggalRange("2026-09-30", "2026-10-02")).toBe("30 Sep – 2 Okt 2026");
    expect(fmtTanggalRange("2026-12-30", "2027-01-02")).toBe("30 Des 2026 – 2 Jan 2027");
    expect(fmtTanggalRange("", "")).toBe("");
  });
  it("durasiHari inklusif", () => {
    expect(durasiHari("2026-10-03", "2026-10-03")).toBe(1);
    expect(durasiHari("2026-10-03", "2026-10-07")).toBe(5);
    expect(durasiHari("2026-09-30", "2026-10-02")).toBe(3);
  });
});

describe("biaya & ringkasan", () => {
  const biaya = [
    { kategori: "bensin", jumlah: 200000 },
    { kategori: "makan", jumlah: 50000 },
    { kategori: "bensin", jumlah: 100000 },
    { kategori: "tol", jumlah: 0 },
  ];
  it("totalBiaya & biayaPerKategori (terbesar dulu, tanpa nol)", () => {
    expect(totalBiaya(biaya)).toBe(350000);
    expect(biayaPerKategori(biaya)).toEqual([
      { key: "bensin", label: "Bensin", total: 300000 },
      { key: "makan", label: "Makan", total: 50000 },
    ]);
  });
  it("summarizeTrip", () => {
    const s = summarizeTrip({
      tanggal_mulai: "2026-10-03", tanggal_selesai: "2026-10-05", modal_awal: 300000, biaya,
      toko: [{ dikunjungi: true }, { dikunjungi: false }],
      sampel: [{ qty: 10, terbagi: 4 }, { qty: 5, terbagi: 1 }],
    });
    expect(s).toMatchObject({
      hari: 3, totalToko: 2, dikunjungi: 1, sampelBawa: 15, sampelTerbagi: 5,
      modal: 300000, terpakai: 350000, sisa: -50000, overBudget: true, persenModal: 100,
    });
  });
  it("summarizeTrip aman utk trip kosong", () => {
    expect(summarizeTrip({})).toMatchObject({ totalToko: 0, modal: 0, terpakai: 0, overBudget: false, persenModal: 0 });
  });
});

describe("sortTrips", () => {
  it("berjalan, rencana (terdekat dulu), lalu selesai/batal (terbaru dulu)", () => {
    const t = [
      { id: "s1", status: "selesai", tanggal_mulai: "2026-01-01" },
      { id: "r2", status: "rencana", tanggal_mulai: "2026-12-01" },
      { id: "b", status: "berjalan", tanggal_mulai: "2026-10-01" },
      { id: "r1", status: "rencana", tanggal_mulai: "2026-11-01" },
      { id: "s2", status: "selesai", tanggal_mulai: "2026-03-01" },
    ];
    expect(sortTrips(t).map((x) => x.id)).toEqual(["b", "r1", "r2", "s2", "s1"]);
  });
});

describe("validateTrip", () => {
  it("pesan error yang sesuai", () => {
    expect(validateTrip({ nama: " ", tanggal_mulai: "a", tanggal_selesai: "b" })).toMatch(/Nama/);
    expect(validateTrip({ nama: "x", tanggal_mulai: "", tanggal_selesai: "" })).toMatch(/Tanggal/);
    expect(validateTrip({ nama: "x", tanggal_mulai: "2026-10-05", tanggal_selesai: "2026-10-03" })).toMatch(/sebelum/);
    expect(validateTrip({ nama: "x", tanggal_mulai: "2026-10-03", tanggal_selesai: "2026-10-03" })).toBe("");
  });
});

describe("mutasi array", () => {
  it("toko: tambah tanpa duplikat, toggle, hapus", () => {
    let l = addTokoToTrip([], { id: "t1", nama: "A", daerah: "Tegal" });
    l = addTokoToTrip(l, { id: "t1", nama: "A" });
    expect(l).toEqual([{ toko_id: "t1", nama: "A", daerah: "Tegal", dikunjungi: false }]);
    l = toggleTokoVisited(l, "t1");
    expect(l[0].dikunjungi).toBe(true);
    expect(removeTokoFromTrip(l, "t1")).toEqual([]);
  });
  it("sampel: tambah, qty/terbagi dijepit", () => {
    let l = addSampelToTrip([], { kode: "D-01", nama: "X" });
    l = addSampelToTrip(l, { kode: "D-01" });
    expect(l).toHaveLength(1);
    l = changeSampelQty(l, "D-01", "qty", 4);
    expect(l[0].qty).toBe(5);
    l = changeSampelQty(l, "D-01", "terbagi", 10);
    expect(l[0].terbagi).toBe(5);
    l = changeSampelQty(l, "D-01", "qty", -3);
    expect(l[0]).toMatchObject({ qty: 2, terbagi: 2 });
    l = changeSampelQty(l, "D-01", "terbagi", -10);
    expect(l[0].terbagi).toBe(0);
    expect(removeSampelFromTrip(l, "D-01")).toEqual([]);
  });
  it("biaya: tambah (jumlah <= 0 diabaikan), hapus by id", () => {
    expect(addBiaya([], { tanggal: "2026-10-03", kategori: "tol", jumlah: 0 })).toEqual([]);
    const l = addBiaya([], { tanggal: "2026-10-03", kategori: "tol", jumlah: "75000", catatan: " Cikampek " });
    expect(l[0]).toMatchObject({ kategori: "tol", jumlah: 75000, catatan: "Cikampek" });
    expect(l[0].id).toBeTruthy();
    expect(removeBiaya(l, l[0].id)).toEqual([]);
  });
});

describe("duplicateTripPayload & buildTripShareText", () => {
  const trip = {
    nama: "Jateng", status: "selesai", tanggal_mulai: "2026-10-03", tanggal_selesai: "2026-10-05",
    daerah: ["Tegal"], peserta: ["Denny", "Budi"], modal_awal: 500000,
    sampel: [{ kode: "D-01", nama: "X", qty: 10, terbagi: 4 }],
    toko: [{ toko_id: "t1", nama: "A", dikunjungi: true }],
    biaya: [{ id: "1", kategori: "bensin", jumlah: 200000 }],
  };
  it("duplikat: reset progres, biaya, modal, status", () => {
    const d = duplicateTripPayload(trip, "2026-11-01");
    expect(d).toMatchObject({ nama: "Jateng (salinan)", tanggal_mulai: "2026-11-01", modal_awal: 0, status: "rencana", biaya: [] });
    expect(d.sampel[0].terbagi).toBe(0);
    expect(d.toko[0].dikunjungi).toBe(false);
  });
  it("teks bagikan memuat info utama", () => {
    const t = buildTripShareText(trip);
    expect(t).toContain("*Jateng* (Selesai)");
    expect(t).toContain("3–5 Okt 2026 (3 hari)");
    expect(t).toContain("Daerah: Tegal");
    expect(t).toContain("Berangkat: Denny, Budi");
    expect(t).toContain("Toko: 1/1 dikunjungi");
    expect(t).toContain("bawa 10 pcs, terbagi 4 pcs");
    expect(t).toContain("sisa Rp 300.000");
  });
});

import { monthGrid, tripsOnDate, tripsInMonth, layoutWeekBars } from "./utils";

describe("kalender bulanan", () => {
  it("monthGrid Okt 2026: Senin pertama, 5 minggu, 7 hari per minggu", () => {
    const g = monthGrid(2026, 9);
    expect(g).toHaveLength(5);
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g[0][0]).toBe("2026-09-28"); // 1 Okt 2026 = Kamis
    expect(g[0][3]).toBe("2026-10-01");
    expect(g[4][6]).toBe("2026-11-01");
  });
  it("monthGrid: bulan yg mulai hari Senin = 4 minggu (Feb 2027) & bulan 6 minggu", () => {
    expect(monthGrid(2027, 1)).toHaveLength(4); // 1 Feb 2027 = Senin, 28 hari
    expect(monthGrid(2026, 7)).toHaveLength(6); // 1 Agu 2026 = Sabtu, 31 hari
  });

  const trips = [
    { id: "a", nama: "A", tanggal_mulai: "2026-10-03", tanggal_selesai: "2026-10-07" },
    { id: "b", nama: "B", tanggal_mulai: "2026-10-06", tanggal_selesai: "2026-10-08" },
    { id: "c", nama: "C", tanggal_mulai: "2026-10-09", tanggal_selesai: "2026-10-12" },
    { id: "d", nama: "D", tanggal_mulai: "2026-12-01", tanggal_selesai: "2026-12-02" },
  ];
  it("tripsOnDate inklusif di kedua ujung", () => {
    expect(tripsOnDate(trips, "2026-10-07").map((t) => t.id)).toEqual(["a", "b"]);
    expect(tripsOnDate(trips, "2026-10-13")).toEqual([]);
  });
  it("tripsInMonth: yang beririsan dgn bulan itu (termasuk melintas bulan)", () => {
    expect(tripsInMonth(trips, 2026, 9).map((t) => t.id)).toEqual(["a", "b", "c"]);
    expect(tripsInMonth([{ id: "x", nama: "X", tanggal_mulai: "2026-09-30", tanggal_selesai: "2026-10-02" }], 2026, 9)).toHaveLength(1);
    expect(tripsInMonth(trips, 2026, 10)).toEqual([]);
  });
  it("layoutWeekBars: potong di tepi minggu, baris terpisah kalau tumpang tindih", () => {
    const week = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08", "2026-10-09", "2026-10-10", "2026-10-11"];
    const { bars, rows } = layoutWeekBars(trips, week);
    const by = Object.fromEntries(bars.map((b) => [b.trip.id, b]));
    expect(rows).toBe(2);
    expect(by.a).toMatchObject({ start: 0, span: 3, row: 0, contLeft: true, contRight: false });
    expect(by.b).toMatchObject({ start: 1, span: 3, row: 1 });
    expect(by.c).toMatchObject({ start: 4, span: 3, row: 0, contLeft: false, contRight: true });
    expect(by.d).toBeUndefined();
  });
});
