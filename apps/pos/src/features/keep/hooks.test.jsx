import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

const {
  createMutateAsync, updateMutateAsync, markPaidMutateAsync, markTerkirimMutateAsync, cancelMutateAsync,
  createSaleMock, adjustStokOnlyMock, reverseStokAdjustmentsMock, notifyMock, toastMock,
} = vi.hoisted(() => ({
  createMutateAsync: vi.fn(),
  updateMutateAsync: vi.fn(),
  markPaidMutateAsync: vi.fn(),
  markTerkirimMutateAsync: vi.fn(),
  cancelMutateAsync: vi.fn(),
  createSaleMock: vi.fn(),
  adjustStokOnlyMock: vi.fn(),
  reverseStokAdjustmentsMock: vi.fn(),
  notifyMock: vi.fn(),
  toastMock: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => ({ user: { email: "k@x.id" } }),
  displayName: () => "Kasir A",
}));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: toastMock }));
vi.mock("../penjualan", () => ({
  useCreateSale: () => createSaleMock,
  useAdjustStokOnly: () => adjustStokOnlyMock,
  useReverseStokAdjustments: () => reverseStokAdjustmentsMock,
}));
vi.mock("../pelanggan", () => ({
  searchPelanggan: vi.fn().mockResolvedValue([]),
  addPelanggan: vi.fn().mockResolvedValue({ id: "p-new" }),
}));
vi.mock("../../shared/hooks/useTransactionNotification", () => ({
  useTransactionNotification: () => ({ notifyTransaction: notifyMock }),
}));
vi.mock("./queries", () => ({
  useCreateKeepMutation: () => ({ mutateAsync: createMutateAsync }),
  useUpdateKeepMutation: () => ({ mutateAsync: updateMutateAsync }),
  useMarkKeepPaidMutation: () => ({ mutateAsync: markPaidMutateAsync }),
  useMarkKeepTerkirimMutation: () => ({ mutateAsync: markTerkirimMutateAsync }),
  useCancelKeepMutation: () => ({ mutateAsync: cancelMutateAsync }),
  useKeepOrdersQuery: vi.fn(),
}));

import { useKeepCheckout, usePayKeep, useKeepFulfillment } from "./hooks";

const keepRow = {
  id: "k1", date: "2026-10-05", created_at: "2026-10-05T03:00:00.000Z", location: "cideng",
  buyer_name: "BUDI", buyer_hp: "", pelanggan_id: "p1", items: [{ kode: "A", qty: 2 }], discount: 0, total: 200000,
  status: "terkirim", stok_adjustments: [{ kode: "A", size: "Midi", warna: "_", location: "cideng", delta: -2 }],
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

  // Saran admin (November 2026): dropdown "Pasar" dipakai dobel ("saya lagi
  // di mana" vs "keep ini utk lokasi mana") — simpanKeep bisa dioverride
  // dari dialog konfirmasi lokasi keep BARU (KeepLocationModal), tidak
  // diam2 ikut `location` yang kebetulan masih nyangkut dari aksi sebelumnya.
  it("simpan keep dgn override lokasi -> pakai lokasi override, BUKAN location dari parameter hook", async () => {
    createMutateAsync.mockResolvedValue({ ...keepRow, location: "tegalgubug" });
    const cart = makeCart();
    const { result } = renderHook(() =>
      useKeepCheckout({ cart, location: "cideng", buyerName: "Budi", buyerHp: "", pelangganId: "p1", setPelangganId: vi.fn() }),
    );
    await act(async () => { await result.current.simpanKeep({ location: "tegalgubug" }); });
    expect(createMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ location: "tegalgubug" }));
  });

  it("simpan keep tanpa override -> tetap pakai location dari parameter hook seperti biasa", async () => {
    createMutateAsync.mockResolvedValue({ ...keepRow, location: "cideng" });
    const cart = makeCart();
    const { result } = renderHook(() =>
      useKeepCheckout({ cart, location: "cideng", buyerName: "Budi", buyerHp: "", pelangganId: "p1", setPelangganId: vi.fn() }),
    );
    await act(async () => { await result.current.simpanKeep(); });
    expect(createMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ location: "cideng" }));
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

describe("useKeepCheckout — edit keep", () => {
  const cart = () => ({ cart: [{ kode: "A", qty: 3 }], getPayloadItems: () => [{ kode: "A", qty: 3 }], total: 300000, diskon: 0, resetCart: vi.fn() });

  it("mode edit: update keep yg sama (bukan buat baru), reset cart", async () => {
    updateMutateAsync.mockResolvedValue({ ...keepRow, total: 300000 });
    const c = cart();
    const { result } = renderHook(() =>
      useKeepCheckout({ cart: c, location: "cideng", buyerName: "BUDI", buyerHp: "", pelangganId: "p1", editingKeep: { id: "k1" } }),
    );
    let out;
    await act(async () => { out = await result.current.simpanKeep(); });
    expect(createMutateAsync).not.toHaveBeenCalled();
    expect(updateMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ id: "k1", total: 300000, items: [{ kode: "A", qty: 3 }], pelangganId: "p1" }));
    expect(c.resetCart).toHaveBeenCalled();
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("diperbarui"));
    expect(out).toMatchObject({ belum_lunas: true, total: 300000 });
  });

  it("tandaiKeepLunas: tandai lunas; gagal -> toast peringatan", async () => {
    markPaidMutateAsync.mockResolvedValueOnce({}).mockRejectedValueOnce(new Error("rls"));
    const { result } = renderHook(() => useKeepCheckout({ cart: cart(), location: "cideng", buyerName: "", buyerHp: "" }));
    await act(async () => { await result.current.tandaiKeepLunas("k1"); });
    expect(markPaidMutateAsync).toHaveBeenCalledWith("k1");
    expect(toastMock.error).not.toHaveBeenCalled();
    await act(async () => { await result.current.tandaiKeepLunas("k1"); });
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining("Batalkan keep"));
  });
});

