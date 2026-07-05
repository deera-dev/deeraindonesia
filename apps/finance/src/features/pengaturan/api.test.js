import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@deera/shared/lib/supabase", () => {
  const chain = {};
  for (const m of ["select","eq","order","update","insert","delete","upsert","in","single","maybeSingle"]) {
    chain[m] = vi.fn().mockReturnValue(chain);
  }
  chain.then = (resolve) => resolve({ data: null, error: null });
  return { supabase: { from: vi.fn().mockReturnValue(chain), _chain: chain } };
});

vi.mock("./utils", () => ({
  DEFAULT_FINANCE_CONFIG: {
    tarif_pola: 10000,
    tarif_sampel: 5000,
  },
}));

import { supabase } from "@deera/shared/lib/supabase";
import { fetchFinanceConfig, saveFinanceConfigValue } from "./api";

const chain = supabase._chain;
beforeEach(() => { vi.clearAllMocks(); });

describe("fetchFinanceConfig", () => {
  it("merges DB rows into DEFAULT_FINANCE_CONFIG", async () => {
    chain.then = (resolve) => resolve({ data: [{ key: "tarif_pola", nilai: 12000 }] });
    const config = await fetchFinanceConfig();
    expect(config.tarif_pola).toBe(12000);
    expect(config.tarif_sampel).toBe(5000); // default kept
  });
  it("returns defaults when data is null", async () => {
    chain.then = (resolve) => resolve({ data: null });
    const config = await fetchFinanceConfig();
    expect(config.tarif_pola).toBe(10000);
  });
  it("ignores unknown keys from DB", async () => {
    chain.then = (resolve) => resolve({ data: [{ key: "unknown_key", nilai: 99 }] });
    const config = await fetchFinanceConfig();
    expect(config.unknown_key).toBeUndefined();
  });
});

describe("saveFinanceConfigValue", () => {
  it("calls upsert with key and nilai", async () => {
    chain.then = (resolve) => resolve({ error: null });
    await saveFinanceConfigValue("tarif_pola", 15000);
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ key: "tarif_pola", nilai: 15000 }),
      { onConflict: "key" }
    );
  });
  it("throws on error", async () => {
    chain.then = (resolve, reject) => reject(new Error("fail"));
    await expect(saveFinanceConfigValue("key", 0)).rejects.toThrow();
  });
});

describe("saveFinanceConfigValue — error-via-resolve", () => {
  it("throws when error is truthy", async () => {
    chain.then = (resolve) => resolve({ error: new Error("upsert fail") });
    await expect(saveFinanceConfigValue("tarif_pola", 0)).rejects.toThrow("upsert fail");
  });
});
