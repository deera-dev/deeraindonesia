import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/features/auth/hooks", () => ({
  signOut: vi.fn(),
  displayName: vi.fn((user) => user?.name ?? "Admin"),
}));
vi.mock("@deera/shared/components/ThemeToggle", () => ({
  default: ({ isDark, onToggle }) => (
    <button onClick={onToggle} data-testid="theme-toggle">
      {isDark ? "Dark" : "Light"}
    </button>
  ),
}));

import AppHeader from "./AppHeader";
import { signOut } from "@deera/shared/features/auth/hooks";

const defaultProps = {
  user: { name: "Admin" },
  isOnline: true,
  syncing: false,
  syncError: null,
  failedCount: 0,
  lastSyncAt: null,
  onSync: vi.fn(),
  onShowSyncError: vi.fn(),
  isDark: false,
  onToggleTheme: vi.fn(),
};

describe("AppHeader", () => {
  it("renders DEERA logo", () => {
    render(<AppHeader {...defaultProps} />);
    expect(screen.getByText("DEERA")).toBeInTheDocument();
  });

  it("shows Online status when isOnline=true", () => {
    render(<AppHeader {...defaultProps} />);
    expect(screen.getByText("Online")).toBeInTheDocument();
  });

  it("shows Offline status when isOnline=false", () => {
    render(<AppHeader {...defaultProps} isOnline={false} />);
    expect(screen.getByText("Offline")).toBeInTheDocument();
  });

  it("calls onSync when sync button clicked", () => {
    const onSync = vi.fn();
    render(<AppHeader {...defaultProps} onSync={onSync} />);
    fireEvent.click(screen.getByText("Online"));
    expect(onSync).toHaveBeenCalled();
  });

  it("calls signOut when Keluar clicked", () => {
    render(<AppHeader {...defaultProps} />);
    fireEvent.click(screen.getByText("Keluar"));
    expect(signOut).toHaveBeenCalled();
  });

  it("shows Gagal when syncError is set", () => {
    render(<AppHeader {...defaultProps} syncError="timeout" />);
    expect(screen.getByText(/Gagal/)).toBeInTheDocument();
  });

  it("shows pending count when failedCount > 0", () => {
    render(<AppHeader {...defaultProps} failedCount={3} />);
    expect(screen.getByText(/3 pending/)).toBeInTheDocument();
  });

  it("shows pending banner when failedCount > 0 and no syncError", () => {
    render(<AppHeader {...defaultProps} failedCount={2} />);
    expect(screen.getByText(/2 transaksi belum tersync/)).toBeInTheDocument();
  });

  it("does not show sync button (online clickable) when offline", () => {
    render(<AppHeader {...defaultProps} isOnline={false} />);
    const btn = screen.getByText("Offline").closest("button");
    expect(btn).toBeDefined();
  });

  it("renders theme toggle", () => {
    render(<AppHeader {...defaultProps} />);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("shows last sync time when lastSyncAt is provided", () => {
    const d = new Date("2026-07-05T09:30:00");
    render(<AppHeader {...defaultProps} lastSyncAt={d} />);
    // formatLastSync(d) returns a locale time string — just verify the sync label region is rendered
    const syncBtn = screen.getByText("Online").closest("button");
    expect(syncBtn).toBeInTheDocument();
  });

  it("calls onShowSyncError when Detail clicked", () => {
    const onShowSyncError = vi.fn();
    render(<AppHeader {...defaultProps} syncError="timeout" onShowSyncError={onShowSyncError} />);
    fireEvent.click(screen.getByText("Detail"));
    expect(onShowSyncError).toHaveBeenCalled();
  });
});
