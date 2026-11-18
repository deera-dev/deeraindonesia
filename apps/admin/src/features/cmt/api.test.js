import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock("@deera/shared/features/auth/api", () => ({
  displayName: vi.fn((user) => user?.user_metadata?.full_name ?? user?.email ?? null),
}));
vi.mock("../history/api", () => ({
  logHistory: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import {
  generateKirimNo,
  fetchCmtJahitKirim,
  fetchAvailablePotonganByKode,
  createKirimCmtJahit,
  setorKirimCmtJahit,
  batalKirimCmtJahit,
  fetchCmtSetoranFull,
  createSetoranFull,
  fetchCmtFullKirim,
  createCmtFullKirim,
  deleteCmtFullKirim,
} from "./api";

function makeOrderChain(returnVal = { data: [], error: null }) {
  const chain = {
    select: vi.fn(),
    neq: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    is: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
    then: (resolve) => resolve(returnVal),
  };
  for (const key of ["select", "neq", "eq", "in", "is", "limit", "order"]) {
    chain[key].mockReturnValue(chain);
  }
  return chain;
}
function makeInsertSelectChain(returnVal = { data: [], error: null }) {
  return { insert: vi.fn().mockReturnThis(), select: vi.fn().mockResolvedValue(returnVal) };
}
function makeInsertSelectSingleChain(returnVal = { data: null, error: null }) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnVal),
  };
}
function makeUpdateEqChain(returnVal = { error: null }) {
  return { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue(returnVal) };
}
function makeUpdateInChain(returnVal = { error: null }) {
  return { update: vi.fn().mockReturnThis(), in: vi.fn().mockResolvedValue(returnVal) };
}
function makeInsertChain(returnVal = { error: null }) {
  return { insert: vi.fn().mockResolvedValue(returnVal) };
}

const user = { email: "a@b.com", user_metadata: { full_name: "A" } };

beforeEach(() => vi.clearAllMocks());

describe("generateKirimNo", () => {
  it("format CMT-YYYYMMDD-xxx", () => {
    expect(generateKirimNo()).toMatch(/^CMT-\d{8}-\d{3}$/);
  });
});

describe("fetchCmtJahitKirim", () => {
  it("select semua kolom, exclude status selesai, urut created_at desc", async () => {
    const chain = makeOrderChain({ data: [{ id: "k1" }], error: null });
    supabase.from.mockReturnValue(chain);

    const result = await fetchCmtJahitKirim();

    expect(supabase.from).toHaveBeenCalledWith("cmt_jahit_kirim");
    expect(chain.neq).toHaveBeenCalledWith("status", "selesai");
    expect(result).toEqual([{ id: "k1" }]);
  });

  it("data null -> array kosong", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: null, error: null }));
    expect(await fetchCmtJahitKirim()).toEqual([]);
  });

  it("throws kalau error", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: null, error: new Error("boom") }));
    await expect(fetchCmtJahitKirim()).rejects.toThrow("boom");
  });
});

describe("fetchAvailablePotonganByKode", () => {
  it("kode kosong -> [] tanpa query", async () => {
    expect(await fetchAvailablePotonganByKode("")).toEqual([]);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("select jahit_cards blm dikirim ke CMT (cmt_jahit_kirim_id null) & blm done", async () => {
    const chain = makeOrderChain({
      data: [{ id: "c1", kode_produk: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 10 }],
      error: null,
    });
    supabase.from.mockReturnValue(chain);

    const result = await fetchAvailablePotonganByKode("D-01-OSK");

    expect(supabase.from).toHaveBeenCalledWith("jahit_cards");
    expect(chain.eq).toHaveBeenCalledWith("kode_produk", "D-01-OSK");
    expect(chain.is).toHaveBeenCalledWith("cmt_jahit_kirim_id", null);
    expect(chain.neq).toHaveBeenCalledWith("status", "done");
    expect(result).toEqual([
      { id: "c1", kode_produk: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 10 },
    ]);
  });

  it("data null -> array kosong", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: null, error: null }));
    expect(await fetchAvailablePotonganByKode("D-01")).toEqual([]);
  });

  it("throws kalau error", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: null, error: new Error("boom") }));
    await expect(fetchAvailablePotonganByKode("D-01")).rejects.toThrow("boom");
  });
});

