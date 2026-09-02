import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createQueryWrapper } from "../../../../test/helpers/renderWithProviders";

const useProfilesQuery = vi.fn();
vi.mock("./queries", () => ({
  useProfilesQuery: (...args) => useProfilesQuery(...args),
}));

const { useProfiles } = await import("./hooks");

describe("useProfiles", () => {
  beforeEach(() => {
    useProfilesQuery.mockReset();
  });

  it("mengembalikan { profiles, loading } dari data query", () => {
    useProfilesQuery.mockReturnValue({ data: [{ id: "u1", full_name: "Andi" }], isLoading: false });

    const { result } = renderHook(() => useProfiles(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.profiles).toEqual([{ id: "u1", full_name: "Andi" }]);
    expect(result.current.loading).toBe(false);
  });

  it("fallback profiles ke array kosong saat data undefined", () => {
    useProfilesQuery.mockReturnValue({ data: undefined, isLoading: true });

    const { result } = renderHook(() => useProfiles(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.profiles).toEqual([]);
    expect(result.current.loading).toBe(true);
  });
});
