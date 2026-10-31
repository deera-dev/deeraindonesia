import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("supabase client", () => {
  let warnSpy;

  beforeEach(() => {
    vi.resetModules();
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    warnSpy.mockRestore();
  });

  it("membuat client tanpa warning saat env URL & ANON KEY tersedia", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "anon-key-123");

    const { supabase } = await import("./supabase");

    expect(supabase).toBeDefined();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("memunculkan warning saat env URL & ANON KEY tidak di-set", async () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    vi.stubEnv("VITE_SUPABASE_ANON_KEY", "");

    await expect(import("./supabase")).rejects.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      "[Supabase] VITE_SUPABASE_URL atau VITE_SUPABASE_ANON_KEY belum di-set di .env",
    );
  });
});
