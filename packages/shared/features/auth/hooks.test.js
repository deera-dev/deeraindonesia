import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const onAuthStateChange = vi.fn();
const unsubscribe = vi.fn();

vi.mock("../../lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (...args) => onAuthStateChange(...args),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      getUser: vi.fn(),
    },
  },
}));

const { useAuth } = await import("./hooks");

describe("useAuth", () => {
  let capturedCallback;

  beforeEach(() => {
    unsubscribe.mockReset();
    onAuthStateChange.mockReset();
    onAuthStateChange.mockImplementation((callback) => {
      capturedCallback = callback;
      return { data: { subscription: { unsubscribe } } };
    });
  });

  it("loading true dan user undefined sebelum auth state diketahui", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeUndefined();
  });

  it("set user dari session saat onAuthStateChange fire dengan session", async () => {
    const { result } = renderHook(() => useAuth());
    const fakeUser = { id: "u1", email: "budi@deera.id" };

    act(() => {
      capturedCallback("SIGNED_IN", { user: fakeUser });
    });

    await waitFor(() => expect(result.current.user).toBe(fakeUser));
    expect(result.current.loading).toBe(false);
  });

  it("set user ke null saat session tidak ada (logout)", async () => {
    const { result } = renderHook(() => useAuth());

    act(() => {
      capturedCallback("SIGNED_OUT", null);
    });

    await waitFor(() => expect(result.current.user).toBeNull());
    expect(result.current.loading).toBe(false);
  });

  it("unsubscribe dipanggil saat unmount", () => {
    const { unmount } = renderHook(() => useAuth());
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
