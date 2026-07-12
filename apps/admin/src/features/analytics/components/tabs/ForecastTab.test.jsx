import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// Sama seperti TrendsTab.test.jsx / TrendChart.test.jsx — ResponsiveContainer
// perlu di-mock supaya chart benar-benar render (bukan 0x0) di jsdom.
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
  useAnalyticsForecast: vi.fn(),
}));

import ForecastTab from "./ForecastTab";
import { useAnalyticsForecast } from "../../hooks";

const BASE = {
  meta: { granularity: "week", historyBucketCount: 8, alpha: 0.3, lookbackPeriods: 8, nextPeriodeLabel: "2024-04-01" },
  revenueForecast: {
    history: [{ periode: "2024-03-25", value: 3000000 }],
    ma: 2800000,
    wma: 2900000,
    es: 2950000,
  },
  profitForecast: {
    history: [{ periode: "2024-03-25", value: 700000 }],
    ma: 650000,
    wma: 670000,
    es: 680000,
  },
  salesForecast: {
    history: [{ periode: "2024-03-25", value: 15 }],
    ma: 14,
    wma: 14.5,
    es: 14.8,
  },
  customerForecast: {
    history: [],
    ma: null,
    wma: null,
    es: null,
  },
  productDemandForecast: [
    { kode: "D-01-OSK", nama: "Gamis A", history: [{ periode: "2024-03-25", value: 10 }], ma: 9, wma: 9.5, es: 9.8 },
    { kode: "D-05-XYZ", nama: "Gamis E", history: [], ma: null, wma: null, es: null },
  ],
  restockForecast: [
    { kode: "D-01-OSK", forecastedDemandNextPeriod: 10, currentStock: 5, suggestedOrderQty: 15 },
  ],
  loading: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsForecast.mockReturnValue(BASE);
});

describe("ForecastTab", () => {
  it("shows skeleton loading state", () => {
    useAnalyticsForecast.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<ForecastTab />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows ErrorState with retry when error present", () => {
    const refetch = vi.fn();
    useAnalyticsForecast.mockReturnValue({ ...BASE, error: new Error("gagal"), refetch });
    render(<ForecastTab />);
    expect(screen.getByText("Gagal memuat Prediksi Penjualan.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("does NOT show raw technical meta (alpha/lookback) by default — hidden inside collapsed Detail Teknis", () => {
    const { container } = render(<ForecastTab />);
    const details = Array.from(container.querySelectorAll("details")).find((d) =>
      d.textContent.includes("Detail Teknis"),
    );
    expect(details).toBeTruthy();
    expect(details.open).toBe(false);
    expect(details.textContent).toMatch(/alpha \(Exponential Smoothing\) 0.3/);
    expect(details.textContent).toMatch(/lookback \(Moving Average\) 8 periode/);
  });

  it("has a plain-language description instead of jargon by default", () => {
    render(<ForecastTab />);
    expect(screen.getByText(/Perkiraan penjualan ke depan berdasarkan histori transaksi/)).toBeInTheDocument();
  });

  it("renders Prediksi Penjualan (Rupiah) dan Prediksi Keuntungan terbuka langsung (tidak collapsed)", () => {
    render(<ForecastTab />);
    expect(screen.getByRole("heading", { name: "Prediksi Penjualan (Rupiah)" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Prediksi Keuntungan" })).toBeInTheDocument();
  });

  it("Prediksi Jumlah Terjual & Pelanggan dan Prediksi Permintaan per Produk collapsed by default", () => {
    const { container } = render(<ForecastTab />);
    const detailsEls = container.querySelectorAll("details");
    // 1 = Detail Teknis, 1 = Jumlah Terjual & Pelanggan, 1 = Permintaan per Produk
    expect(detailsEls.length).toBe(3);
    detailsEls.forEach((d) => expect(d.open).toBe(false));
    expect(screen.getByText("Prediksi Jumlah Terjual & Pelanggan")).toBeInTheDocument();
    expect(screen.getByText("Prediksi Permintaan per Produk")).toBeInTheDocument();
  });

  it("renders 3 kartu perkiraan (Perkiraan Stabil/Menyesuaikan/Tren Terbaru) untuk tiap-tiap 4 section forecast", () => {
    render(<ForecastTab />);
    expect(screen.getAllByText("Perkiraan Stabil").length).toBe(4);
    expect(screen.getAllByText("Perkiraan Menyesuaikan").length).toBe(4);
    expect(screen.getAllByText("Perkiraan Tren Terbaru").length).toBe(4);
  });

  it("customerForecast dengan ma/wma/es null -> menampilkan 'Data belum cukup' (BUKAN 0)", () => {
    render(<ForecastTab />);
    expect(screen.getAllByText("Data belum cukup").length).toBeGreaterThanOrEqual(3);
  });

  it("renders Prediksi Permintaan per Produk — produk dengan forecast valid tampil di BarList", () => {
    render(<ForecastTab />);
    expect(screen.getByText("Prediksi Permintaan per Produk")).toBeInTheDocument();
    expect(screen.getByText("D-01-OSK — Gamis A")).toBeInTheDocument();
  });

  it("produk tanpa histori cukup (es null) dipisah, TIDAK dirender sebagai batang 0", () => {
    render(<ForecastTab />);
    expect(screen.queryByText("D-05-XYZ — Gamis E")).not.toBeInTheDocument();
    expect(screen.getByText(/Data belum cukup untuk: D-05-XYZ/)).toBeInTheDocument();
  });

  it("renders Saran Restock Berdasarkan Prediksi dengan label kode + permintaan/stok + suggestedOrderQty", () => {
    render(<ForecastTab />);
    expect(screen.getByText("Saran Restock Berdasarkan Prediksi")).toBeInTheDocument();
    expect(screen.getByText(/D-01-OSK — permintaan 10 pcs · stok 5 pcs/)).toBeInTheDocument();
    expect(screen.getByText("15 pcs disarankan")).toBeInTheDocument();
  });

  it("no ellipsis/truncate/overflow-hidden anywhere in rendered output", () => {
    const { container } = render(<ForecastTab />);
    const offenders = Array.from(container.querySelectorAll("*")).filter((el) =>
      ["truncate", "whitespace-nowrap", "overflow-hidden"].some((cls) => el.className?.toString().includes(cls)),
    );
    expect(offenders).toHaveLength(0);
  });
});
