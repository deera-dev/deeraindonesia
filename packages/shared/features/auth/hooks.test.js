import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

const onAuthStateChange = vi.fn();
const unsubscribe = vi.fn();
const upsertProfileMock = vi.fn();

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

vi.mock("./api", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  displayName: vi.fn(),
  upsertProfile: (...args) => upsertProfileMock(...args),
}));

const markInternalDeviceMock = vi.fn();
vi.mock("../../lib/internalDevice", () => ({ markInternalDevice: (...a) => markInternalDeviceMock(...a) }));

const { useAuth } = await import("./hooks");

describe("useAuth", () => {
  let capturedCallback;

  beforeEach(() => {
    unsubscribe.mockReset();
    onAuthStateChange.mockReset();
    upsertProfileMock.mockReset();
    markInternalDeviceMock.mockReset();
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

  describe("sinkron profiles via upsertProfile", () => {
    it("memanggil upsertProfile dengan user saat session dikenali (login baru ATAU sesi lama)", async () => {
      const fakeUser = { id: "u1", email: "budi@deera.id" };
      renderHook(() => useAuth());

      act(() => {
        capturedCallback("SIGNED_IN", { user: fakeUser });
      });

      await waitFor(() => expect(upsertProfileMock).toHaveBeenCalledWith(fakeUser));
    });

    it("TIDAK memanggil upsertProfile saat session kosong (logout)", async () => {
      renderHook(() => useAuth());

      act(() => {
        capturedCallback("SIGNED_OUT", null);
      });

      await waitFor(() => expect(unsubscribe).not.toHaveBeenCalled());
      expect(upsertProfileMock).not.toHaveBeenCalled();
    });

    it("tidak memanggil ulang upsertProfile kalau user.id sama persis (mis. token refresh, bukan login baru)", async () => {
      const fakeUser = { id: "u1", email: "budi@deera.id" };
      renderHook(() => useAuth());

      act(() => {
        capturedCallback("SIGNED_IN", { user: fakeUser });
      });
      await waitFor(() => expect(upsertProfileMock).toHaveBeenCalledTimes(1));

      act(() => {
        capturedCallback("TOKEN_REFRESHED", { user: { ...fakeUser } });
      });

      await new Promise((r) => setTimeout(r, 0));
      expect(upsertProfileMock).toHaveBeenCalledTimes(1);
    });

    it("memanggil ulang upsertProfile kalau user.id berbeda (ganti akun)", async () => {
      renderHook(() => useAuth());

      act(() => {
        capturedCallback("SIGNED_IN", { user: { id: "u1", email: "budi@deera.id" } });
      });
      await waitFor(() => expect(upsertProfileMock).toHaveBeenCalledTimes(1));

      act(() => {
        capturedCallback("SIGNED_IN", { user: { id: "u2", email: "andi@deera.id" } });
      });
      await waitFor(() => expect(upsertProfileMock).toHaveBeenCalledTimes(2));
    });
  });

  describe("tandai perangkat tim internal", () => {
    it("menandai perangkat saat login, tidak saat logout", async () => {
      renderHook(() => useAuth());
      act(() => {
        capturedCallback("SIGNED_OUT", null);
      });
      await waitFor(() => expect(markInternalDeviceMock).not.toHaveBeenCalled());
      act(() => {
        capturedCallback("SIGNED_IN", { user: { id: "u9", email: "tim@deera.id" } });
      });
      await waitFor(() => expect(markInternalDeviceMock).toHaveBeenCalled());
    });
  });
});
