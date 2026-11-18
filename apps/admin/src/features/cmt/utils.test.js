import { describe, it, expect } from "vitest";
import {
  newKirimItem,
  newSetoranFullItem,
  kirimGroupStatus,
  statusLabel,
  groupKirimByNo,
  calcTotalUpahSetoranFull,
} from "./utils";

describe("newKirimItem / newSetoranFullItem", () => {
  it("newKirimItem returns blank fields", () => {
    expect(newKirimItem()).toEqual({
      kode_produk: "",
      nama_produk: "",
      size: "",
      warna: "",
      qty: "",
    });
  });
  it("newSetoranFullItem returns blank fields", () => {
    expect(newSetoranFullItem()).toEqual({ size: "", warna: "", qty: "" });
  });
});

describe("kirimGroupStatus", () => {
  it("kosong -> dikirim (fallback)", () => {
    expect(kirimGroupStatus([])).toBe("dikirim");
  });
  it("semua batal -> batal", () => {
    expect(kirimGroupStatus([{ status: "batal" }, { status: "batal" }])).toBe("batal");
  });
  it("ada yang dikirim -> dikirim (prioritas tertinggi)", () => {
    expect(kirimGroupStatus([{ status: "selesai" }, { status: "dikirim" }])).toBe("dikirim");
  });
  it("tidak ada dikirim, ada setor -> setor", () => {
    expect(kirimGroupStatus([{ status: "selesai" }, { status: "setor" }])).toBe("setor");
  });
  it("semua selesai (atau selesai+batal) -> selesai", () => {
    expect(kirimGroupStatus([{ status: "selesai" }, { status: "batal" }])).toBe("selesai");
  });
});

describe("statusLabel", () => {
  it("setor", () => expect(statusLabel("setor")).toBe("Sudah Setor — Menunggu Finishing"));
  it("selesai", () => expect(statusLabel("selesai")).toBe("Selesai"));
  it("batal", () => expect(statusLabel("batal")).toBe("Dibatalkan"));
  it("dikirim / unknown", () => {
    expect(statusLabel("dikirim")).toBe("Dikirim ke Vendor");
    expect(statusLabel("apa-saja")).toBe("Dikirim ke Vendor");
  });
});

describe("groupKirimByNo", () => {
  it("kosong -> []", () => {
    expect(groupKirimByNo([])).toEqual([]);
  });

  it("mengelompokkan baris per kirim_no, hitung totalQtyKirim/totalQtySetor", () => {
    const rows = [
      {
        id: "r1",
        kirim_no: "CMT-1",
        nama_vendor: "Vendor A",
        tanggal_kirim: "2026-11-18",
        estimasi_selesai: null,
        tanggal_setor: null,
        harga_upah: 7000,
        status: "dikirim",
        size: "Midi",
        warna: "HITAM",
        qty: 10,
        qty_setor: null,
      },
      {
        id: "r2",
        kirim_no: "CMT-1",
        nama_vendor: "Vendor A",
        tanggal_kirim: "2026-11-18",
        estimasi_selesai: null,
        tanggal_setor: null,
        harga_upah: 7000,
        status: "dikirim",
        size: "Gamis",
        warna: "MERAH",
        qty: 5,
        qty_setor: null,
      },
    ];
    const groups = groupKirimByNo(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      kirimNo: "CMT-1",
      namaVendor: "Vendor A",
      status: "dikirim",
      totalQtyKirim: 15,
      totalQtySetor: 0,
    });
    expect(groups[0].rows).toHaveLength(2);
  });

  it("dua kirim_no berbeda -> dua grup terpisah, urutan sesuai kemunculan pertama", () => {
    const rows = [
      {
        id: "r1",
        kirim_no: "CMT-1",
        nama_vendor: "Vendor A",
        qty: 10,
        qty_setor: 10,
        status: "setor",
      },
      {
        id: "r2",
        kirim_no: "CMT-2",
        nama_vendor: "Vendor B",
        qty: 5,
        qty_setor: null,
        status: "dikirim",
      },
    ];
    const groups = groupKirimByNo(rows);
    expect(groups.map((g) => g.kirimNo)).toEqual(["CMT-1", "CMT-2"]);
  });
});

describe("calcTotalUpahSetoranFull", () => {
  it("total qty x harga", () => {
    expect(calcTotalUpahSetoranFull([{ qty: 5 }, { qty: 3 }], 10000)).toBe(80000);
  });
  it("items kosong -> 0", () => {
    expect(calcTotalUpahSetoranFull([], 10000)).toBe(0);
  });
  it("qty/harga string -> tetap dihitung angka", () => {
    expect(calcTotalUpahSetoranFull([{ qty: "5" }], "10000")).toBe(50000);
  });
});
