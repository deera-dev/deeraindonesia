import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { createSupabaseMock, makeBuilder, resetSupabaseMock } from "../../../../../test/helpers/supabaseMock";

const supabaseMock = createSupabaseMock();
vi.mock("@deera/shared/lib/supabase", () => ({ supabase: supabaseMock }));

const authState = { user: null };
vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => authState,
}));

// VAPID_PUBLIC_KEY dibaca dari import.meta.env di level modul (top-level
// const), jadi untuk menguji skenario "key di-set" vs "key tidak di-set"
// kita harus vi.stubEnv() lalu vi.resetModules() + import ulang modul dengan
// query string unik supaya benar-benar re-evaluasi top-level const tersebut
// (bukan cache modul lama).
let seq = 0;
async function importHookWithVapid(vapidValue) {
  vi.stubEnv("VITE_VAPID_PUBLIC_KEY", vapidValue ?? "");
  vi.resetModules();
  seq += 1;
  const specifier = "./usePushNotification.js?t=" + seq;
  const mod = await import(/* @vite-ignore */ specifier);
  return mod.usePushNotification;
}

function defineNavigatorServiceWorker(impl) {
  Object.defineProperty(navigator, "serviceWorker", {
    value: impl,
    configurable: true,
    writable: true,
  });
}

beforeEach(() => {
  resetSupabaseMock(supabaseMock);
  authState.user = null;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete navigator.serviceWorker;
});

