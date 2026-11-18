import { describe, it, expect } from "vitest";
import {
  getDefaultTargetMarket,
  marketLabel,
  restockItemKey,
  restockTransferQty,
  DEFAULT_TARGET_SERI,
} from "./utils";

describe("getDefaultTargetMarket", () => {
  it("Minggu -> besok Senin -> cideng", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-23T12:00:00"))).toBe("cideng");
  });
  it("Rabu -> besok Kamis -> cideng", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-19T12:00:00"))).toBe("cideng");
  });
  it("Kamis -> besok Jumat -> tegalgubug", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-20T12:00:00"))).toBe("tegalgubug");
  });
  it("Jumat -> besok Sabtu -> null (tidak ada pasar)", () => {
    expect(getDefaultTargetMarket(new Date("2026-08-21T12:00:00"))).toBeNull();
  });
});

describe("marketLabel", () => {
  it("cideng -> Cideng, tegalgubug -> Tegalgubug", () => {
    expect(marketLabel("cideng")).toBe("Cideng");
    expect(marketLabel("tegalgubug")).toBe("Tegalgubug");
  });
  it("unknown -> '-'", () => {
    expect(marketLabel("gudang")).toBe("-");
    expect(marketLabel(null)).toBe("-");
  });
});

describe("DEFAULT_TARGET_SERI", () => {
  it("cideng=2, tegalgubug=3 (admin: minimal seri cideng 2, tegalgubuk 3)", () => {
    expect(DEFAULT_TARGET_SERI).toEqual({ cideng: 2, tegalgubug: 3 });
  });
});

describe("restockItemKey", () => {
  it("menggabungkan kode__size__warna", () => {
    expect(restockItemKey("D-01-OSK", "Midi", "HITAM")).toBe("D-01-OSK__Midi__HITAM");
  });
});

// Admin: "kok bisa ke transfer 2? sedangkan di gudang cuma ada 1? kalau
// sesuai behavior kan harusnya cuma ambil dari gudang" -- transfer SELALU
// dari Gudang, jadi qty yang diminta tidak boleh lebih dari stok Gudang
// yang benar-benar ada, walau "butuh" (target - stok pasar) lebih besar.
describe("restockTransferQty", () => {
  it("Gudang cukup -> qty = butuh", () => {
    expect(restockTransferQty({ butuh: 2, gudangQty: 5 })).toBe(2);
  });

  it("Gudang KURANG dari butuh -> qty di-cap ke stok Gudang yang ada (bugfix: dulu tetap kirim 2 walau gudang cuma 1)", () => {
    expect(restockTransferQty({ butuh: 2, gudangQty: 1 })).toBe(1);
  });

  it("Gudang 0 -> qty 0 (tidak ada yang bisa ditransfer)", () => {
    expect(restockTransferQty({ butuh: 2, gudangQty: 0 })).toBe(0);
  });

  it("field hilang -> fallback ke 0, tidak crash", () => {
    expect(restockTransferQty({})).toBe(0);
  });
});