describe("usePayKeep", () => {
  // Keep harus "terkirim" dulu (stok sudah dikurangi sejak itu) sebelum
  // bisa dibayar — createSale dipanggil dgn skipStockAdjustment supaya
  // stok tidak dikurangi dobel, pakai persis stok_adjustments yg sudah
  // diterapkan saat terkirim.
  it("bayar: createSale dgn skipStockAdjustment + stok_adjustments dari keep, tandai lunas, notif, struk LUNAS (tanpa flag)", async () => {
    createSaleMock.mockResolvedValue(1);
    markPaidMutateAsync.mockResolvedValue({});
    const { result } = renderHook(() => usePayKeep());
    let out;
    await act(async () => { out = await result.current.payKeep(keepRow); });
    expect(createSaleMock).toHaveBeenCalledWith(
      expect.objectContaining({
        items: keepRow.items, total: 200000, buyerName: "BUDI", pelangganId: "p1", location: "cideng",
        skipStockAdjustment: true, stokAdjustments: keepRow.stok_adjustments,
      }),
    );
    expect(markPaidMutateAsync).toHaveBeenCalledWith("k1");
    expect(notifyMock).toHaveBeenCalled();
    expect(out.belum_lunas).toBeUndefined();
    expect(out.created_by_name).toBe("Kasir A");
  });

  it("status belum terkirim -> ditolak, toast error, createSale TIDAK dipanggil", async () => {
    const { result } = renderHook(() => usePayKeep());
    let out;
    await act(async () => { out = await result.current.payKeep({ ...keepRow, status: "aktif" }); });
    expect(out).toBeNull();
    expect(createSaleMock).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining("Kirim"));
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

describe("useKeepFulfillment", () => {
  const aktifKeep = { ...keepRow, status: "aktif", stok_adjustments: null };

  it("kirimKeep: kurangi stok via adjustStokOnly, tandai terkirim dgn hasil adjustment, toast sukses", async () => {
    const adjs = [{ kode: "A", size: "Midi", warna: "_", location: "cideng", delta: -2 }];
    adjustStokOnlyMock.mockResolvedValue(adjs);
    markTerkirimMutateAsync.mockResolvedValue({});
    const { result } = renderHook(() => useKeepFulfillment());
    await act(async () => { await result.current.kirimKeep(aktifKeep); });
    expect(adjustStokOnlyMock).toHaveBeenCalledWith({ items: aktifKeep.items, location: "cideng", sign: -1 });
    expect(markTerkirimMutateAsync).toHaveBeenCalledWith({ id: "k1", stokAdjustments: adjs });
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("terkirim"));
  });

  it("kirimKeep gagal: toast error", async () => {
    adjustStokOnlyMock.mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useKeepFulfillment());
    await act(async () => { await result.current.kirimKeep(aktifKeep); });
    expect(markTerkirimMutateAsync).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining("terkirim"));
  });

  it("batalkanKeep (status aktif): TIDAK memanggil reverseStokAdjustments, langsung batal", async () => {
    cancelMutateAsync.mockResolvedValue({});
    const { result } = renderHook(() => useKeepFulfillment());
    await act(async () => { await result.current.batalkanKeep(aktifKeep); });
    expect(reverseStokAdjustmentsMock).not.toHaveBeenCalled();
    expect(cancelMutateAsync).toHaveBeenCalledWith("k1");
    expect(toastMock.success).toHaveBeenCalledWith("Keep dibatalkan.");
  });

  it("batalkanKeep (status terkirim): kembalikan stok via reverseStokAdjustments sebelum batal", async () => {
    cancelMutateAsync.mockResolvedValue({});
    const { result } = renderHook(() => useKeepFulfillment());
    await act(async () => { await result.current.batalkanKeep(keepRow); });
    expect(reverseStokAdjustmentsMock).toHaveBeenCalledWith(keepRow.stok_adjustments);
    expect(cancelMutateAsync).toHaveBeenCalledWith("k1");
    expect(toastMock.success).toHaveBeenCalledWith(expect.stringContaining("dikembalikan"));
  });

  it("batalkanKeep gagal: toast error", async () => {
    cancelMutateAsync.mockRejectedValue(new Error("rls"));
    const { result } = renderHook(() => useKeepFulfillment());
    await act(async () => { await result.current.batalkanKeep(aktifKeep); });
    expect(toastMock.error).toHaveBeenCalledWith(expect.stringContaining("membatalkan"));
  });
});