describe("usePushNotification", () => {
  it("tidak melakukan apapun saat VITE_VAPID_PUBLIC_KEY belum di-set", async () => {
    const registerMock = vi.fn();
    defineNavigatorServiceWorker({ register: registerMock, ready: Promise.resolve() });
    vi.stubGlobal("PushManager", function PushManager() {});
    authState.user = { email: "admin@deera.id" };

    const usePushNotification = await importHookWithVapid("");
    renderHook(() => usePushNotification());

    await waitFor(() => {});
    expect(registerMock).not.toHaveBeenCalled();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("tidak setup push saat user belum login (user.email falsy)", async () => {
    const registerMock = vi.fn();
    defineNavigatorServiceWorker({ register: registerMock, ready: Promise.resolve() });
    vi.stubGlobal("PushManager", function PushManager() {});
    authState.user = null;

    const usePushNotification = await importHookWithVapid("AAAA");
    renderHook(() => usePushNotification());

    await waitFor(() => {});
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("tidak setup push saat browser tidak punya serviceWorker", async () => {
    // Tidak mendefinisikan navigator.serviceWorker sama sekali (default jsdom).
    vi.stubGlobal("PushManager", function PushManager() {});
    authState.user = { email: "admin@deera.id" };

    const usePushNotification = await importHookWithVapid("AAAA");
    renderHook(() => usePushNotification());

    await waitFor(() => {});
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("tidak setup push saat browser tidak punya PushManager", async () => {
    const registerMock = vi.fn();
    defineNavigatorServiceWorker({ register: registerMock, ready: Promise.resolve() });
    // window.PushManager TIDAK distub di sini.
    authState.user = { email: "admin@deera.id" };

    const usePushNotification = await importHookWithVapid("AAAA");
    renderHook(() => usePushNotification());

    await waitFor(() => {});
    expect(registerMock).not.toHaveBeenCalled();
  });

  it("subscription sudah ada -> langsung upsert ke supabase tanpa minta izin notifikasi", async () => {
    const existingSubscription = {
      toJSON: () => ({
        endpoint: "https://fcm.example/abc",
        keys: { p256dh: "P256DH", auth: "AUTHSECRET" },
      }),
    };
    const subscribeMock = vi.fn();
    const registrationMock = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(existingSubscription),
        subscribe: subscribeMock,
      },
    };
    const registerMock = vi.fn().mockResolvedValue(registrationMock);
    defineNavigatorServiceWorker({ register: registerMock, ready: Promise.resolve() });
    vi.stubGlobal("PushManager", function PushManager() {});
    const requestPermissionMock = vi.fn();
    vi.stubGlobal("Notification", { requestPermission: requestPermissionMock });
    authState.user = { email: "admin@deera.id" };

    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);

    const usePushNotification = await importHookWithVapid("AAAA");
    renderHook(() => usePushNotification());

    await waitFor(() => {
      expect(upsertBuilder.upsert).toHaveBeenCalled();
    });

    expect(registerMock).toHaveBeenCalledWith("/sw.js");
    expect(requestPermissionMock).not.toHaveBeenCalled();
    expect(subscribeMock).not.toHaveBeenCalled();
    expect(supabaseMock.from).toHaveBeenCalledWith("push_subscriptions");
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "https://fcm.example/abc",
        p256dh: "P256DH",
        auth: "AUTHSECRET",
        user_email: "admin@deera.id",
      }),
      { onConflict: "endpoint" },
    );
  });

  it("subscription belum ada & izin diberikan -> subscribe baru, fallback p256dh/auth kosong saat keys tidak ada", async () => {
    const newSubscription = {
      toJSON: () => ({ endpoint: "https://fcm.example/new" }), // tanpa `keys`
    };
    const subscribeMock = vi.fn().mockResolvedValue(newSubscription);
    const registrationMock = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: subscribeMock,
      },
    };
    const registerMock = vi.fn().mockResolvedValue(registrationMock);
    defineNavigatorServiceWorker({ register: registerMock, ready: Promise.resolve() });
    vi.stubGlobal("PushManager", function PushManager() {});
    const requestPermissionMock = vi.fn().mockResolvedValue("granted");
    vi.stubGlobal("Notification", { requestPermission: requestPermissionMock });
    authState.user = { email: "kasir@deera.id" };

    const upsertBuilder = makeBuilder({ data: null, error: null });
    supabaseMock.from.mockReturnValue(upsertBuilder);

    const usePushNotification = await importHookWithVapid("AAAA");
    renderHook(() => usePushNotification());

    await waitFor(() => {
      expect(upsertBuilder.upsert).toHaveBeenCalled();
    });

    expect(requestPermissionMock).toHaveBeenCalled();
    expect(subscribeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userVisibleOnly: true,
        applicationServerKey: expect.any(Uint8Array),
      }),
    );
    expect(upsertBuilder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://fcm.example/new", p256dh: "", auth: "" }),
      { onConflict: "endpoint" },
    );
  });

  it("izin notifikasi ditolak -> tidak subscribe & tidak upsert", async () => {
    const subscribeMock = vi.fn();
    const registrationMock = {
      pushManager: {
        getSubscription: vi.fn().mockResolvedValue(null),
        subscribe: subscribeMock,
      },
    };
    const registerMock = vi.fn().mockResolvedValue(registrationMock);
    defineNavigatorServiceWorker({ register: registerMock, ready: Promise.resolve() });
    vi.stubGlobal("PushManager", function PushManager() {});
    const requestPermissionMock = vi.fn().mockResolvedValue("denied");
    vi.stubGlobal("Notification", { requestPermission: requestPermissionMock });
    authState.user = { email: "admin@deera.id" };

    const usePushNotification = await importHookWithVapid("AAAA");
    renderHook(() => usePushNotification());

    await waitFor(() => {
      expect(requestPermissionMock).toHaveBeenCalled();
    });

    expect(subscribeMock).not.toHaveBeenCalled();
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it("error saat setup (register gagal) -> ditangkap diam-diam, tidak melempar & tidak upsert", async () => {
    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const registerMock = vi.fn().mockRejectedValue(new Error("register gagal"));
    defineNavigatorServiceWorker({ register: registerMock, ready: Promise.resolve() });
    vi.stubGlobal("PushManager", function PushManager() {});
    authState.user = { email: "admin@deera.id" };

    const usePushNotification = await importHookWithVapid("AAAA");
    expect(() => renderHook(() => usePushNotification())).not.toThrow();

    await waitFor(() => {
      expect(consoleWarnSpy).toHaveBeenCalled();
    });
    expect(supabaseMock.from).not.toHaveBeenCalled();
    consoleWarnSpy.mockRestore();
  });
});
