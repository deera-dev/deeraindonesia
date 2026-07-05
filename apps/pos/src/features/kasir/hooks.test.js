import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("../../shared/lib/salesUtils", () => ({
  getStokWarna: vi.fn((product, size, warna, loc) => {
    return product.stokByWarna?.[size]?.[warna]?.[loc] ?? 5;
  }),
}));
vi.mock("../penjualan", () => ({
  useCreateSale: vi.fn(() => vi.fn().mockResolvedValue(1)),
}));
vi.mock("../pelanggan", () => ({
  searchPelanggan: vi.fn().mockResolvedValue([]),
  addPelanggan: vi.fn().mockResolvedValue({ id: "new-p1", nama: "BUDI" }),
}));
vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: vi.fn(() => ({ user: { email: "kasir@test.com" } })),
  displayName: vi.fn(() => "kasir@test.com"),
}));
vi.mock("../../shared/hooks/useTransactionNotification", () => ({
  useTransactionNotification: vi.fn(() => ({ notifyTransaction: vi.fn() })),
}));
vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { useCart, useCheckout } from "./hooks";
import { useCreateSale } from "../penjualan";
import { searchPelanggan, addPelanggan } from "../pelanggan";
import { toast } from "@deera/shared/features/toast/hooks";

// Dummy product fixtures
const p1 = {
  kode: "D-01",
  naam: "Gamis A",
  hpp: 80000,
  image: null,
  warna: ["HITAM", "MERAH"],
  variants: [{ size: "Midi", harga: 100000, ld: 110, pb: 130 }],
  stokByWarna: { Midi: { HITAM: { gudang: 5 }, MERAH: { gudang: 3 } } },
};
const p1NoWarna = {
  kode: "D-02",
  nama: "Gamis B",
  hpp: 70000,
  image: null,
  warna: [],
  variants: [{ size: "Midi", harga: 90000, ld: 110, pb: 130 }],
};

beforeEach(() => {
  vi.clearAllMocks();
  useCreateSale.mockReturnValue(vi.fn().mockResolvedValue(1));
});