describe("createKirimCmtJahit", () => {
  const baseArgs = {
    namaVendor: "Vendor A",
    tanggalKirim: "2026-11-18",
    estimasiSelesai: "2026-11-25",
    hargaUpah: "7000",
    cards: [
      {
        id: "c1",
        kode_produk: "D-01-OSK",
        nama_produk: "Gamis A",
        size: "Midi",
        warna: "HITAM",
        qty: 10,
      },
    ],
    catatan: "",
    user,
  };

  function mockSuccessChains(insertReturn = { data: [{ id: "kirim1" }], error: null }) {
    const insertChain = makeInsertSelectChain(insertReturn);
    const linkChain = makeUpdateInChain({ error: null });
    supabase.from.mockImplementation((table) =>
      table === "cmt_jahit_kirim" ? insertChain : linkChain,
    );
    return { insertChain, linkChain };
  }

  it("throws kalau nama vendor kosong", async () => {
    await expect(createKirimCmtJahit({ ...baseArgs, namaVendor: "" })).rejects.toThrow("vendor");
  });

  it("throws kalau cards kosong", async () => {
    await expect(createKirimCmtJahit({ ...baseArgs, cards: [] })).rejects.toThrow("produk");
  });

  it("insert satu baris per kombinasi kode+size+warna, lalu tautkan kartu sumbernya (cmt_jahit_kirim_id) & logHistory", async () => {
    const { insertChain, linkChain } = mockSuccessChains();

    const result = await createKirimCmtJahit(baseArgs);

    const insertedRows = insertChain.insert.mock.calls[0][0];
    expect(insertedRows).toHaveLength(1);
    expect(insertedRows[0]).toMatchObject({
      nama_vendor: "Vendor A",
      kode_produk: "D-01-OSK",
      size: "Midi",
      warna: "HITAM",
      qty: 10,
      harga_upah: 7000,
      status: "dikirim",
      created_by: "a@b.com",
    });
    expect(insertedRows[0].kirim_no).toMatch(/^CMT-\d{8}-\d{3}$/);
    expect(linkChain.update).toHaveBeenCalledWith({ cmt_jahit_kirim_id: "kirim1" });
    expect(linkChain.in).toHaveBeenCalledWith("id", ["c1"]);
    expect(result).toEqual([{ id: "kirim1" }]);
    expect(logHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: "cmt-jahit-kirim", category: "produksi" }),
    );
  });

  it("dua kartu kode+size+warna sama (misal dari 2 batch) -> qty dijumlah jadi satu baris, kedua card id ditautkan", async () => {
    const { insertChain, linkChain } = mockSuccessChains();

    await createKirimCmtJahit({
      ...baseArgs,
      cards: [
        {
          id: "c1",
          kode_produk: "D-01-OSK",
          nama_produk: "Gamis A",
          size: "Midi",
          warna: "HITAM",
          qty: 10,
        },
        {
          id: "c2",
          kode_produk: "D-01-OSK",
          nama_produk: "Gamis A",
          size: "Midi",
          warna: "HITAM",
          qty: 4,
        },
      ],
    });

    expect(insertChain.insert.mock.calls[0][0]).toHaveLength(1);
    expect(insertChain.insert.mock.calls[0][0][0].qty).toBe(14);
    expect(linkChain.in).toHaveBeenCalledWith("id", ["c1", "c2"]);
  });

  it("kode berbeda -> baris terpisah masing2 ditautkan ke kartu sumbernya sendiri", async () => {
    const { insertChain, linkChain } = mockSuccessChains({
      data: [{ id: "kirimA" }, { id: "kirimB" }],
      error: null,
    });

    await createKirimCmtJahit({
      ...baseArgs,
      cards: [
        {
          id: "c1",
          kode_produk: "D-01-OSK",
          nama_produk: "Gamis A",
          size: "Midi",
          warna: "HITAM",
          qty: 10,
        },
        {
          id: "c2",
          kode_produk: "D-02-SFN",
          nama_produk: "Mukena B",
          size: "Gamis",
          warna: "MERAH",
          qty: 3,
        },
      ],
    });

    expect(insertChain.insert.mock.calls[0][0]).toHaveLength(2);
    expect(linkChain.in).toHaveBeenCalledWith("id", ["c1"]);
    expect(linkChain.in).toHaveBeenCalledWith("id", ["c2"]);
  });

  it("harga_upah tidak diisi -> default 0 (opsional, bisa diisi nanti)", async () => {
    const { insertChain } = mockSuccessChains();
    await createKirimCmtJahit({ ...baseArgs, hargaUpah: "" });
    expect(insertChain.insert.mock.calls[0][0][0].harga_upah).toBe(0);
  });

  it("warna kosong -> fallback ke '_'", async () => {
    const { insertChain } = mockSuccessChains();
    await createKirimCmtJahit({
      ...baseArgs,
      cards: [{ id: "c1", kode_produk: "D-01", size: "Midi", warna: "", qty: 5 }],
    });
    expect(insertChain.insert.mock.calls[0][0][0].warna).toBe("_");
  });

  it("throws kalau insert gagal", async () => {
    supabase.from.mockReturnValue(
      makeInsertSelectChain({ data: null, error: new Error("db down") }),
    );
    await expect(createKirimCmtJahit(baseArgs)).rejects.toThrow("db down");
  });

  it("throws kalau tautkan jahit_cards gagal", async () => {
    supabase.from.mockImplementation((table) =>
      table === "cmt_jahit_kirim"
        ? makeInsertSelectChain({ data: [{ id: "kirim1" }], error: null })
        : makeUpdateInChain({ error: new Error("link fail") }),
    );
    await expect(createKirimCmtJahit(baseArgs)).rejects.toThrow("link fail");
  });
});

