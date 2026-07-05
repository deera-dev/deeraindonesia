import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("theme/store — inisialisasi tema (module-level IIFE)", () => {
  let originalMatchMedia;

  beforeEach(() => {
    vi.resetModules();
    document.documentElement.classList.remove("dark");
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    vi.restoreAllMocks();
    window.matchMedia = originalMatchMedia;
    document.documentElement.classList.remove("dark");
  });

  it("memakai tema 'dark' yang tersimpan di localStorage dan menerapkan class dark", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("dark");

    const { useThemeStore } = await import("./store");

    expect(useThemeStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("memakai tema 'light' yang tersimpan di localStorage dan tidak menerapkan class dark", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("light");

    const { useThemeStore } = await import("./store");

    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("fallback ke prefers-color-scheme dark saat localStorage tidak punya nilai valid", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });

    const { useThemeStore } = await import("./store");

    expect(useThemeStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("fallback ke prefers-color-scheme light saat localStorage punya nilai tak dikenal", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("blue");
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const { useThemeStore } = await import("./store");

    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("fallback ke 'light' saat window.matchMedia tidak tersedia sama sekali", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
    window.matchMedia = undefined;

    const { useThemeStore } = await import("./store");

    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("fallback ke 'light' lewat catch internal getStored() saat localStorage.getItem melempar error", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("boom");
    });
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });

    const { useThemeStore } = await import("./store");

    expect(useThemeStore.getState().theme).toBe("light");
  });

  it("fallback ke 'light' lewat catch terluar saat window.matchMedia melempar error", async () => {
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue(null);
    window.matchMedia = vi.fn().mockImplementation(() => {
      throw new Error("boom");
    });

    const { useThemeStore } = await import("./store");

    expect(useThemeStore.getState().theme).toBe("light");
  });
});

describe("theme/store — toggleTheme", () => {
  beforeEach(() => {
    vi.resetModules();
    document.documentElement.classList.remove("dark");
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("light");
    window.matchMedia = vi.fn().mockReturnValue({ matches: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.documentElement.classList.remove("dark");
  });

  it("toggle dari light ke dark: set class dark + persist ke localStorage", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});

    const { useThemeStore } = await import("./store");
    useThemeStore.getState().toggleTheme();

    expect(useThemeStore.getState().theme).toBe("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(setItemSpy).toHaveBeenCalledWith("deera-theme", "dark");
  });

  it("toggle dua kali kembali ke light dan menghapus class dark", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});

    const { useThemeStore } = await import("./store");
    useThemeStore.getState().toggleTheme();
    useThemeStore.getState().toggleTheme();

    expect(useThemeStore.getState().theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("tetap mengubah state walau localStorage.setItem melempar error (ignore di catch)", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    const { useThemeStore } = await import("./store");

    expect(() => useThemeStore.getState().toggleTheme()).not.toThrow();
    expect(useThemeStore.getState().theme).toBe("dark");
  });
});
