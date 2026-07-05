import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";

vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
    })),
  },
}));
vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: vi.fn(() => ({ user: { email: "admin@deera.id" } })),
}));

import { usePushSubscription } from "./usePushSubscription";

beforeEach(() => {
  vi.clearAllMocks();
  // No VAPID key set in test env → subscribeToPush will early-return
  delete navigator.serviceWorker;
});

afterEach(() => {
  delete navigator.serviceWorker;
});

describe("usePushSubscription", () => {
  it("mounts without throwing", () => {
    expect(() => renderHook(() => usePushSubscription())).not.toThrow();
  });

  it("registers deera-notif-granted event listener", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    renderHook(() => usePushSubscription());
    expect(addSpy).toHaveBeenCalledWith("deera-notif-granted", expect.any(Function));
    addSpy.mockRestore();
  });

  it("removes event listener on unmount", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = renderHook(() => usePushSubscription());
    unmount();
    expect(removeSpy).toHaveBeenCalledWith("deera-notif-granted", expect.any(Function));
    removeSpy.mockRestore();
  });

  it("does not crash when serviceWorker is undefined", () => {
    expect(() => renderHook(() => usePushSubscription())).not.toThrow();
  });
});
