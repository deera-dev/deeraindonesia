import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createTestQueryClient } from "../../../../test/helpers/queryClient";
import { createQueryWrapper } from "../../../../test/helpers/renderWithProviders";

const fetchTransfers = vi.fn();
const fetchPendingTransferCount = vi.fn();
const createTransferApi = vi.fn();
const approveTransferApi = vi.fn();
const rejectTransferApi = vi.fn();
const deleteTransferApi = vi.fn();
const updateTransferApi = vi.fn();

vi.mock("./api", () => ({
  fetchTransfers: (...args) => fetchTransfers(...args),
  fetchPendingTransferCount: (...args) => fetchPendingTransferCount(...args),
  createTransfer: (...args) => createTransferApi(...args),
  approveTransfer: (...args) => approveTransferApi(...args),
  rejectTransfer: (...args) => rejectTransferApi(...args),
  deleteTransfer: (...args) => deleteTransferApi(...args),
  updateTransfer: (...args) => updateTransferApi(...args),
}));

const authUser = { user: { email: "admin@deera.id" } };
vi.mock("../auth/hooks", () => ({ useAuth: () => authUser }));

const {
  useTransfersQuery,
  usePendingTransferCountQuery,
  useCreateTransferMutation,
  useApproveTransferMutation,
  useRejectTransferMutation,
  useDeleteTransferMutation,
  useUpdateTransferMutation,
  transferKeys,
} = await import("./queries");

beforeEach(() => {
  fetchTransfers.mockReset().mockResolvedValue([{ id: "t1" }]);
  fetchPendingTransferCount.mockReset().mockResolvedValue(3);
  createTransferApi.mockReset().mockResolvedValue({ id: "new" });
  approveTransferApi.mockReset().mockResolvedValue(undefined);
  rejectTransferApi.mockReset().mockResolvedValue(undefined);
  deleteTransferApi.mockReset().mockResolvedValue(undefined);
  updateTransferApi.mockReset().mockResolvedValue(undefined);
  authUser.user = { email: "admin@deera.id" };
});

describe("transferKeys", () => {
  it("punya bentuk key yang stabil", () => {
    expect(transferKeys.all).toEqual(["transfers"]);
    expect(transferKeys.list("pending", "a", "b")).toEqual(["transfers", "pending", "a", "b"]);
    expect(transferKeys.pendingCount).toEqual(["transfers", "pending-count"]);
  });
});

describe("useTransfersQuery", () => {
  it("fetch transfers sesuai filter", async () => {
    const { result } = renderHook(() => useTransfersQuery("approved", "2026-06-01", "2026-06-30"), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(fetchTransfers).toHaveBeenCalledWith("approved", "2026-06-01", "2026-06-30");
    expect(result.current.data).toEqual([{ id: "t1" }]);
  });
});

describe("usePendingTransferCountQuery", () => {
  it("fetch jumlah transfer pending", async () => {
    const { result } = renderHook(() => usePendingTransferCountQuery(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toBe(3);
  });
});

describe("useCreateTransferMutation", () => {
  it("memanggil createTransfer dengan user dari useAuth & invalidate query", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createQueryWrapper(queryClient);

    const { result } = renderHook(() => useCreateTransferMutation(), { wrapper });

    await result.current.mutateAsync({ fromLocation: "gudang", toLocation: "cideng", items: [] });

    expect(createTransferApi).toHaveBeenCalledWith({
      fromLocation: "gudang",
      toLocation: "cideng",
      items: [],
      user: { email: "admin@deera.id" },
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: transferKeys.all });
  });
});

describe("useApproveTransferMutation", () => {
  it("memanggil approveTransfer dengan transfer & user, invalidate query", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createQueryWrapper(queryClient);

    const { result } = renderHook(() => useApproveTransferMutation(), { wrapper });
    const transfer = { id: "t1" };

    await result.current.mutateAsync(transfer);

    expect(approveTransferApi).toHaveBeenCalledWith(transfer, { email: "admin@deera.id" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: transferKeys.all });
  });
});

describe("useRejectTransferMutation", () => {
  it("memanggil rejectTransfer dengan transfer, reason & user, invalidate query", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createQueryWrapper(queryClient);

    const { result } = renderHook(() => useRejectTransferMutation(), { wrapper });
    const transfer = { id: "t1" };

    await result.current.mutateAsync({ transfer, reason: "alasan" });

    expect(rejectTransferApi).toHaveBeenCalledWith(transfer, "alasan", { email: "admin@deera.id" });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: transferKeys.all });
  });
});

describe("useDeleteTransferMutation", () => {
  it("memanggil deleteTransfer, invalidate query", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createQueryWrapper(queryClient);

    const { result } = renderHook(() => useDeleteTransferMutation(), { wrapper });
    const transfer = { id: "t1" };

    await result.current.mutateAsync(transfer);

    expect(deleteTransferApi).toHaveBeenCalledWith(transfer);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: transferKeys.all });
  });
});

describe("useUpdateTransferMutation", () => {
  it("memanggil updateTransfer dengan transfer & payload, invalidate query", async () => {
    const queryClient = createTestQueryClient();
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    const wrapper = createQueryWrapper(queryClient);

    const { result } = renderHook(() => useUpdateTransferMutation(), { wrapper });
    const transfer = { id: "t1" };
    const payload = { fromLocation: "gudang", toLocation: "cideng", items: [] };

    await result.current.mutateAsync({ transfer, payload });

    expect(updateTransferApi).toHaveBeenCalledWith(transfer, payload);
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: transferKeys.all });
  });
});