// ── useCart ──────────────────────────────────────────────────────────────────
describe("useCart", () => {
  it("initializes with empty cart", () => {
    const { result } = renderHook(() => useCart("gudang"));
    expect(result.current.cart).toEqual([]);
    expect(result.current.totalItems).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it("openWarnaPanel opens panel for product with warna", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => {
      result.current.openWarnaPanel(p1, p1.variants[0]);
    });
    expect(result.current.warnaPanel).not.toBeNull();
    expect(result.current.warnaPanel.product.kode).toBe("D-01");
  });

  it("openWarnaPanel directly adds simple item (no warna)", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => {
      result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]);
    });
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].kode).toBe("D-02");
    expect(result.current.cart[0].qty).toBe(1);
    expect(result.current.warnaPanel).toBeNull();
  });

  it("closeWarnaPanel resets panel + selectedWarna", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1, p1.variants[0]); });
    act(() => { result.current.closeWarnaPanel(); });
    expect(result.current.warnaPanel).toBeNull();
    expect(result.current.selectedWarna).toEqual({});
  });

  it("confirmWarna adds colored items to cart", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1, p1.variants[0]); });
    act(() => { result.current.setSelectedWarna({ HITAM: 2, MERAH: 1 }); });
    act(() => { result.current.confirmWarna(); });
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.cart[0].warna).toEqual([{ nama: "HITAM", qty: 2 }, { nama: "MERAH", qty: 1 }]);
    expect(result.current.totalItems).toBe(3);
    expect(result.current.warnaPanel).toBeNull();
  });

  it("confirmWarna does nothing if no warna selected", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1, p1.variants[0]); });
    act(() => { result.current.confirmWarna(); });
    expect(result.current.cart).toHaveLength(0);
  });

  it("confirmWarna replaces existing entry for same key", () => {
    const { result } = renderHook(() => useCart("gudang"));
    // First add
    act(() => { result.current.openWarnaPanel(p1, p1.variants[0]); });
    act(() => { result.current.setSelectedWarna({ HITAM: 2 }); });
    act(() => { result.current.confirmWarna(); });
    // Second confirm different qty
    act(() => { result.current.openWarnaPanel(p1, p1.variants[0]); });
    act(() => { result.current.setSelectedWarna({ HITAM: 1, MERAH: 1 }); });
    act(() => { result.current.confirmWarna(); });
    expect(result.current.cart).toHaveLength(1);
    expect(result.current.totalItems).toBe(2);
  });

  it("selectFullSeri increments each warna by +1, caps at stok", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1, p1.variants[0]); });
    act(() => { result.current.selectFullSeri(); });
    // Default stok mock returns 5 — should set 1 for each warna
    expect(result.current.selectedWarna["HITAM"]).toBe(1);
    expect(result.current.selectedWarna["MERAH"]).toBe(1);
  });

  it("updateQty increments simple item", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); });
    act(() => { result.current.updateQty("D-02-Midi", +1); });
    expect(result.current.cart[0].qty).toBe(2);
  });

  it("updateQty removes item when qty reaches 0", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); });
    act(() => { result.current.updateQty("D-02-Midi", -1); });
    expect(result.current.cart).toHaveLength(0);
  });

  it("setItemHarga updates price of specific item", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); });
    act(() => { result.current.setItemHarga("D-02-Midi", 80000); });
    expect(result.current.cart[0].harga).toBe(80000);
    expect(result.current.editingPrice).toBeNull();
  });

  it("removeItem removes specific item", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); });
    act(() => { result.current.removeItem("D-02-Midi"); });
    expect(result.current.cart).toHaveLength(0);
  });

  it("resetCart clears everything", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); });
    act(() => { result.current.resetCart(); });
    expect(result.current.cart).toHaveLength(0);
    expect(result.current.showCart).toBe(false);
    expect(result.current.showDiskon).toBe(false);
  });

  it("removeDiskon clears diskon state", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.setShowDiskon(true); result.current.setDiskonInput("10000"); });
    act(() => { result.current.removeDiskon(); });
    expect(result.current.showDiskon).toBe(false);
    expect(result.current.diskonInput).toBe("");
  });

  it("diskon computed as Rp when mode=rp", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); }); // 90000
    act(() => {
      result.current.setShowDiskon(true);
      result.current.setDiskonInput("10000");
      result.current.setDiskonMode("rp");
    });
    expect(result.current.diskon).toBe(10000);
    expect(result.current.total).toBe(80000);
  });

  it("diskon computed as percent when mode=persen", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); }); // 90000
    act(() => {
      result.current.setShowDiskon(true);
      result.current.setDiskonInput("10");
      result.current.setDiskonMode("persen");
    });
    expect(result.current.diskon).toBe(9000); // 10% of 90000
  });

  it("diskon capped at subtotal in rp mode", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); }); // 90000
    act(() => {
      result.current.setShowDiskon(true);
      result.current.setDiskonInput("999999");
      result.current.setDiskonMode("rp");
    });
    expect(result.current.diskon).toBe(90000); // capped
    expect(result.current.total).toBe(0);
  });

  it("diskon=0 when showDiskon=false", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); });
    act(() => { result.current.setDiskonInput("5000"); });
    // showDiskon never set to true
    expect(result.current.diskon).toBe(0);
  });

  it("getPayloadItems strips key and image", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); });
    const payload = result.current.getPayloadItems();
    expect(payload[0]).not.toHaveProperty("key");
    expect(payload[0]).not.toHaveProperty("image");
    expect(payload[0]).toHaveProperty("kode");
    expect(payload[0]).toHaveProperty("size");
  });

  it("editWarnaItem opens panel prefilled with existing warna", () => {
    const { result } = renderHook(() => useCart("gudang"));
    // Add warna item first
    act(() => { result.current.openWarnaPanel(p1, p1.variants[0]); });
    act(() => { result.current.setSelectedWarna({ HITAM: 2 }); });
    act(() => { result.current.confirmWarna(); });
    // Now edit
    const item = result.current.cart[0];
    act(() => { result.current.editWarnaItem(item, [p1]); });
    expect(result.current.warnaPanel).not.toBeNull();
    expect(result.current.selectedWarna["HITAM"]).toBe(2);
  });

  it("editWarnaItem does nothing if product not found", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.editWarnaItem({ kode: "NONEXISTENT", size: "Midi", warna: [] }, []); });
    expect(result.current.warnaPanel).toBeNull();
  });

  it("opening simple item a second time increments qty", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); });
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); });
    expect(result.current.cart[0].qty).toBe(2);
  });

  it("subtotal is sum of all items", () => {
    const { result } = renderHook(() => useCart("gudang"));
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); }); // 90000
    act(() => { result.current.openWarnaPanel(p1NoWarna, p1NoWarna.variants[0]); }); // 90000
    expect(result.current.subtotal).toBe(180000);
  });
});

