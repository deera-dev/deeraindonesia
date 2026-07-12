import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Sama seperti TrendChart.test.jsx — ResponsiveContainer perlu di-mock
// supaya chart benar-benar render (bukan 0x0) di jsdom. Lihat komentar
// lengkap di shared/TrendChart.test.jsx.
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
  useAnalyticsFilter: vi.fn(),
  useAnalyticsTrend: vi.fn(),
}));

import TrendsTab from "./TrendsTab";
import { useAnalyticsFilter, useAnalyticsTrend } from "../../hooks";

const setGranularity = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsFilter.mockReturnValue({ granularity: "day", setGranularity });
  useAnalyticsTrend.mockReturnValue({
    buckets: [
      { periode: "2024-01-01", revenue: 100000, profit: 20000, qty: 2 },
      { periode: "2024-01-02", revenue: 200000, profit: 40000, qty: 4 },
    ],
    loading: false,
  });
});

describe("TrendsTab", () => {
  it("renders granularity switcher with 4 options", () => {
    render(<TrendsTab />);
    expect(screen.getByText("Harian")).toBeInTheDocument();
    expect(screen.getByText("Mingguan")).toBeInTheDocument();
    expect(screen.getByText("Bulanan")).toBeInTheDocument();
    expect(screen.getByText("Tahunan")).toBeInTheDocument();
  });

  it("clicking a granularity option calls setGranularity", () => {
    render(<TrendsTab />);
    fireEvent.click(screen.getByText("Bulanan"));
    expect(setGranularity).toHaveBeenCalledWith("month");
  });

  it("shows skeleton loading state (Phase 5)", () => {
    useAnalyticsTrend.mockReturnValue({ buckets: [], loading: true });
    const { container } = render(<TrendsTab />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows ErrorState with retry when error present (Phase 5)", () => {
    const refetch = vi.fn();
    useAnalyticsTrend.mockReturnValue({ buckets: [], loading: false, error: new Error("gagal"), refetch });
    render(<TrendsTab />);
    expect(screen.getByText("Gagal memuat Tren Penjualan.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("granularity buttons expose aria-pressed reflecting active state (Phase 5)", () => {
    render(<TrendsTab />);
    expect(screen.getByText("Harian")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("Mingguan")).toHaveAttribute("aria-pressed", "false");
  });

  it("renders SATU section gabungan (bukan 3 section terpisah lagi) dengan judul Indonesia", () => {
    render(<TrendsTab />);
    expect(screen.getByText("Penjualan · Keuntungan · Jumlah Terjual")).toBeInTheDocument();
    expect(screen.queryByText("Revenue · Profit · Qty Trend")).not.toBeInTheDocument();
    expect(screen.queryByText("Revenue Trend")).not.toBeInTheDocument();
    expect(screen.queryByText("Profit Trend")).not.toBeInTheDocument();
    expect(screen.queryByText("Qty Trend")).not.toBeInTheDocument();
  });

  it("renders ketiga series (Penjualan/Keuntungan/Jumlah Terjual) dalam satu chart via legend", () => {
    render(<TrendsTab />);
    expect(screen.getByText("Penjualan")).toBeInTheDocument();
    expect(screen.getByText("Keuntungan")).toBeInTheDocument();
    expect(screen.getByText("Jumlah Terjual")).toBeInTheDocument();
  });

  it("has a section description", () => {
    render(<TrendsTab />);
    expect(screen.getByText(/Grafik naik-turun penjualan dari waktu ke waktu/)).toBeInTheDocument();
  });

  it("active granularity button has highlighted style", () => {
    useAnalyticsFilter.mockReturnValue({ granularity: "week", setGranularity });
    render(<TrendsTab />);
    expect(screen.getByText("Mingguan").className).toContain("bg-[#CAB170]");
  });

  it("shows hint text soal klik legend untuk toggle series", () => {
    render(<TrendsTab />);
    expect(screen.getByText(/Klik label pada legend/)).toBeInTheDocument();
  });
});
