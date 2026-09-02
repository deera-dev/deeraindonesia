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

// api.js di-mock utuh — useAuth() sekarang memanggil upsertProfile() dari
// sana tiap kali user dikenali (sumber daftar @mention komentar Planning,
// permintaan Denny 2026-09). Fungsi lain (signIn dkk) cuma re-export barrel
// yang tidak dipanggil di test file ini, jadi cukup stub kosong.
vi.mock("./api", () => ({
  signIn: vi.fn(),
  signOut: vi.fn(),
  getCurrentUser: vi.fn(),
  displayName: vi.fn(),
  upsertProfile: (...args) => upsertProfileMock(...args),
}));

const { useAuth } = await import("./hooks");

describe("useAuth", () => {
  let capturedCallback;

  beforeEach(() => {
    unsubscribe.mockReset();
    onAuthStateChange.mockReset();
    upsertProfileMock.mockReset();
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

  // ── Sinkron profiles (upsertProfile) — sumber daftar @mention komentar
  // Planning, permintaan Denny 2026-09 ─────────────────────────────────
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

      await waitFor(() => expect(unsubscribe).not.toHaveBeenCalled()); // pastikan effect sempat jalan
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
        // Objek session BARU tapi id user SAMA — simulasi TOKEN_REFRESHED
        capturedCallback("TOKEN_REFRESHED", { user: { ...fakeUser } });
      });

      // Beri kesempatan effect jalan lagi kalau memang akan terpanggil ulang
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
});
