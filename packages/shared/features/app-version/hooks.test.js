import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { createQueryWrapper } from "../../../../test/helpers/renderWithProviders";

const useLatestVersionQuery = vi.fn();
vi.mock("./queries", () => ({
  useLatestVersionQuery: (...args) => useLatestVersionQuery(...args),
}));

const { useUpdateAvailable } = await import("./hooks");

describe("useUpdateAvailable", () => {
  beforeEach(() => {
    useLatestVersionQuery.mockReset();
  });

  it("isUpdateAvailable false saat latestVersion belum ada", () => {
    useLatestVersionQuery.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useUpdateAvailable(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isUpdateAvailable).toBe(false);
  });

  it("isUpdateAvailable false saat latestVersion sama dengan currentVersion", () => {
    useLatestVersionQuery.mockReturnValue({ data: "dev" });

    const { result } = renderHook(() => useUpdateAvailable(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isUpdateAvailable).toBe(false);
    expect(result.current.currentVersion).toBe("dev");
  });

  it("isUpdateAvailable true saat latestVersion berbeda dari currentVersion", () => {
    useLatestVersionQuery.mockReturnValue({ data: "new-build-id" });

    const { result } = renderHook(() => useUpdateAvailable(), {
      wrapper: createQueryWrapper(),
    });

    expect(result.current.isUpdateAvailable).toBe(true);
    expect(result.current.latestVersion).toBe("new-build-id");
  });
});