describe("setorKirimCmtJahit", () => {
  it("throws kalau itemsSetor kosong", async () => {
    await expect(
      setorKirimCmtJahit({ kirimNo: "CMT-1", tanggalSetor: "2026-11-18", itemsSetor: [] }),
    ).rejects.toThrow();
  });

  it("update tiap baris: status setor, qty_setor, tanggal_setor; lalu logHistory", async () => {
    const chain = makeUpdateEqChain({ error: null });
    supabase.from.mockReturnValue(chain);

    await setorKirimCmtJahit({
      kirimNo: "CMT-1",
      tanggalSetor: "2026-11-18",
      itemsSetor: [
        { id: "k1", qtySetor: 9 },
        { id: "k2", qtySetor: 5 },
      ],
    });

    expect(chain.update).toHaveBeenCalledTimes(2);
    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "setor", qty_setor: 9, tanggal_setor: "2026-11-18" }),
    );
    expect(chain.eq).toHaveBeenCalledWith("id", "k1");
    expect(chain.eq).toHaveBeenCalledWith("id", "k2");
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "cmt-jahit-setor" }));
  });

  it("catatan diisi -> ikut di payload update; catatan kosong -> tidak ikut", async () => {
    const chain = makeUpdateEqChain({ error: null });
    supabase.from.mockReturnValue(chain);

    await setorKirimCmtJahit({
      kirimNo: "CMT-1",
      tanggalSetor: "2026-11-18",
      itemsSetor: [{ id: "k1", qtySetor: 1 }],
      catatan: "ok",
    });
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ catatan: "ok" }));

    chain.update.mockClear();
    await setorKirimCmtJahit({
      kirimNo: "CMT-1",
      tanggalSetor: "2026-11-18",
      itemsSetor: [{ id: "k1", qtySetor: 1 }],
    });
    expect(chain.update.mock.calls[0][0]).not.toHaveProperty("catatan");
  });

  it("throws kalau update gagal", async () => {
    supabase.from.mockReturnValue(makeUpdateEqChain({ error: new Error("boom") }));
    await expect(
      setorKirimCmtJahit({
        kirimNo: "CMT-1",
        tanggalSetor: "2026-11-18",
        itemsSetor: [{ id: "k1", qtySetor: 1 }],
      }),
    ).rejects.toThrow("boom");
  });
});

