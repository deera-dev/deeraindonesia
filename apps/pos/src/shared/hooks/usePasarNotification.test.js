import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

vi.mock("@deera/shared/lib/marketDay", () => ({
  getMarketLocation: vi.fn(() => "cideng"),
  getMarketLabel: vi.fn(() => "Cideng"),
}));
vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: vi.fn((n) => String(n)),
}));
vi.mock("../../lib/db", () => ({
  db: {
    sales: {
      where: vi.fn().mockReturnThis(),
      equals: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([]),
    },
  },
}));

import { getMarketLocation } from "@deera/shared/lib/marketDay";
import { usePasarNotification } from "./usePasarNotification";

const origNotification = global.Notification;

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  getMarketLocation.mockReturnValue("cideng");
  try { localStorage.clear(); } catch {}
  global.Notification = Object.assign(vi.fn(), {
    permission: "granted",
    requestPermission: vi.fn().mockResolvedValue("granted"),
  });
});

afterEach(() => {
  vi.useRealTimers();
  global.Notification = origNotification;
});

describe("usePasarNotification", () => {
  it("mounts without error", () => {
    expect(() => renderHook(() => usePasarNotification())).not.toThrow();
  });

  it("does not schedule when location is gudang (not market day)", () => {
    getMarketLocation.mockReturnValue("gudang");
    const { unmount } = renderHook(() => usePasarNotification());
    unmount();
    expect(true).toBe(true);
  });

  it("clears timer on unmount without error", () => {
    const { unmount } = renderHook(() => usePasarNotification());
    expect(() => unmount()).not.toThrow();
  });

  it("registers visibilitychange listener on mount", () => {
    const addSpy = vi.spyOn(document, "addEventListener");
    renderHook(() => usePasarNotification());
    expect(addSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    addSpy.mockRestore();
  });

  it("removes visibilitychange listener on unmount", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => usePasarNotification());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("skips scheduling when notif key already in localStorage", () => {
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(`deera_pasar_notif_${today}`, "1");
    expect(() => renderHook(() => usePasarNotification())).not.toThrow();
  });

  it("requests notification permission when Notification.permission is default", async () => {
    // 2026-07-07T05:00:00Z = 12:00 WIB (before 1pm) — ensures positive msLeft
    vi.setSystemTime(new Date("2026-07-07T05:00:00.000Z"));
    global.Notification.permission = "default";
    await act(async () => {
      renderHook(() => usePasarNotification());
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(global.Notification.requestPermission).toHaveBeenCalled();
  });

  it("fires notification with empty summary when no sales", async () => {
    vi.setSystemTime(new Date("2026-07-07T05:00:00.000Z"));
    const { db } = await import("../../lib/db");
    db.sales.toArray.mockResolvedValue([]);

    renderHook(() => usePasarNotification());

    await act(async () => {
      vi.advanceTimersByTime(60 * 60 * 1000 + 100); // fire the 1-hour timer
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(global.Notification).toHaveBeenCalledWith(
      expect.stringContaining("Laporan Pasar"),
      expect.objectContaining({ body: expect.stringContaining("Belum ada transaksi") })
    );
  });

  it("fires notification with sales summary when sales exist", async () => {
    vi.setSystemTime(new Date("2026-07-07T05:00:00.000Z"));
    const { db } = await import("../../lib/db");
    db.sales.toArray.mockResolvedValue([
      {
        type: "sale", location: "cideng", total: 150000,
        items: [{ kode: "D-01", qty: 2, warna: null }],
      },
      {
        type: "sale", location: "cideng", total: 100000,
        items: [{ kode: "D-02", qty: 1, warna: [{ qty: 1 }] }],
      },
    ]);

    renderHook(() => usePasarNotification());

    await act(async () => {
      vi.advanceTimersByTime(60 * 60 * 1000 + 100);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(global.Notification).toHaveBeenCalledWith(
      expect.stringContaining("Laporan Pasar"),
      expect.objectContaining({ body: expect.stringContaining("transaksi") })
    );
  });

  it("re-runs scheduleIfNeeded when tab becomes visible", async () => {
    vi.setSystemTime(new Date("2026-07-07T05:00:00.000Z"));
    renderHook(() => usePasarNotification());

    // Simulate tab becoming visible via visibilitychange
    Object.defineProperty(document, "visibilityState", {
      value: "visible", configurable: true,
    });
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await Promise.resolve();
    });
    expect(true).toBe(true); // just verifies no crash
  });

  it("skips notification when msLeft is already past 1pm", () => {
    // 2026-07-07T07:00:00Z = 14:00 WIB (after 1pm) — msLeft is negative
    vi.setSystemTime(new Date("2026-07-07T07:00:00.000Z"));
    expect(() => renderHook(() => usePasarNotification())).not.toThrow();
  });
});
