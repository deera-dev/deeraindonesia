import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("../../lib/supabase", () => ({ supabase: supabaseMock }));

const { fetchAllProfiles } = await import("./api");

describe("fetchAllProfiles", () => {
  beforeEach(() => {
    resetSupabaseMock(supabaseMock);
  });

  it("memanggil supabase.from('profiles') dan mengembalikan data terurut nama", async () => {
    const data = [
      { id: "u1", email: "andi@deera.id", full_name: "Andi" },
      { id: "u2", email: "budi@deera.id", full_name: "Budi" },
    ];
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data, error: null }));

    const result = await fetchAllProfiles();

    expect(supabaseMock.from).toHaveBeenCalledWith("profiles");
    expect(result).toBe(data);
  });

  it("mengembalikan array kosong saat data null", async () => {
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error: null }));

    const result = await fetchAllProfiles();

    expect(result).toEqual([]);
  });

  it("melempar error saat supabase mengembalikan error", async () => {
    const error = new Error("query failed");
    supabaseMock.from.mockReturnValueOnce(makeBuilder({ data: null, error }));

    await expect(fetchAllProfiles()).rejects.toThrow("query failed");
  });
});
