import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createQueryWrapper } from "../../../../test/helpers/renderWithProviders";

const fetchAllProfiles = vi.fn();
vi.mock("./api", () => ({ fetchAllProfiles: (...args) => fetchAllProfiles(...args) }));

const { useProfilesQuery } = await import("./queries");

describe("useProfilesQuery", () => {
  beforeEach(() => {
    fetchAllProfiles.mockReset();
  });

  it("memanggil fetchAllProfiles dan mengembalikan data", async () => {
    const data = [{ id: "u1", email: "andi@deera.id", full_name: "Andi" }];
    fetchAllProfiles.mockResolvedValue(data);

    const { result } = renderHook(() => useProfilesQuery(), {
      wrapper: createQueryWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchAllProfiles).toHaveBeenCalled();
    expect(result.current.data).toBe(data);
  });
});
