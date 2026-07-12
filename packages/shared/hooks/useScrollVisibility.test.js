import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { createRef } from "react";
import { useScrollVisibility } from "./useScrollVisibility";

// Scroll-tracking di-throttle lewat requestAnimationFrame (lihat komentar
// di useScrollVisibility.js) — pengecekan hasil jadi ASINKRON 1 frame,
// jadi test di bawah pakai `waitFor`.

describe("useScrollVisibility (mode window)", () => {
  beforeEach(() => {
    window.scrollY = 0;
  });

  it("false di awal saat scrollY masih 0", () => {
    const { result } = renderHook(() => useScrollVisibility());
    expect(result.current).toBe(false);
  });

  it("true setelah window scroll melewati threshold default (300)", async () => {
    const { result } = renderHook(() => useScrollVisibility());
    window.scrollY = 400;
    act(() => window.dispatchEvent(new Event("scroll")));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("memakai threshold custom", async () => {
    const { result } = renderHook(() => useScrollVisibility({ threshold: 50 }));
    window.scrollY = 60;
    act(() => window.dispatchEvent(new Event("scroll")));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("kembali false saat scroll kembali ke bawah threshold", async () => {
    const { result } = renderHook(() => useScrollVisibility());
    window.scrollY = 400;
    act(() => window.dispatchEvent(new Event("scroll")));
    await waitFor(() => expect(result.current).toBe(true));

    window.scrollY = 0;
    act(() => window.dispatchEvent(new Event("scroll")));
    await waitFor(() => expect(result.current).toBe(false));
  });

  it("cek posisi awal saat mount TANPA menunggu event scroll pertama", () => {
    window.scrollY = 500;
    const { result } = renderHook(() => useScrollVisibility());
    // measure() dipanggil sinkron sekali di dalam useEffect saat mount
    expect(result.current).toBe(true);
  });

  it("listener scroll didaftarkan sebagai passive & dilepas saat unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => useScrollVisibility());

    const call = addSpy.mock.calls.find(([type]) => type === "scroll");
    expect(call[2]).toEqual({ passive: true });

    unmount();
    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it("tidak menumpuk rAF ganda kalau event scroll terpicu berkali-kali sebelum frame berikutnya", async () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");
    const { result } = renderHook(() => useScrollVisibility());
    window.scrollY = 400;
    // Trigger scroll berkali-kali secara sinkron (sebelum rAF pertama sempat
    // jalan) — tickingRef harus mencegah rAF terjadwal lebih dari 1x per batch.
    act(() => {
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
      window.dispatchEvent(new Event("scroll"));
    });
    const callsAfterBurst = rafSpy.mock.calls.length;
    expect(callsAfterBurst).toBeLessThanOrEqual(2); // 1 dari mount + maksimal 1 dari burst
    await waitFor(() => expect(result.current).toBe(true));
    rafSpy.mockRestore();
  });
});

describe("useScrollVisibility (mode scrollEl)", () => {
  it("memakai el.scrollTop, bukan window.scrollY, saat scrollEl diberikan", async () => {
    const ref = createRef();
    const el = document.createElement("div");
    Object.defineProperty(el, "scrollTop", { value: 500, configurable: true });
    ref.current = el;

    const { result } = renderHook(() => useScrollVisibility({ scrollEl: ref }));
    act(() => el.dispatchEvent(new Event("scroll")));
    await waitFor(() => expect(result.current).toBe(true));
  });

  it("scrollEl null (belum ter-mount) fallback ke window tanpa error", () => {
    const ref = { current: null };
    expect(() => renderHook(() => useScrollVisibility({ scrollEl: ref }))).not.toThrow();
  });
});
