import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: { from: vi.fn(), rpc: vi.fn() },
}));
vi.mock("../history/api", () => ({
  logHistory: vi.fn().mockResolvedValue(undefined),
}));

import { supabase } from "@deera/shared/lib/supabase";
import { logHistory } from "../history/api";
import {
  batalKirimCmtJahit,
  createCmtFullKirim,
  createKirimCmtJahit,
  createSetoranFull,
  deleteCmtFullKirim,
  fetchAvailablePotonganByKode,
  fetchCmtFullKirim,
  fetchCmtJahitKirim,
  fetchCmtSetoranFull,
  generateKirimNo,
  setorKirimCmtJahit,
  updateHargaUpahKirim,
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
function makeUpdateEqChain(returnVal = { error: null }) {
  return { update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue(returnVal) };
}

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
  // Insert cmt_jahit_kirim (N baris) + link jahit_cards.cmt_jahit_kirim_id
  // per grup sekarang 1 RPC atomik (create_kirim_cmt_jahit), identitas
  // dari auth.uid() — lihat supabase/migrations/20261120_cmt_crud.sql.
  // groupCardsByKodeSizeWarna() (pure JS) masih dites tersendiri di
  // utils.test.js; di sini cuma tes createKirimCmtJahit manggil RPC
  // dengan groups yang benar.
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
  };

  it("throws kalau nama vendor kosong", async () => {
    await expect(createKirimCmtJahit({ ...baseArgs, namaVendor: "" })).rejects.toThrow("vendor");
  });

  it("throws kalau cards kosong", async () => {
    await expect(createKirimCmtJahit({ ...baseArgs, cards: [] })).rejects.toThrow("produk");
  });

  it("memanggil create_kirim_cmt_jahit dengan groups per kombinasi kode+size+warna", async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    await createKirimCmtJahit(baseArgs);

    expect(supabase.rpc).toHaveBeenCalledWith(
      "create_kirim_cmt_jahit",
      expect.objectContaining({
        p_nama_vendor: "Vendor A",
        p_harga_upah: 7000,
        p_groups: [
          expect.objectContaining({
            kode_produk: "D-01-OSK",
            size: "Midi",
            warna: "HITAM",
            qty: 10,
            cardIds: ["c1"],
          }),
        ],
      }),
    );
    expect(supabase.rpc.mock.calls[0][1].p_kirim_no).toMatch(/^CMT-\d{8}-\d{3}$/);
  });

  it("dua kartu kode+size+warna sama (misal dari 2 batch) -> qty dijumlah jadi satu grup, kedua card id ikut", async () => {
    supabase.rpc.mockResolvedValue({ error: null });

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

    const groups = supabase.rpc.mock.calls[0][1].p_groups;
    expect(groups).toHaveLength(1);
    expect(groups[0].qty).toBe(14);
    expect(groups[0].cardIds).toEqual(["c1", "c2"]);
  });

  it("harga_upah tidak diisi -> default 0 (opsional, bisa diisi nanti)", async () => {
    supabase.rpc.mockResolvedValue({ error: null });
    await createKirimCmtJahit({ ...baseArgs, hargaUpah: "" });
    expect(supabase.rpc.mock.calls[0][1].p_harga_upah).toBe(0);
  });

  it("throws kalau RPC gagal", async () => {
    supabase.rpc.mockResolvedValue({ error: { message: "db down" } });
    await expect(createKirimCmtJahit(baseArgs)).rejects.toThrow("db down");
  });
});

