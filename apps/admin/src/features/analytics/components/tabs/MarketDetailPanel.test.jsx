import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Sama seperti TrendChart.test.jsx — ResponsiveContainer perlu di-mock
// supaya chart benar-benar render (bukan 0x0) di jsdom.
vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children, width = 600, height = 300 }) => (
      <div style={{ width, height }}>{React.cloneElement(children, { width, height })}</div>
    ),
  };
});

vi.mock("../../hooks", () => ({
  useAnalyticsMarketDetail: vi.fn(),
}));

import MarketDetailPanel from "./MarketDetailPanel";
import { useAnalyticsMarketDetail } from "../../hooks";

const BASE = {
  revenue: 3000000,
  profit: 700000,
  qty: 15,
  customer: 5,
  produkTerlaris: [{ kode: "D-01-OSK", value: 10 }],
  trend: {
    granularity: "day",
    buckets: [
      { periode: "2024-01-01", revenue: 100000, profit: 20000, qty: 2 },
      { periode: "2024-01-02", revenue: 200000, profit: 40000, qty: 4 },
    ],
    topProductTrend: [],
    marketTrend: [],
  },
  loading: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsMarketDetail.mockReturnValue(BASE);
});

describe("MarketDetailPanel", () => {
  it("memanggil useAnalyticsMarketDetail dengan market yang diberikan lewat prop", () => {
    render(<MarketDetailPanel market="cideng" />);
    expect(useAnalyticsMarketDetail).toHaveBeenCalledWith("cideng");
  });

  it("shows skeleton loading state (Phase 5)", () => {
    useAnalyticsMarketDetail.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<MarketDetailPanel market="cideng" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows ErrorState with retry when error present (Phase 5)", () => {
    const refetch = vi.fn();
    useAnalyticsMarketDetail.mockReturnValue({ ...BASE, error: new Error("gagal"), refetch });
    render(<MarketDetailPanel market="cideng" />);
    expect(screen.getByText("Gagal memuat detail cabang.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders statistik kecil (Penjualan/Keuntungan/Jumlah Terjual/Jumlah Pelanggan)", () => {
    render(<MarketDetailPanel market="cideng" />);
    expect(screen.getByText("Rp 3,0 jt")).toBeInTheDocument();
    expect(screen.getByText("Rp 700.000")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders Produk Terlaris via Leaderboard (reused component)", () => {
    render(<MarketDetailPanel market="cideng" />);
    expect(screen.getByText("Produk Terlaris")).toBeInTheDocument();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("10 pcs")).toBeInTheDocument();
  });

  it("renders Tren Penjualan heading + chart (via TrendChart Recharts)", () => {
    const { container } = render(<MarketDetailPanel market="cideng" />);
    expect(screen.getByText("Tren Penjualan")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(1);
  });

  it("shows empty message when produkTerlaris kosong", () => {
    useAnalyticsMarketDetail.mockReturnValue({ ...BASE, produkTerlaris: [] });
    render(<MarketDetailPanel market="cideng" />);
    expect(screen.getByText(/Belum ada penjualan di cabang ini/)).toBeInTheDocument();
  });

  it("no ellipsis/truncate/overflow-hidden anywhere in rendered output", () => {
    const { container } = render(<MarketDetailPanel market="cideng" />);
    const offenders = Array.from(container.querySelectorAll("*")).filter((el) =>
      ["truncate", "whitespace-nowrap", "overflow-hidden"].some((cls) => el.className?.toString().includes(cls)),
    );
    expect(offenders).toHaveLength(0);
  });
});
