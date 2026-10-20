import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../../../../test/helpers/renderWithProviders";

const fetchLatestVersion = vi.fn();
vi.mock("./api", () => ({ fetchLatestVersion: (...args) => fetchLatestVersion(...args) }));

const { useLatestVersionQuery } = await import("./queries");

describe("useLatestVersionQuery", () => {
  beforeEach(() => {
    fetchLatestVersion.mockReset();
  });

  it("memanggil fetchLatestVersion dan mengembalikan version", async () => {
    fetchLatestVersion.mockResolvedValue("xyz789");

    const { result } = renderHook(() => useLatestVersionQuery(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchLatestVersion).toHaveBeenCalled();
    expect(result.current.data).toBe("xyz789");
  });

  it("tidak retry saat fetchLatestVersion gagal", async () => {
    fetchLatestVersion.mockRejectedValue(new Error("network error"));

    const { result } = renderHook(() => useLatestVersionQuery(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(fetchLatestVersion).toHaveBeenCalledTimes(1);
  });
});
