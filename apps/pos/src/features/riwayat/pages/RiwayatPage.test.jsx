import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../hooks", () => ({
  useRiwayat: vi.fn(() => ({
    items: [],
    loading: false,
    error: null,
    reload: vi.fn(),
  })),
}));
vi.mock("../components/RiwayatCard", () => ({
  default: ({ item }) => <div data-testid="riwayat-card">{item.nama || item.buyer_name}</div>,
}));
vi.mock("../utils", () => ({
  DATE_PRESETS: [
    { value: "today", label: "Hari Ini" },
    { value: "week", label: "7 Hari" },
    { value: "month", label: "30 Hari" },
    { value: "all", label: "Semua" },
  ],
  CATEGORY_FILTERS: [
    { value: "semua", label: "Semua" },
    { value: "transaksi", label: "Transaksi" },
    { value: "produk", label: "Produk" },
  ],
  groupByDate: vi.fn((items) =>
    items.length > 0
      ? [{ key: "2026-07-04", label: "Hari Ini", items }]
      : []
  ),
}));

import { useRiwayat } from "../hooks";
import RiwayatPage from "../pages/RiwayatPage";

beforeEach(() => {
  vi.clearAllMocks();
  useRiwayat.mockReturnValue({ items: [], loading: false, error: null, reload: vi.fn() });
});

describe("RiwayatPage", () => {
  it("renders date preset buttons", () => {
    render(<RiwayatPage />);
    expect(screen.getByText("Hari Ini")).toBeInTheDocument();
    expect(screen.getByText("7 Hari")).toBeInTheDocument();
  });

  it("renders category filter buttons", () => {
    render(<RiwayatPage />);
    // "Semua" appears in both DATE_PRESETS ("all") and CATEGORY_FILTERS ("semua")
    expect(screen.getAllByText("Semua").length).toBeGreaterThan(0);
    expect(screen.getByText("Transaksi")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useRiwayat.mockReturnValue({ items: [], loading: true, error: null, reload: vi.fn() });
    render(<RiwayatPage />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    render(<RiwayatPage />);
    expect(screen.getByText("Belum ada aktivitas")).toBeInTheDocument();
  });

  it("shows error message with retry button", () => {
    const reload = vi.fn();
    useRiwayat.mockReturnValue({ items: [], loading: false, error: "Gagal memuat", reload });
    render(<RiwayatPage />);
    expect(screen.getByText("Gagal memuat")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba lagi"));
    expect(reload).toHaveBeenCalled();
  });

  it("renders RiwayatCard items when items present", () => {
    useRiwayat.mockReturnValue({
      items: [{ _id: "h1", _type: "history", nama: "Gamis A", changed_at: "2026-07-04T10:00:00Z" }],
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<RiwayatPage />);
    expect(screen.getByTestId("riwayat-card")).toBeInTheDocument();
  });

  it("shows group date header", () => {
    useRiwayat.mockReturnValue({
      items: [{ _id: "h1", _type: "history", nama: "Gamis A", changed_at: "2026-07-04T10:00:00Z" }],
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<RiwayatPage />);
    // "Hari Ini" appears as a date preset button AND as the group header label
    expect(screen.getAllByText("Hari Ini").length).toBeGreaterThanOrEqual(2);
  });

  it("calls useRiwayat with default preset=week", () => {
    render(<RiwayatPage />);
    expect(useRiwayat).toHaveBeenCalledWith(expect.objectContaining({ preset: "week" }));
  });

  it("changes preset when preset button clicked", () => {
    render(<RiwayatPage />);
    fireEvent.click(screen.getByText("Hari Ini"));
    expect(useRiwayat).toHaveBeenCalledWith(expect.objectContaining({ preset: "today" }));
  });

  it("changes category when category filter clicked", () => {
    render(<RiwayatPage />);
    fireEvent.click(screen.getByText("Transaksi"));
    expect(useRiwayat).toHaveBeenCalledWith(expect.objectContaining({ category: "transaksi" }));
  });
});
