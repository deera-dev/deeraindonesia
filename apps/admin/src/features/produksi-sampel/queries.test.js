import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createWrapper } from "../../../../../test/utils";

vi.mock("./api", () => ({
  fetchSampels: vi.fn().mockResolvedValue([{ id: "s1" }]),
  updateSampel: vi.fn().mockResolvedValue(undefined),
  createSampels: vi.fn().mockResolvedValue([{ nomor: "SPL-001" }]),
  createPlanning: vi.fn().mockResolvedValue({ nomor: "SPL-002" }),
  reorderPlanning: vi.fn().mockResolvedValue(undefined),
  markSampelDibuat: vi.fn().mockResolvedValue(undefined),
  saveBatchDecisions: vi.fn().mockResolvedValue([]),
  deleteSampel: vi.fn().mockResolvedValue(undefined),
  togglePinned: vi.fn().mockResolvedValue(undefined),
  fetchComments: vi.fn().mockResolvedValue([{ id: "c1" }]),
  addComment: vi.fn().mockResolvedValue({ id: "c2" }),
  deleteComment: vi.fn().mockResolvedValue(undefined),
  logWorkOrder: vi.fn().mockResolvedValue(undefined),
}));

import { createPlanning, reorderPlanning, togglePinned, addComment, deleteComment, logWorkOrder } from "./api";
import {
  produksiSampelKeys,
  sampelCommentsKeys,
  useSampelsQuery, useUpdateSampelMutation, useCreateSampelsMutation,
  useCreatePlanningMutation, useReorderPlanningMutation, useMarkSampelDibuatMutation,
  useSaveBatchDecisionsMutation, useDeleteSampelMutation,
  useTogglePinnedMutation, useCommentsQuery, useAddCommentMutation, useDeleteCommentMutation,
  useLogWorkOrderMutation,
} from "./queries";

const wrapper = createWrapper();
beforeEach(() => vi.clearAllMocks());

describe("produksiSampelKeys", () => {
  it("has all key", () => {
    expect(produksiSampelKeys.all).toEqual(["produksi-sampel"]);
  });
});

describe("useSampelsQuery", () => {
  it("returns sampel data", async () => {
    const { result } = renderHook(() => useSampelsQuery(), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "s1" }]);
  });
});

describe("useUpdateSampelMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useUpdateSampelMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});

describe("useCreateSampelsMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useCreateSampelsMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});

describe("useCreatePlanningMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useCreatePlanningMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });

  it("meneruskan bahanItems & urutan ke createPlanning() dgn urutan posisional yang benar", async () => {
    const { result } = renderHook(() => useCreatePlanningMutation(), { wrapper });
    const entry = { nama: "X", tanggal: "2026-08-01" };
    const bahanItems = [{ nama_bahan: "Wolfis" }];
    await result.current.mutateAsync({
      entry,
      bahanFotoUrl: "url-bahan",
      modelFotoUrls: ["url-model"],
      bahanItems,
      urutan: 2,
      userEmail: "a@b.com",
      userName: "A",
    });
    expect(createPlanning).toHaveBeenCalledWith(
      entry,
      "url-bahan",
      ["url-model"],
      bahanItems,
      2,
      { userEmail: "a@b.com", userName: "A" },
    );
  });
});

describe("useReorderPlanningMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useReorderPlanningMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });

  it("meneruskan updates ke reorderPlanning()", async () => {
    const { result } = renderHook(() => useReorderPlanningMutation(), { wrapper });
    const updates = [{ id: "s1", urutan: 0 }, { id: "s2", urutan: 1 }];
    await result.current.mutateAsync(updates);
    expect(reorderPlanning).toHaveBeenCalledWith(updates);
  });
});

describe("useMarkSampelDibuatMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useMarkSampelDibuatMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});

describe("useSaveBatchDecisionsMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useSaveBatchDecisionsMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});

describe("useDeleteSampelMutation", () => {
  it("has mutateAsync callable", () => {
    const { result } = renderHook(() => useDeleteSampelMutation(), { wrapper });
    expect(typeof result.current.mutateAsync).toBe("function");
  });
});

describe("sampelCommentsKeys", () => {
  it("bySampel menghasilkan key unik per sampelId", () => {
    expect(sampelCommentsKeys.bySampel("s1")).toEqual(["sampel-comments", "s1"]);
  });
});

describe("useTogglePinnedMutation", () => {
  it("meneruskan id & pinned ke togglePinned()", async () => {
    const { result } = renderHook(() => useTogglePinnedMutation(), { wrapper });
    await result.current.mutateAsync({ id: "s1", pinned: true });
    expect(togglePinned).toHaveBeenCalledWith("s1", true);
  });
});

describe("useCommentsQuery", () => {
  it("enabled hanya kalau sampelId ada", async () => {
    const { result } = renderHook(() => useCommentsQuery("s1"), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: "c1" }]);
  });

  it("tidak fetch kalau sampelId kosong", () => {
    const { result } = renderHook(() => useCommentsQuery(undefined), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("useAddCommentMutation", () => {
  it("meneruskan params ke addComment()", async () => {
    const { result } = renderHook(() => useAddCommentMutation(), { wrapper });
    const params = { sampelId: "s1", text: "halo" };
    await result.current.mutateAsync(params);
    expect(addComment.mock.calls[0][0]).toEqual(params);
  });
});

describe("useDeleteCommentMutation", () => {
  it("meneruskan id ke deleteComment()", async () => {
    const { result } = renderHook(() => useDeleteCommentMutation(), { wrapper });
    await result.current.mutateAsync({ id: "c1", sampelId: "s1" });
    expect(deleteComment).toHaveBeenCalledWith("c1");
  });
});

describe("useLogWorkOrderMutation (permintaan Denny 2026-09: Work Order tukang potong)", () => {
  it("meneruskan params ke logWorkOrder()", async () => {
    const { result } = renderHook(() => useLogWorkOrderMutation(), { wrapper });
    const params = { sampel: { nomor: "SPL-001", nama: "X" }, sizes: ["Midi"], catatanPenting: "" };
    await result.current.mutateAsync(params);
    expect(logWorkOrder.mock.calls[0][0]).toEqual(params);
  });
});