describe("batalKirimCmtJahit", () => {
  it("ids kosong -> tidak query sama sekali", async () => {
    await batalKirimCmtJahit({ kirimNo: "CMT-1", ids: [] });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("update status batal utk semua id, lepas tautan jahit_cards, lalu logHistory", async () => {
    const kirimChain = makeUpdateInChain({ error: null });
    const cardsChain = makeUpdateInChain({ error: null });
    supabase.from.mockImplementation((table) =>
      table === "cmt_jahit_kirim" ? kirimChain : cardsChain,
    );

    await batalKirimCmtJahit({ kirimNo: "CMT-1", ids: ["k1", "k2"] });

    expect(kirimChain.update).toHaveBeenCalledWith(expect.objectContaining({ status: "batal" }));
    expect(kirimChain.in).toHaveBeenCalledWith("id", ["k1", "k2"]);
    expect(cardsChain.update).toHaveBeenCalledWith({ cmt_jahit_kirim_id: null });
    expect(cardsChain.in).toHaveBeenCalledWith("cmt_jahit_kirim_id", ["k1", "k2"]);
    expect(logHistory).toHaveBeenCalledWith(expect.objectContaining({ action: "cmt-jahit-batal" }));
  });

  it("throws kalau update status batal gagal", async () => {
    supabase.from.mockReturnValue(makeUpdateInChain({ error: new Error("boom") }));
    await expect(batalKirimCmtJahit({ kirimNo: "CMT-1", ids: ["k1"] })).rejects.toThrow("boom");
  });

  it("throws kalau lepas tautan jahit_cards gagal", async () => {
    const kirimChain = makeUpdateInChain({ error: null });
    const cardsChain = makeUpdateInChain({ error: new Error("release fail") });
    supabase.from.mockImplementation((table) =>
      table === "cmt_jahit_kirim" ? kirimChain : cardsChain,
    );
    await expect(batalKirimCmtJahit({ kirimNo: "CMT-1", ids: ["k1"] })).rejects.toThrow(
      "release fail",
    );
  });
});

describe("fetchCmtSetoranFull", () => {
  it("select order created_at desc, limit 100", async () => {
    const chain = makeOrderChain({ data: [{ id: "f1" }], error: null });
    supabase.from.mockReturnValue(chain);

    const result = await fetchCmtSetoranFull();

    expect(supabase.from).toHaveBeenCalledWith("cmt_setoran_full");
    expect(chain.limit).toHaveBeenCalledWith(100);
    expect(result).toEqual([{ id: "f1" }]);
  });

  it("throws kalau error", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: null, error: new Error("boom") }));
    await expect(fetchCmtSetoranFull()).rejects.toThrow("boom");
  });
});