// ── useCheckout ──────────────────────────────────────────────────────────────
describe("useCheckout", () => {
  function buildCart({ items = [], total = 0, diskon = 0 } = {}) {
    return {
      cart: items,
      total,
      diskon,
      getPayloadItems: () => items,
      resetCart: vi.fn(),
    };
  }

  it("returns {bayar, saving}", () => {
    const cart = buildCart();
    const { result } = renderHook(() =>
      useCheckout({ cart, location: "gudang", buyerName: "", buyerHp: "", pelangganId: null, setPelangganId: vi.fn() })
    );
    expect(typeof result.current.bayar).toBe("function");
    expect(result.current.saving).toBe(false);
  });

  it("bayar returns null if cart is empty", async () => {
    const cart = buildCart();
    const { result } = renderHook(() =>
      useCheckout({ cart, location: "gudang", buyerName: "", buyerHp: "", pelangganId: null, setPelangganId: vi.fn() })
    );
    let res;
    await act(async () => { res = await result.current.bayar(); });
    expect(res).toBeNull();
  });

  it("bayar calls createSale and returns struk", async () => {
    const mockItem = { kode: "D-01", size: "Midi", harga: 100000, qty: 1, warna: null };
    const cart = buildCart({ items: [mockItem], total: 100000, diskon: 0 });
    const setPelangganId = vi.fn();
    const { result } = renderHook(() =>
      useCheckout({ cart, location: "gudang", buyerName: "", buyerHp: "", pelangganId: null, setPelangganId })
    );
    let res;
    await act(async () => { res = await result.current.bayar(); });
    expect(res).not.toBeNull();
    expect(res.total).toBe(100000);
    expect(res.type).toBe("sale");
    expect(cart.resetCart).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalled();
  });

  it("bayar auto-searches and resolves existing pelanggan", async () => {
    searchPelanggan.mockResolvedValue([{ id: "p-existing", nama: "BUDI" }]);
    const mockItem = { kode: "D-01", size: "Midi", harga: 100000, qty: 1 };
    const cart = buildCart({ items: [mockItem], total: 100000 });
    const setPelangganId = vi.fn();
    const { result } = renderHook(() =>
      useCheckout({ cart, location: "gudang", buyerName: "BUDI", buyerHp: "", pelangganId: null, setPelangganId })
    );
    await act(async () => { await result.current.bayar(); });
    expect(setPelangganId).toHaveBeenCalledWith("p-existing");
    expect(addPelanggan).not.toHaveBeenCalled();
  });

  it("bayar creates new pelanggan when not found", async () => {
    searchPelanggan.mockResolvedValue([]);
    const mockItem = { kode: "D-01", size: "Midi", harga: 100000, qty: 1 };
    const cart = buildCart({ items: [mockItem], total: 100000 });
    const setPelangganId = vi.fn();
    const { result } = renderHook(() =>
      useCheckout({ cart, location: "gudang", buyerName: "WIDARI", buyerHp: "082", pelangganId: null, setPelangganId })
    );
    await act(async () => { await result.current.bayar(); });
    expect(addPelanggan).toHaveBeenCalled();
    expect(setPelangganId).toHaveBeenCalledWith("new-p1");
  });

  it("bayar shows error toast when createSale throws", async () => {
    useCreateSale.mockReturnValue(vi.fn().mockRejectedValue(new Error("network fail")));
    const mockItem = { kode: "D-01", size: "Midi", harga: 100000, qty: 1 };
    const cart = buildCart({ items: [mockItem], total: 100000 });
    const { result } = renderHook(() =>
      useCheckout({ cart, location: "gudang", buyerName: "", buyerHp: "", pelangganId: null, setPelangganId: vi.fn() })
    );
    let res;
    await act(async () => { res = await result.current.bayar(); });
    expect(res).toBeNull();
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("network fail"));
    expect(cart.resetCart).not.toHaveBeenCalled();
  });

  it("bayar does not add pelanggan when pelangganId already set", async () => {
    const mockItem = { kode: "D-01", size: "Midi", harga: 100000, qty: 1 };
    const cart = buildCart({ items: [mockItem], total: 100000 });
    const { result } = renderHook(() =>
      useCheckout({ cart, location: "gudang", buyerName: "BUDI", buyerHp: "", pelangganId: "existing-id", setPelangganId: vi.fn() })
    );
    await act(async () => { await result.current.bayar(); });
    expect(searchPelanggan).not.toHaveBeenCalled();
    expect(addPelanggan).not.toHaveBeenCalled();
  });

  it("saving is true during bayar and false after", async () => {
    let resolveSale;
    useCreateSale.mockReturnValue(() => new Promise((r) => { resolveSale = r; }));
    const mockItem = { kode: "D-01", size: "Midi", harga: 100000, qty: 1 };
    const cart = buildCart({ items: [mockItem], total: 100000 });
    const { result } = renderHook(() =>
      useCheckout({ cart, location: "gudang", buyerName: "", buyerHp: "", pelangganId: null, setPelangganId: vi.fn() })
    );
    let done = false;
    act(() => { result.current.bayar().then(() => { done = true; }); });
    expect(result.current.saving).toBe(true);
    await act(async () => { resolveSale(1); });
    expect(result.current.saving).toBe(false);
  });
});
