import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./queries", () => ({
  usePosesQuery: vi.fn(() => ({ data: [{ id: "p1" }], isLoading: false, error: null })),
  useCreatePoseMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useUpdatePoseMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useDeletePoseMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
  useSetBackViewMutation: vi.fn(() => ({ mutateAsync: vi.fn() })),
}));

import { useCreatePose, useDeletePose, usePoses, useSetBackView, useUpdatePose } from "./hooks";
import { usePosesQuery } from "./queries";

function wrapper() {
  const qc = new QueryClient();
  return ({ children }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe("usePoses", () => {
  it("returns poses and loading=false", () => {
    const { result } = renderHook(() => usePoses("m1"), { wrapper: wrapper() });
    expect(result.current.poses).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });

  it("returns empty array when data is undefined", () => {
    usePosesQuery.mockReturnValueOnce({ data: undefined, isLoading: true, error: null });
    const { result } = renderHook(() => usePoses("m1"), { wrapper: wrapper() });
    expect(result.current.poses).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});

describe("function hooks", () => {
  it("useCreatePose returns a function", () => {
    const { result } = renderHook(() => useCreatePose(), { wrapper: wrapper() });
    expect(typeof result.current).toBe("function");
  });

  it("useUpdatePose returns a function", () => {
    const { result } = renderHook(() => useUpdatePose(), { wrapper: wrapper() });
    expect(typeof result.current).toBe("function");
  });

  it("useDeletePose returns a function", () => {
    const { result } = renderHook(() => useDeletePose(), { wrapper: wrapper() });
    expect(typeof result.current).toBe("function");
  });

  it("useSetBackView returns a function", () => {
    const { result } = renderHook(() => useSetBackView(), { wrapper: wrapper() });
    expect(typeof result.current).toBe("function");
  });
});