describe("createSetoranFull", () => {
  const baseArgs = {
    namaVendor: "Vendor B",
    kodeProduk: "D-02-SFN",
    namaProduk: "Mukena B",
    tanggalSetor: "2026-11-18",
    hargaUpah: "10000",
    items: [
      { size: "Midi", warna: "HITAM", qty: "5" },
      { size: "Gamis", warna: "MERAH", qty: "3" },
    ],
    catatan: "",
    user,
  };

  function mockSuccessChains() {
    const insertChain = makeInsertSelectSingleChain({ data: { id: "f1" }, error: null });
    const logChain = makeInsertChain({ error: null });
    supabase.from.mockImplementation((table) =>
      table === "cmt_setoran_full" ? insertChain : logChain,
    );
    supabase.rpc.mockResolvedValue({ error: null });
    return { insertChain, logChain };
  }

  it("throws kalau nama vendor kosong", async () => {
    await expect(createSetoranFull({ ...baseArgs, namaVendor: "" })).rejects.toThrow("vendor");
  });

  it("throws kalau kode produk kosong", async () => {
    await expect(createSetoranFull({ ...baseArgs, kodeProduk: "" })).rejects.toThrow("Kode produk");
  });

  it("throws kalau tidak ada baris size/warna dgn qty > 0", async () => {
    await expect(
      createSetoranFull({ ...baseArgs, items: [{ size: "Midi", warna: "HITAM", qty: 0 }] }),
    ).rejects.toThrow();
  });

  it("insert row cmt_setoran_full dgn total_upah = total qty x harga, lalu increment_stok_gudang + stok_masuk_log per item", async () => {
    const { insertChain, logChain } = mockSuccessChains();

    const result = await createSetoranFull(baseArgs);

    expect(insertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        nama_vendor: "Vendor B",
        kode_produk: "D-02-SFN",
        harga_upah: 10000,
        total_upah: 80000,
      }),
    );
    expect(supabase.rpc).toHaveBeenCalledTimes(2);
    expect(supabase.rpc).toHaveBeenCalledWith("increment_stok_gudang", {
      p_kode: "D-02-SFN",
      p_size: "Midi",
      p_warna: "HITAM",
      p_delta: 5,
    });
    expect(supabase.rpc).toHaveBeenCalledWith("increment_stok_gudang", {
      p_kode: "D-02-SFN",
      p_size: "Gamis",
      p_warna: "MERAH",
      p_delta: 3,
    });
    expect(logChain.insert).toHaveBeenCalledTimes(2);
    expect(logChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ cmt_setoran_full_id: "f1", qty_ditambahkan: 5 }),
    );
    expect(logHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: "cmt-full-setor", kode: "D-02-SFN" }),
    );
    expect(result).toEqual({ id: "f1" });
  });

  it("item dgn qty 0 diabaikan (tidak masuk RPC)", async () => {
    mockSuccessChains();
    await createSetoranFull({
      ...baseArgs,
      items: [
        { size: "Midi", warna: "HITAM", qty: 5 },
        { size: "Gamis", warna: "MERAH", qty: 0 },
      ],
    });
    expect(supabase.rpc).toHaveBeenCalledTimes(1);
  });

  it("throws kalau insert cmt_setoran_full gagal", async () => {
    supabase.from.mockReturnValue(
      makeInsertSelectSingleChain({ data: null, error: new Error("boom") }),
    );
    await expect(createSetoranFull(baseArgs)).rejects.toThrow("boom");
  });

  it("throws kalau increment_stok_gudang gagal", async () => {
    const insertChain = makeInsertSelectSingleChain({ data: { id: "f1" }, error: null });
    supabase.from.mockReturnValue(insertChain);
    supabase.rpc.mockResolvedValue({ error: new Error("rpc fail") });
    await expect(createSetoranFull(baseArgs)).rejects.toThrow("rpc fail");
  });
});

describe("fetchCmtFullKirim", () => {
  it("select order created_at desc, limit 100", async () => {
    const chain = makeOrderChain({ data: [{ id: "b1" }], error: null });
    supabase.from.mockReturnValue(chain);

    const result = await fetchCmtFullKirim();

    expect(supabase.from).toHaveBeenCalledWith("cmt_full_kirim");
    expect(chain.limit).toHaveBeenCalledWith(100);
    expect(result).toEqual([{ id: "b1" }]);
  });

  it("throws kalau error", async () => {
    supabase.from.mockReturnValue(makeOrderChain({ data: null, error: new Error("boom") }));
    await expect(fetchCmtFullKirim()).rejects.toThrow("boom");
  });
});

