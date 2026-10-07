import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const { createMutateAsync, markPaidMutateAsync, createSaleMock, notifyMock, toastMock } = vi.hoisted(() => ({
  createMutateAsync: vi.fn(),
  markPaidMutateAsync: vi.fn(),
  createSaleMock: vi.fn(),
  notifyMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => ({ user: { email: "k@x.id" } }),
  displayName: () => "Kasir A",
}));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: toastMock }));
vi.mock("../penjualan", () => ({ useCreateSale: () => createSaleMock }));
vi.mock("../pelanggan", () => ({
  searchPelanggan: vi.fn().mockResolvedValue([]),
  addPelanggan: vi.fn().mockResolvedValue({ id: "p-new" }),
}));
vi.mock("../../shared/hooks/useTransactionNotification", () => ({
  useTransactionNotification: () => ({ notifyTransaction: notifyMock }),
}));
vi.mock("./queries", () => ({
  useCreateKeepMutation: () => ({ mutateAsync: createMutateAsync }),
  useMarkKeepPaidMutation: () => ({ mutateAsync: markPaidMutateAsync }),
  useKeepOrdersQuery: vi.fn(),
  useCancelKeepMutation: vi.fn(),
}));

import { useKeepCheckout, usePayKeep } from "./hooks";

const keepRow = {
  id: "k1", date: "2026-10-05", created_at: "2026-10-05T03:00:00.000Z", location: "cideng",
  buyer_name: "BUDI", buyer_hp: "", pelanggan_id: "p1", items: [{ kode: "A", qty: 2 }], discount: 0, total: 200000,
};

beforeEach(() => vi.clearAllMocks());

describe("useKeepCheckout", () => {
  function makeCart(items = [{ kode: "A", qty: 2 }]) {
    return { cart: items, getPayloadItems: () => items, total: 200000, diskon: 0, resetCart: vi.fn() };
  }

  it("cart kosong -> null tanpa menyimpan", async () => {
    const { result } = renderHook(() => useKeepCheckout({ cart: makeCart([]), location: "gudang", buyerName: "", buyerHp: "" }));
    let out;
    await act(async () => { out = await result.current.simpanKeep(); });
    expect(out).toBeNull();
    expect(createMutateAsync).not.toHaveBeenCalled();
  });

  it("simpan keep: kirim payload, reset cart, kembalikan struk BELUM LUNAS", async () => {
    createMutateAsync.mockResolvedValue({ ...keepRow, pelanggan_id: "p1" });
    const cart = makeCart();
    const { result } = renderHook(() =>
      useKeepCheckout({ cart, location: "cideng", buyerName: "Budi", buyerHp: "", pelangganId: "p1", setPelangganId: vi.fn() }),
    );
    let out;
    await act(async () => { out = await result.current.simpanKeep(); });
    expect(createMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ total: 200000, location: "cideng", pelangganId: "p1", user: { email: "k@x.id", name: "Kasir A" } }),
    );
    expect(cart.resetCart).toHaveBeenCalled();
    expect(out).toMatchObject({ belum_lunas: true, total: 200000 });
  });

  it("gagal simpan: toast error, cart TIDAK direset, hasil null", async () => {
    createMutateAsync.mockRejectedValue(new Error("offline"));
    const cart = makeCart();
    const { result } = renderHook(() => useKeepCheckout({ cart, location: "cideng", buyerName: "", buyerHp: "" }));
    let out;
    await act(async () => { out = await result.current.simpanKeep(); });
    expect(out).toBeNull();
    expect(cart.resetCart).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalled();
  });
});

describe("usePayKeep", () => {
  it("bayar: createSale dgn data keep, tandai lunas, notif, struk LUNAS (tanpa flag)", async () => {
    createSaleMock.mockResolvedValue(1);
    markPaidMutateAsync.mockResolvedValue({});
    const { result } = renderHook(() => usePayKeep());
    let out;
    await act(async () => { out = await result.current.payKeep(keepRow); });
    expect(createSaleMock).toHaveBeenCalledWith(
      expect.objectContaining({ items: keepRow.items, total: 200000, buyerName: "BUDI", pelangganId: "p1", location: "cideng" }),
    );
    expect(markPaidMutateAsync).toHaveBeenCalledWith("k1");
    expect(notifyMock).toHaveBeenCalled();
    expect(out.belum_lunas).toBeUndefined();
    expect(out.created_by_name).toBe("Kasir A");
  });

  it("createSale gagal: keep TIDAK ditandai lunas, hasil null", async () => {
    createSaleMock.mockRejectedValue(new Error("db error"));
    const { result } = renderHook(() => usePayKeep());
    let out;
    await act(async () => { out = await result.current.payKeep(keepRow); });
    expect(out).toBeNull();
    expect(markPaidMutateAsync).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalled();
  });

  it("transaksi tercatat tapi gagal tandai lunas: tetap kembalikan struk + toast peringatan (tidak dicatat ulang)", async () => {
    createSaleMock.mockResolvedValue(1);
    markPaidMutateAsync.mockRejectedValue(new Error("rls"));
    const { result } = renderHook(() => usePayKeep());
    let out;
    await act(async () => { out = await result.current.payKeep(keepRow); });
    expect(createSaleMock).toHaveBeenCalledTimes(1);
    expect(out).not.toBeNull();
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining("Batalkan keep"));
  });
});
