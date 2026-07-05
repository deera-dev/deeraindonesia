import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: { from: vi.fn() },
}));
vi.mock("@deera/shared/features/auth/hooks", () => ({
  getCurrentUser: vi.fn().mockResolvedValue({ email: "admin@deera.id" }),
  displayName: vi.fn(() => "Admin"),
}));

import { supabase } from "@deera/shared/lib/supabase";
import { logActivity, fetchProductHistory } from "./api";

function makeChain(terminal, result) {
  const chain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    [terminal]: vi.fn().mockResolvedValue(result),
  };
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  supabase.from.mockReturnValue(makeChain("insert", { error: null }));
});

describe("logActivity", () => {
  it("calls supabase.from('product_history').insert", async () => {
    const chain = makeChain("insert", { error: null });
    supabase.from.mockReturnValue(chain);
    await logActivity({ action: "pelanggan-tambah", category: "pelanggan" });
    expect(supabase.from).toHaveBeenCalledWith("product_history");
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ action: "pelanggan-tambah", category: "pelanggan" })
    );
  });

  it("includes user_email from getCurrentUser", async () => {
    const chain = makeChain("insert", { error: null });
    supabase.from.mockReturnValue(chain);
    await logActivity({ action: "pelanggan-edit" });
    expect(chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_email: "admin@deera.id" })
    );
  });

  it("does not throw when insert fails (silently swallows)", async () => {
    const chain = makeChain("insert", { error: new Error("fail") });
    supabase.from.mockReturnValue(chain);
    await expect(logActivity({ action: "pelanggan-hapus" })).resolves.toBeUndefined();
  });

  it("does not throw when getCurrentUser rejects", async () => {
    const { getCurrentUser } = await import("@deera/shared/features/auth/hooks");
    getCurrentUser.mockRejectedValueOnce(new Error("auth error"));
    await expect(logActivity({ action: "test" })).resolves.toBeUndefined();
  });
});

describe("fetchProductHistory", () => {
  it("queries product_history with order and limit", async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };
    chain.then = undefined;
    const mockResolved = { data: [{ id: "h1" }], error: null };
    // make the chain awaitable at the end via in() returning the resolved val
    // use a terminal that doesn't need .in() -- call with no category filter
    supabase.from.mockReturnValue({
      ...chain,
      limit: vi.fn().mockResolvedValue(mockResolved),
    });
    const result = await fetchProductHistory({ dateFrom: null, dateTo: null, category: "semua" });
    expect(supabase.from).toHaveBeenCalledWith("product_history");
    expect(result.length).toBe(1);
  });

  it("adds gte/lte filters when dateFrom/dateTo provided", async () => {
    const innerChain = {
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
    };
    innerChain.lte = vi.fn().mockResolvedValue({ data: [], error: null });
    const chain = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    };
    supabase.from.mockReturnValue(chain);
    await fetchProductHistory({ dateFrom: "2026-07-01", dateTo: "2026-07-04", category: "semua" });
    expect(chain.limit).toHaveBeenCalled();
  });

  it("throws when supabase returns error", async () => {
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null, error: { message: "db error" } }),
    });
    await expect(fetchProductHistory({ dateFrom: null, dateTo: null, category: "semua" })).rejects.toMatchObject({
      message: "db error",
    });
  });

  it("applies category in() filter when category is not semua", async () => {
    const inMock = vi.fn().mockResolvedValue({ data: [], error: null });
    supabase.from.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnValue({
        in: inMock,
      }),
    });
    await fetchProductHistory({ dateFrom: null, dateTo: null, category: "produk" });
    expect(inMock).toHaveBeenCalledWith("category", ["produk"]);
  });
});