describe("setorKirimCmtJahit", () => {
  // Loop update per baris sekarang 1 RPC atomik (setor_kirim_cmt_jahit) —
  // lihat supabase/migrations/20261120_cmt_crud.sql.
  it("throws kalau itemsSetor kosong", async () => {
    await expect(
      setorKirimCmtJahit({ kirimNo: "CMT-1", tanggalSetor: "2026-11-18", itemsSetor: [] }),
    ).rejects.toThrow();
  });

  it("memanggil setor_kirim_cmt_jahit dengan items & catatan", async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    await setorKirimCmtJahit({
      kirimNo: "CMT-1",
      tanggalSetor: "2026-11-18",
      itemsSetor: [
        { id: "k1", qtySetor: 9 },
        { id: "k2", qtySetor: 5 },
      ],
      catatan: "ok",
    });

    expect(supabase.rpc).toHaveBeenCalledWith("setor_kirim_cmt_jahit", {
      p_kirim_no: "CMT-1",
      p_tanggal_setor: "2026-11-18",
      p_items: [
        { id: "k1", qtySetor: 9 },
        { id: "k2", qtySetor: 5 },
      ],
      p_catatan: "ok",
    });
  });

  it("throws kalau RPC gagal", async () => {
    supabase.rpc.mockResolvedValue({ error: { message: "boom" } });
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
  // update status + lepas tautan jahit_cards sekarang 1 RPC atomik
  // (batal_kirim_cmt_jahit) — lihat
  // supabase/migrations/20261120_cmt_crud.sql.
  it("ids kosong -> tidak panggil RPC sama sekali", async () => {
    await batalKirimCmtJahit({ kirimNo: "CMT-1", ids: [] });
    expect(supabase.rpc).not.toHaveBeenCalled();
  });

  it("memanggil batal_kirim_cmt_jahit dengan kirim_no & ids", async () => {
    supabase.rpc.mockResolvedValue({ error: null });

    await batalKirimCmtJahit({ kirimNo: "CMT-1", ids: ["k1", "k2"] });

    expect(supabase.rpc).toHaveBeenCalledWith("batal_kirim_cmt_jahit", {
      p_kirim_no: "CMT-1",
      p_ids: ["k1", "k2"],
    });
  });

  it("throws kalau RPC gagal", async () => {
    supabase.rpc.mockResolvedValue({ error: { message: "boom" } });
    await expect(batalKirimCmtJahit({ kirimNo: "CMT-1", ids: ["k1"] })).rejects.toThrow("boom");
  });
});

describe("updateHargaUpahKirim", () => {
  it("update harga_upah utk semua baris kirim_no itu, lalu logHistory", async () => {
    const chain = makeUpdateEqChain({ error: null });
    supabase.from.mockReturnValue(chain);

    await updateHargaUpahKirim({ kirimNo: "CMT-1", hargaUpah: "7000" });

    expect(supabase.from).toHaveBeenCalledWith("cmt_jahit_kirim");
    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ harga_upah: 7000 }));
    expect(chain.eq).toHaveBeenCalledWith("kirim_no", "CMT-1");
    expect(logHistory).toHaveBeenCalledWith(
      expect.objectContaining({ action: "cmt-jahit-upah", kode: "CMT-1" }),
    );
  });

  it("hargaUpah kosong/bukan angka -> fallback ke 0", async () => {
    const chain = makeUpdateEqChain({ error: null });
    supabase.from.mockReturnValue(chain);

    await updateHargaUpahKirim({ kirimNo: "CMT-1", hargaUpah: "" });

    expect(chain.update).toHaveBeenCalledWith(expect.objectContaining({ harga_upah: 0 }));
  });

  it("throws kalau update gagal", async () => {
    supabase.from.mockReturnValue(makeUpdateEqChain({ error: new Error("boom") }));
    await expect(updateHargaUpahKirim({ kirimNo: "CMT-1", hargaUpah: "7000" })).rejects.toThrow(
      "boom",
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
  // Insert cmt_setoran_full + loop (increment_stok_gudang + insert
  // stok_masuk_log) sekarang 1 RPC atomik (create_setoran_full),
  // identitas dari auth.uid() — lihat
  // supabase/migrations/20261120_cmt_crud.sql.
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
  };

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

  it("memanggil create_setoran_full dengan item yang sudah difilter qty>0", async () => {
    supabase.rpc.mockResolvedValue({ data: { id: "f1" }, error: null });

    const result = await createSetoranFull(baseArgs);

    expect(supabase.rpc).toHaveBeenCalledWith("create_setoran_full", {
      p_nama_vendor: "Vendor B",
      p_kode_produk: "D-02-SFN",
      p_nama_produk: "Mukena B",
      p_tanggal_setor: "2026-11-18",
      p_items: [
        { size: "Midi", warna: "HITAM", qty: "5" },
        { size: "Gamis", warna: "MERAH", qty: "3" },
      ],
      p_harga_upah: 10000,
      p_catatan: null,
    });
    expect(result).toEqual({ id: "f1" });
  });

  it("item dgn qty 0 diabaikan (tidak ikut dikirim ke RPC)", async () => {
    supabase.rpc.mockResolvedValue({ data: { id: "f1" }, error: null });
    await createSetoranFull({
      ...baseArgs,
      items: [
        { size: "Midi", warna: "HITAM", qty: 5 },
        { size: "Gamis", warna: "MERAH", qty: 0 },
      ],
    });
    expect(supabase.rpc.mock.calls[0][1].p_items).toEqual([
      { size: "Midi", warna: "HITAM", qty: 5 },
    ]);
  });

  it("throws kalau RPC gagal", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    await expect(createSetoranFull(baseArgs)).rejects.toThrow("boom");
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
  // Insert tunggal, sudah atomik dari sananya — cuma identitas yang
  // diperbaiki (sekarang 1 RPC, created_by dari auth.uid() bukan
  // objek `user` client) — lihat
  // supabase/migrations/20261120_cmt_crud.sql.
  const baseArgs = {
    namaVendor: "Vendor C",
    tanggalKirim: "2026-11-18",
    estimasiSelesai: "2026-11-25",
    bahan: [{ nama_bahan: "Wolfis", kode_bahan: "WLF-01", satuan: "yard", jumlah: "50" }],
    catatan: "",
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

  it("memanggil create_cmt_full_kirim dengan bahan yang sudah dibersihkan", async () => {
    supabase.rpc.mockResolvedValue({ data: { id: "b1" }, error: null });

    const result = await createCmtFullKirim(baseArgs);

    expect(supabase.rpc).toHaveBeenCalledWith("create_cmt_full_kirim", {
      p_nama_vendor: "Vendor C",
      p_tanggal_kirim: "2026-11-18",
      p_estimasi_selesai: "2026-11-25",
      p_bahan: [{ nama_bahan: "Wolfis", kode_bahan: "WLF-01", satuan: "yard", jumlah: 50 }],
      p_catatan: null,
    });
    expect(result).toEqual({ id: "b1" });
  });

  it("kode_bahan kosong -> null", async () => {
    supabase.rpc.mockResolvedValue({ data: { id: "b1" }, error: null });

    await createCmtFullKirim({
      ...baseArgs,
      bahan: [{ nama_bahan: "Sifon", satuan: "meter", jumlah: 20 }],
    });

    expect(supabase.rpc.mock.calls[0][1].p_bahan[0].kode_bahan).toBeNull();
  });

  it("throws kalau RPC gagal", async () => {
    supabase.rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
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
