import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTransactionNotification } from "./useTransactionNotification";

const origNotification = global.Notification;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  global.Notification = origNotification;
  delete navigator.serviceWorker;
});

describe("useTransactionNotification", () => {
  it("returns notifyTransaction function", () => {
    const { result } = renderHook(() => useTransactionNotification());
    expect(typeof result.current.notifyTransaction).toBe("function");
  });

  it("does nothing when Notification API not available", () => {
    delete global.Notification;
    const { result } = renderHook(() => useTransactionNotification());
    expect(() => result.current.notifyTransaction({ total: 100000, itemCount: 2 })).not.toThrow();
  });

  it("does nothing when permission is not granted", () => {
    global.Notification = Object.assign(function Notification() {}, { permission: "default" });
    const { result } = renderHook(() => useTransactionNotification());
    expect(() => result.current.notifyTransaction({ total: 100000, itemCount: 2 })).not.toThrow();
  });

  it("calls new Notification when permission granted and no service worker", () => {
    const calls = [];
    function MockNotification(title, opts) { calls.push({ title, opts }); }
    MockNotification.permission = "granted";
    global.Notification = MockNotification;
    delete navigator.serviceWorker;
    const { result } = renderHook(() => useTransactionNotification());
    result.current.notifyTransaction({ total: 150000, itemCount: 3, buyerName: "BUDI" });
    expect(calls.length).toBe(1);
  });

  it("includes buyerName in notification body when provided", () => {
    let capturedOptions;
    function MockNotification(title, opts) { capturedOptions = opts; }
    MockNotification.permission = "granted";
    global.Notification = MockNotification;
    delete navigator.serviceWorker;
    const { result } = renderHook(() => useTransactionNotification());
    result.current.notifyTransaction({ total: 100000, itemCount: 1, buyerName: "SARI" });
    expect(capturedOptions.body).toContain("SARI");
  });

  it("does not include buyer line when buyerName not provided", () => {
    let capturedOptions;
    function MockNotification(title, opts) { capturedOptions = opts; }
    MockNotification.permission = "granted";
    global.Notification = MockNotification;
    delete navigator.serviceWorker;
    const { result } = renderHook(() => useTransactionNotification());
    result.current.notifyTransaction({ total: 100000, itemCount: 1 });
    expect(capturedOptions.body).not.toContain("Pembeli");
  });

  it("uses showNotification via service worker when controller exists", async () => {
    const showNotif = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "serviceWorker", {
      value: {
        controller: {},
        ready: Promise.resolve({ showNotification: showNotif }),
      },
      configurable: true,
      writable: true,
    });
    function MockNotification(title, opts) {}
    MockNotification.permission = "granted";
    global.Notification = MockNotification;
    const { result } = renderHook(() => useTransactionNotification());
    result.current.notifyTransaction({ total: 100000, itemCount: 2 });
    await new Promise((r) => setTimeout(r, 50));
    expect(showNotif).toHaveBeenCalled();
  });
});
