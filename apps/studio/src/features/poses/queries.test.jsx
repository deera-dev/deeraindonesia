import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./api", () => ({
  fetchPoses: vi.fn().mockResolvedValue([{ id: "p1" }]),
  createPose: vi.fn().mockResolvedValue({ id: "p2" }),
  updatePose: vi.fn().mockResolvedValue({ id: "p1" }),
  deletePose: vi.fn().mockResolvedValue(undefined),
  setBackView: vi.fn().mockResolvedValue({ id: "p1" }),
}));

import {
  poseKeys,
  useCreatePoseMutation,
  useDeletePoseMutation,
  usePosesQuery,
  useSetBackViewMutation,
  useUpdatePoseMutation,
} from "./queries";

function wrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("poseKeys", () => {
  it("list key includes model id", () => {
    expect(poseKeys.list("m1")).toEqual(["poses", "list", "m1"]);
  });
});

describe("usePosesQuery", () => {
  it("fetches poses for the given model", async () => {
    const { result } = renderHook(() => usePosesQuery("m1"), { wrapper: wrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(1);
  });

  it("is disabled when modelId is empty", () => {
    const { result } = renderHook(() => usePosesQuery(""), { wrapper: wrapper() });
    expect(result.current.fetchStatus).toBe("idle");
  });
});

describe("mutations", () => {
  it("useCreatePoseMutation runs mutationFn and invalidates", async () => {
    const { result } = renderHook(() => useCreatePoseMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({
        model_id: "m1",
        name: "A",
        description: null,
        source: "vendor_archive",
        reference_image_url: "u",
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useUpdatePoseMutation runs mutationFn and invalidates", async () => {
    const { result } = renderHook(() => useUpdatePoseMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: "p1", patch: { is_active: false } });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useDeletePoseMutation runs mutationFn and invalidates", async () => {
    const { result } = renderHook(() => useDeletePoseMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync("p1");
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it("useSetBackViewMutation runs mutationFn and invalidates", async () => {
    const { result } = renderHook(() => useSetBackViewMutation(), { wrapper: wrapper() });
    await act(async () => {
      await result.current.mutateAsync({ id: "p1", model_id: "m1", value: true });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });
});
