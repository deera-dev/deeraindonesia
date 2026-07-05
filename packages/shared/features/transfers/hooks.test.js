import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

// Mencegah real lib/supabase.js (yang dipanggil transitif lewat ./api saat
// hooks.js melakukan `export { generateTransferNo } from "./api"`) dari
// benar-benar membuat client Supabase nyata saat import-time.
vi.mock("../../lib/supabase", () => ({ supabase: {} }));

const transfersQueryState = { data: undefined, isLoading: false, error: null, refetch: vi.fn() };
const pendingCountState = { data: undefined };
const createMutation = { mutateAsync: vi.fn() };
const approveMutation = { mutateAsync: vi.fn() };
const rejectMutation = { mutateAsync: vi.fn() };
const deleteMutation = { mutateAsync: vi.fn() };
const updateMutation = { mutateAsync: vi.fn() };

vi.mock("./queries", () => ({
  useTransfersQuery: () => transfersQueryState,
  usePendingTransferCountQuery: () => pendingCountState,
  useCreateTransferMutation: () => createMutation,
  useApproveTransferMutation: () => approveMutation,
  useRejectTransferMutation: () => rejectMutation,
  useDeleteTransferMutation: () => deleteMutation,
  useUpdateTransferMutation: () => updateMutation,
}));

const {
  useTransfers,
  usePendingTransferCount,
  useCreateTransfer,
  useApproveTransfer,
  useRejectTransfer,
  useDeleteTransfer,
  useUpdateTransfer,
  generateTransferNo,
} = await import("./hooks");

beforeEach(() => {
  transfersQueryState.data = undefined;
  transfersQueryState.isLoading = false;
  transfersQueryState.error = null;
  pendingCountState.data = undefined;
  createMutation.mutateAsync.mockReset();
  approveMutation.mutateAsync.mockReset();
  rejectMutation.mutateAsync.mockReset();
  deleteMutation.mutateAsync.mockReset();
  updateMutation.mutateAsync.mockReset();
});

describe("useTransfers", () => {
  it("fallback ke array kosong saat data undefined", () => {
    const { result } = renderHook(() => useTransfers());
    expect(result.current.transfers).toEqual([]);
    expect(result.current.reload).toBe(transfersQueryState.refetch);
  });

  it("mengembalikan data transfer saat tersedia", () => {
    transfersQueryState.data = [{ id: "t1" }];
    transfersQueryState.isLoading = true;
    const { result } = renderHook(() => useTransfers("approved"));
    expect(result.current.transfers).toEqual([{ id: "t1" }]);
    expect(result.current.loading).toBe(true);
  });
});

describe("usePendingTransferCount", () => {
  it("fallback ke 0 saat data undefined", () => {
    const { result } = renderHook(() => usePendingTransferCount());
    expect(result.current).toBe(0);
  });

  it("mengembalikan count saat tersedia", () => {
    pendingCountState.data = 5;
    const { result } = renderHook(() => usePendingTransferCount());
    expect(result.current).toBe(5);
  });
});

describe("useCreateTransfer", () => {
  it("memanggil mutateAsync dengan payload yang sama", async () => {
    const { result } = renderHook(() => useCreateTransfer());
    const payload = { fromLocation: "gudang", toLocation: "cideng", items: [], notes: "" };

    await result.current(payload);

    expect(createMutation.mutateAsync).toHaveBeenCalledWith(payload);
  });
});

describe("useApproveTransfer", () => {
  it("memanggil mutateAsync dengan transfer", async () => {
    const { result } = renderHook(() => useApproveTransfer());
    const transfer = { id: "t1" };

    await result.current(transfer);

    expect(approveMutation.mutateAsync).toHaveBeenCalledWith(transfer);
  });
});

describe("useRejectTransfer", () => {
  it("memanggil mutateAsync dengan transfer & reason default kosong", async () => {
    const { result } = renderHook(() => useRejectTransfer());
    const transfer = { id: "t1" };

    await result.current(transfer);

    expect(rejectMutation.mutateAsync).toHaveBeenCalledWith({ transfer, reason: "" });
  });

  it("memanggil mutateAsync dengan reason yang diberikan", async () => {
    const { result } = renderHook(() => useRejectTransfer());
    const transfer = { id: "t1" };

    await result.current(transfer, "Stok tidak sesuai");

    expect(rejectMutation.mutateAsync).toHaveBeenCalledWith({
      transfer,
      reason: "Stok tidak sesuai",
    });
  });
});

describe("useDeleteTransfer", () => {
  it("memanggil mutateAsync dengan transfer", async () => {
    const { result } = renderHook(() => useDeleteTransfer());
    const transfer = { id: "t1" };

    await result.current(transfer);

    expect(deleteMutation.mutateAsync).toHaveBeenCalledWith(transfer);
  });
});

describe("useUpdateTransfer", () => {
  it("memanggil mutateAsync dengan transfer & payload", async () => {
    const { result } = renderHook(() => useUpdateTransfer());
    const transfer = { id: "t1" };
    const payload = { fromLocation: "gudang", toLocation: "cideng", items: [] };

    await result.current(transfer, payload);

    expect(updateMutation.mutateAsync).toHaveBeenCalledWith({ transfer, payload });
  });
});

describe("generateTransferNo (re-export dari ./api)", () => {
  it("menghasilkan format SJ-YYYYMMDD-xxx", () => {
    expect(generateTransferNo()).toMatch(/^SJ-\d{8}-\d{3}$/);
  });
});
