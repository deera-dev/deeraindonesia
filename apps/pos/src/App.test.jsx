import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// Mock all heavy deps
vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: vi.fn(() => ({ user: { email: "admin@deera.id" }, loading: false })),
  signOut: vi.fn(),
  displayName: vi.fn(() => "Admin"),
}));
vi.mock("@deera/shared/features/theme/hooks", () => ({
  useTheme: vi.fn(() => ({ toggleTheme: vi.fn(), isDark: false })),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  getMarketLocation: vi.fn(() => "gudang"),
}));
vi.mock("./lib/sync", () => ({
  flushPendingSales: vi.fn().mockResolvedValue({ errors: 0 }),
  syncProducts: vi.fn().mockResolvedValue(undefined),
  syncStok: vi.fn().mockResolvedValue(undefined),
  syncPelanggan: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("./shared/hooks/usePasarNotification", () => ({
  usePasarNotification: vi.fn(),
}));
vi.mock("./shared/hooks/usePushSubscription", () => ({
  usePushSubscription: vi.fn(),
}));
vi.mock("./shared/components/AppHeader", () => ({
  default: ({ user, isOnline, onSync, location }) => (
    <div data-testid="app-header">
      {isOnline ? "Online" : "Offline"} | {location}
    </div>
  ),
}));
vi.mock("./shared/components/LoginScreen", () => ({
  default: () => <div data-testid="login-screen">Login</div>,
}));
vi.mock("./shared/components/SyncErrorModal", () => ({
  default: ({ onClose, onRetry }) => (
    <div data-testid="sync-error-modal">
      <button onClick={onClose}>Tutup</button>
      <button onClick={onRetry}>Retry</button>
    </div>
  ),
}));
vi.mock("./shared/components/PosBottomNav", () => ({
  default: () => <nav data-testid="bottom-nav" />,
}));
vi.mock("./shared/components/NotificationGate", () => ({
  default: ({ children }) => <div data-testid="notif-gate">{children}</div>,
}));
vi.mock("@deera/shared/components/ToastContainer", () => ({
  default: () => <div data-testid="toast" />,
}));
vi.mock("./features/kasir", () => ({
  KasirPage: ({ location }) => <div data-testid="kasir-page">{location}</div>,
}));
vi.mock("./features/laporan", () => ({
  LaporanPage: () => <div data-testid="laporan-page" />,
}));
vi.mock("./features/pelanggan", () => ({
  PelangganPage: () => <div data-testid="pelanggan-page" />,
}));
vi.mock("./features/riwayat", () => ({
  RiwayatPage: () => <div data-testid="riwayat-page" />,
}));

import { useAuth } from "@deera/shared/features/auth/hooks";
import App from "./App";

function renderApp(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: { email: "admin@deera.id" }, loading: false });
  window.history.pushState({}, "", "/");
});

describe("App", () => {
  it("shows loading when authLoading=true", () => {
    useAuth.mockReturnValue({ user: null, loading: true });
    renderApp();
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows LoginScreen when user is null", () => {
    useAuth.mockReturnValue({ user: null, loading: false });
    renderApp();
    expect(screen.getByTestId("login-screen")).toBeInTheDocument();
  });

  it("renders AppHeader when user is logged in", () => {
    renderApp();
    expect(screen.getByTestId("app-header")).toBeInTheDocument();
  });

  it("renders KasirPage at /", () => {
    renderApp("/");
    expect(screen.getByTestId("kasir-page")).toBeInTheDocument();
  });

  it("renders LaporanPage at /laporan", () => {
    renderApp("/laporan");
    expect(screen.getByTestId("laporan-page")).toBeInTheDocument();
  });

  it("renders PelangganPage at /pelanggan", () => {
    renderApp("/pelanggan");
    expect(screen.getByTestId("pelanggan-page")).toBeInTheDocument();
  });

  it("renders RiwayatPage at /riwayat", () => {
    renderApp("/riwayat");
    expect(screen.getByTestId("riwayat-page")).toBeInTheDocument();
  });

  it("redirects unknown route to /", () => {
    renderApp("/unknown");
    expect(screen.getByTestId("kasir-page")).toBeInTheDocument();
  });

  it("renders PosBottomNav", () => {
    renderApp();
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
  });

  it("renders NotificationGate", () => {
    renderApp();
    expect(screen.getByTestId("notif-gate")).toBeInTheDocument();
  });

  it("calls sync functions on user login", async () => {
    const { syncProducts, syncStok } = await import("./lib/sync");
    renderApp();
    await waitFor(() => expect(syncProducts).toHaveBeenCalled());
    expect(syncStok).toHaveBeenCalled();
  });
});
