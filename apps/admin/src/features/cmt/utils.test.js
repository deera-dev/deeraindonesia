import { describe, it, expect } from "vitest";
import {
  newSetoranFullItem,
  newBahanItem,
  kirimGroupStatus,
  statusLabel,
  groupKirimByNo,
  calcTotalUpahSetoranFull,
  groupCardsByKodeSizeWarna,
  groupRowsByKode,
  calcTotalUpahKirim,
} from "./utils";

describe("newSetoranFullItem / newBahanItem", () => {
  it("newSetoranFullItem returns blank fields", () => {
    expect(newSetoranFullItem()).toEqual({ size: "", warna: "", qty: "" });
  });
  it("newBahanItem returns blank fields, satuan default yard", () => {
    expect(newBahanItem()).toEqual({ nama_bahan: "", kode_bahan: "", satuan: "yard", jumlah: "" });
  });
});

describe("groupCardsByKodeSizeWarna", () => {
  it("kosong -> []", () => {
    expect(groupCardsByKodeSizeWarna([])).toEqual([]);
  });

  it("satu kartu -> satu grup, qty & cardIds dari kartu itu", () => {
    const cards = [
      {
        id: "c1",
        kode_produk: "D-01",
        nama_produk: "Gamis A",
        size: "Midi",
        warna: "HITAM",
        qty: 10,
      },
    ];
    expect(groupCardsByKodeSizeWarna(cards)).toEqual([
      {
        kode_produk: "D-01",
        nama_produk: "Gamis A",
        size: "Midi",
        warna: "HITAM",
        qty: 10,
        cardIds: ["c1"],
      },
    ]);
  });

  it("dua kartu kombinasi kode+size+warna sama -> digabung, qty dijumlah, cardIds digabung", () => {
    const cards = [
      {
        id: "c1",
        kode_produk: "D-01",
        nama_produk: "Gamis A",
        size: "Midi",
        warna: "HITAM",
        qty: 10,
      },
      {
        id: "c2",
        kode_produk: "D-01",
        nama_produk: "Gamis A",
        size: "Midi",
        warna: "HITAM",
        qty: 4,
      },
    ];
    const groups = groupCardsByKodeSizeWarna(cards);
    expect(groups).toHaveLength(1);
    expect(groups[0].qty).toBe(14);
    expect(groups[0].cardIds).toEqual(["c1", "c2"]);
  });

  it("kombinasi kode+size+warna beda -> grup terpisah, urutan sesuai kemunculan pertama", () => {
    const cards = [
      { id: "c1", kode_produk: "D-01", size: "Midi", warna: "HITAM", qty: 10 },
      { id: "c2", kode_produk: "D-01", size: "Gamis", warna: "MERAH", qty: 3 },
    ];
    const groups = groupCardsByKodeSizeWarna(cards);
    expect(groups).toHaveLength(2);
    expect(groups.map((g) => g.size)).toEqual(["Midi", "Gamis"]);
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

describe("groupRowsByKode", () => {
  it("kosong -> []", () => {
    expect(groupRowsByKode([])).toEqual([]);
  });

  it("satu kode, beberapa warna -> satu grup, totalQty dijumlah", () => {
    const rows = [
      { kode_produk: "D-01", nama_produk: "Gamis A", size: "Midi", warna: "HITAM", qty: 10 },
      { kode_produk: "D-01", nama_produk: "Gamis A", size: "Midi", warna: "PUTIH", qty: 4 },
    ];
    const groups = groupRowsByKode(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({ kode: "D-01", namaProduk: "Gamis A", totalQty: 14 });
    expect(groups[0].rows).toHaveLength(2);
  });

  it("dua kode berbeda -> dua grup terpisah, urutan sesuai kemunculan pertama", () => {
    const rows = [
      { kode_produk: "D-02", size: "Gamis", warna: "MERAH", qty: 3 },
      { kode_produk: "D-01", size: "Midi", warna: "HITAM", qty: 10 },
    ];
    const groups = groupRowsByKode(rows);
    expect(groups.map((g) => g.kode)).toEqual(["D-02", "D-01"]);
  });
});

describe("calcTotalUpahKirim", () => {
  it("pakai qty kirim kalau belum disetor (qty_setor null)", () => {
    const group = {
      hargaUpah: 7000,
      rows: [
        { qty: 10, qty_setor: null },
        { qty: 5, qty_setor: null },
      ],
    };
    expect(calcTotalUpahKirim(group)).toBe(105000);
  });

  it("pakai qty_setor kalau sudah disetor (angka betulan, bukan rencana kirim)", () => {
    const group = { hargaUpah: 7000, rows: [{ qty: 10, qty_setor: 8 }] };
    expect(calcTotalUpahKirim(group)).toBe(56000);
  });

  it("hargaUpah 0 -> total 0", () => {
    expect(calcTotalUpahKirim({ hargaUpah: 0, rows: [{ qty: 10, qty_setor: null }] })).toBe(0);
  });

  it("rows kosong/undefined -> 0, tidak crash", () => {
    expect(calcTotalUpahKirim({ hargaUpah: 7000, rows: [] })).toBe(0);
    expect(calcTotalUpahKirim({ hargaUpah: 7000 })).toBe(0);
  });
});