describe("createCmtFullKirim", () => {
  const baseArgs = {
    namaVendor: "Vendor C",
    tanggalKirim: "2026-11-18",
    estimasiSelesai: "2026-11-25",
    bahan: [{ nama_bahan: "Wolfis", kode_bahan: "WLF-01", satuan: "yard", jumlah: "50" }],
    catatan: "",
    user,
  };

  it("throws kalau nama vendor kosong", async () => {
    await expect(createCmtFullKirim({ ...baseArgs, namaVendor: "" })).rejects.toThrow("vendor");
  });

  it("throws kalau tidak ada bahan dgn jumlah > 0", async () => {
    await expect(
      createCmtFullKirim({
        ...baseArgs,
        bahan: [{ nama_bahan: "Wolfis", satuan: "yard", jumlah: 0 }],
      }),
    ).rejects.toThrow();
  });

  it("TIDAK ada field kode produk sama sekali -- kirim bahan terjadi sebelum kode ada", async () => {
    const chain = makeInsertSelectSingleChain({ data: { id: "b1" }, error: null });
    supabase.from.mockReturnValue(chain);

    await createCmtFullKirim(baseArgs);

    const row = chain.insert.mock.calls[0][0];
    expect(row).not.toHaveProperty("kode_produk");
    expect(row.bahan).toEqual([
      { nama_bahan: "Wolfis", kode_bahan: "WLF-01", satuan: "yard", jumlah: 50 },
    ]);
  });

  it("insert row + logHistory", async () => {
    const chain = makeInsertSelectSingleChain({ data: { id: "b1" }, error: null });
    supabase.from.mockReturnValue(chain);

    const result = await createCmtFullKirim(baseArgs);

    expect(supabase.from).toHaveBeenCalledWith("cmt_full_kirim");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ nama_vendor: "Vendor C", created_by: "a@b.com" }),
    );
    expect(logHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: "cmt-full-kirim-bahan", category: "produksi" }),
    );
    expect(result).toEqual({ id: "b1" });
  });

  it("kode_bahan kosong -> null", async () => {
    const chain = makeInsertSelectSingleChain({ data: { id: "b1" }, error: null });
    supabase.from.mockReturnValue(chain);

    await createCmtFullKirim({
      ...baseArgs,
      bahan: [{ nama_bahan: "Sifon", satuan: "meter", jumlah: 20 }],
    });

    expect(chain.insert.mock.calls[0][0].bahan[0].kode_bahan).toBeNull();
  });

  it("throws kalau insert gagal", async () => {
    supabase.from.mockReturnValue(
      makeInsertSelectSingleChain({ data: null, error: new Error("boom") }),
    );
    await expect(createCmtFullKirim(baseArgs)).rejects.toThrow("boom");
  });
});

describe("deleteCmtFullKirim", () => {
  it("delete by id", async () => {
    const chain = makeUpdateEqChain({ error: null });
    chain.delete = vi.fn().mockReturnValue(chain);
    supabase.from.mockReturnValue(chain);

    await deleteCmtFullKirim("b1");

    expect(supabase.from).toHaveBeenCalledWith("cmt_full_kirim");
    expect(chain.delete).toHaveBeenCalled();
    expect(chain.eq).toHaveBeenCalledWith("id", "b1");
  });

  it("throws kalau error", async () => {
    const chain = makeUpdateEqChain({ error: new Error("boom") });
    chain.delete = vi.fn().mockReturnValue(chain);
    supabase.from.mockReturnValue(chain);
    await expect(deleteCmtFullKirim("b1")).rejects.toThrow("boom");
  });
});
