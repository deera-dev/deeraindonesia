import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../hooks", () => ({
  useAnalyticsAdvanced: vi.fn(),
}));

import AdvancedTab from "./AdvancedTab";
import { useAnalyticsAdvanced } from "../../hooks";

const BASE = {
  kpi: { returnRate: 0.05, returnRevenueImpact: 150000, overallMarginPct: 0.32, avgBasketSize: 2.4, avgItemPerTransaksi: 1.8 },
  growth: {
    topGrowth: [{ kode: "D-01-OSK", currentRevenue: 3000000, previousRevenue: 1000000, growthPct: 200 }],
    topDeclining: [{ kode: "D-02-SFN", currentRevenue: 200000, previousRevenue: 1000000, growthPct: -80 }],
  },
  contribution: {
    revenueByProduct: [{ kode: "D-01-OSK", value: 3000000, pct: 40.5 }],
    profitByProduct: [{ kode: "D-01-OSK", value: 700000, pct: 38.2 }],
  },
  productMix: [{ bahan: "OSK", value: 3000000, pct: 40.5 }],
  pareto: {
    items: [{ kode: "D-01-OSK", value: 3000000, cumulativePct: 40.5 }],
    productsFor80Pct: 5,
    totalProducts: 12,
  },
  newVsReturning: {
    newRevenue: 1000000,
    returningRevenue: 2000000,
    anonymousRevenue: 300000,
    newCustomerCount: 3,
    returningCustomerCount: 7,
  },
  weekdayPerformance: [
    { dow: 1, label: "Senin", revenue: 500000, profit: 100000, qty: 5, transaksi: 3 },
    { dow: 2, label: "Selasa", revenue: 200000, profit: 40000, qty: 2, transaksi: 1 },
  ],
  hourlyPerformance: [{ hour: 9, revenue: 200000, profit: 40000, qty: 2, transaksi: 1 }],
  periodComparison: {
    mom: { currentRevenue: 5000000, previousRevenue: 4000000, pctChange: 25 },
    yoy: null,
    wow: { currentRevenue: 1200000, previousRevenue: 1000000, pctChange: 20 },
  },
  // Phase 6 Extension (additive)
  abcClassification: {
    thresholds: { aMaxCumulativePct: 80, bMaxCumulativePct: 95 },
    a: { count: 3, revenuePct: 78.5 },
    b: { count: 5, revenuePct: 15.2 },
    c: { count: 10, revenuePct: 6.3 },
  },
  revenueConcentration: { top5Pct: 62.1, top10Pct: 81.4 },
  customerConcentration: { top5Pct: 40.2, top5CustomerCount: 5, totalIdentifiedCustomers: 30 },
  marketConcentration: [
    { location: "gudang", value: 3000000, pct: 55.5 },
    { location: "cideng", value: 2000000, pct: 44.5 },
  ],
  marginRisk: {
    lowMarginThresholdPct: 10,
    negativeMarginProducts: [{ kode: "D-09-XYZ", revenue: 200000, marginPct: -5.2 }],
    lowMarginProducts: [{ kode: "D-10-ABC", revenue: 300000, marginPct: 4.1 }],
  },
  salesDistribution: {
    weekday: { revenue: 4000000, profit: 800000, qty: 40, transaksi: 20 },
    weekend: { revenue: 1000000, profit: 200000, qty: 10, transaksi: 5 },
  },
  loading: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsAdvanced.mockReturnValue(BASE);
});

describe("AdvancedTab", () => {
  it("shows skeleton loading state", () => {
    useAnalyticsAdvanced.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<AdvancedTab />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows ErrorState with retry when error present", () => {
    const refetch = vi.fn();
    useAnalyticsAdvanced.mockReturnValue({ ...BASE, error: new Error("gagal"), refetch });
    render(<AdvancedTab />);
    expect(screen.getByText("Gagal memuat Analisis Lanjutan.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders 4 Angka Penting cards with simplified Indonesian labels (dulu 'KPI Lanjutan')", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Angka Penting")).toBeInTheDocument();
    expect(screen.getByText("Tingkat Retur")).toBeInTheDocument();
    expect(screen.getByText("Persentase Keuntungan Keseluruhan")).toBeInTheDocument();
    expect(screen.getByText("Rata-rata Barang per Transaksi")).toBeInTheDocument();
    expect(screen.getByText("Rata-rata Jenis Produk per Transaksi")).toBeInTheDocument();
  });

  it("Angka Penting is the only section NOT collapsed; the other 7 groups are <details>", () => {
    const { container } = render(<AdvancedTab />);
    const detailsEls = container.querySelectorAll("details");
    expect(detailsEls.length).toBe(7);
    detailsEls.forEach((d) => expect(d.open).toBe(false));
  });

  it("renders MoM dengan pctChange bertanda + dan sub Rp sebelum -> sesudah (label Bulan ke Bulan)", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Bulan ke Bulan")).toBeInTheDocument();
    expect(screen.getByText("+25%")).toBeInTheDocument();
  });

  it("renders YoY sebagai 'Data belum cukup' saat null (keterbatasan data, BUKAN 0) — label Tahun ke Tahun", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Tahun ke Tahun")).toBeInTheDocument();
    expect(screen.getByText("Data belum cukup")).toBeInTheDocument();
  });

  it("renders Week over Week sebagai 'Minggu ke Minggu' alongside MoM/YoY", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Minggu ke Minggu")).toBeInTheDocument();
    expect(screen.getByText("+20%")).toBeInTheDocument();
  });

  it("renders Produk Naik & Turun sections dengan kode + pct bertanda", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Produk Naik & Turun")).toBeInTheDocument();
    expect(screen.getByText("Produk Meningkat")).toBeInTheDocument();
    expect(screen.getByText("Produk Menurun")).toBeInTheDocument();
    expect(screen.getByText("+200%")).toBeInTheDocument();
    expect(screen.getByText("-80%")).toBeInTheDocument();
  });

  it("renders Kontribusi Penjualan group (Contribution/Product Mix/Pareto/ABC)", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Kontribusi Penjualan", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText("Top 10 Penyumbang Penjualan")).toBeInTheDocument();
    expect(screen.getByText("Top 10 Penyumbang Keuntungan")).toBeInTheDocument();
    expect(screen.getByText("Penjualan per Jenis Bahan")).toBeInTheDocument();
    expect(screen.getByText("OSK")).toBeInTheDocument();
  });

  it("renders Produk Paling Berpengaruh (dulu Pareto) dengan ringkasan N dari M produk", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Produk Paling Berpengaruh")).toBeInTheDocument();
    expect(screen.getByText(/5 dari 12 produk menyumbang 80%/)).toBeInTheDocument();
  });

  it("renders Kelompok Produk Penting (dulu ABC Classification) dengan count + revenuePct per kelompok", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Kelompok Produk Penting")).toBeInTheDocument();
    expect(screen.getByText("Kelompok A")).toBeInTheDocument();
    expect(screen.getByText("Kelompok B")).toBeInTheDocument();
    expect(screen.getByText("Kelompok C")).toBeInTheDocument();
    expect(screen.getByText("78.5% penjualan")).toBeInTheDocument();
  });

  it("renders Penyumbang Penjualan Terbesar group (Revenue/Customer/Market Concentration)", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Penyumbang Penjualan Terbesar", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText("62.1%")).toBeInTheDocument();
    expect(screen.getByText("81.4%")).toBeInTheDocument();
    expect(screen.getByText("Pelanggan Paling Berkontribusi")).toBeInTheDocument();
    expect(screen.getByText("40.2%")).toBeInTheDocument();
  });

  it("renders Cabang Penyumbang Penjualan Terbesar (dulu Market Concentration) leaderboard per cabang", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Cabang Penyumbang Penjualan Terbesar")).toBeInTheDocument();
    expect(screen.getByText("gudang")).toBeInTheDocument();
    expect(screen.getByText("55.5%")).toBeInTheDocument();
  });

  it("renders Pelanggan Baru vs Lama KPI cards + catatan transaksi tanpa nama", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Pelanggan Baru vs Lama")).toBeInTheDocument();
    expect(screen.getByText("Penjualan dari Pelanggan Baru")).toBeInTheDocument();
    expect(screen.getByText("Penjualan dari Pelanggan Lama")).toBeInTheDocument();
    expect(screen.getByText(/transaksi tanpa nama pembeli tidak termasuk/)).toBeInTheDocument();
  });

  it("HIDES catatan transaksi tanpa nama saat anonymousRevenue = 0", () => {
    useAnalyticsAdvanced.mockReturnValue({
      ...BASE,
      newVsReturning: { ...BASE.newVsReturning, anonymousRevenue: 0 },
    });
    render(<AdvancedTab />);
    expect(screen.queryByText(/transaksi tanpa nama pembeli tidak termasuk/)).not.toBeInTheDocument();
  });

  it("renders Waktu Penjualan group (per Hari/per Jam/Hari Kerja vs Akhir Pekan)", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Waktu Penjualan")).toBeInTheDocument();
    expect(screen.getByText("Performa per Hari")).toBeInTheDocument();
    expect(screen.getByText("Performa per Jam (WIB)")).toBeInTheDocument();
    expect(screen.getByText("Senin")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument();
    expect(screen.getByText("Hari Kerja (Sen-Jum)")).toBeInTheDocument();
    expect(screen.getByText("Akhir Pekan (Sab-Min)")).toBeInTheDocument();
  });

  it("renders Risiko Keuntungan (dulu Margin Risk) dengan format persen", () => {
    render(<AdvancedTab />);
    expect(screen.getByText("Risiko Keuntungan")).toBeInTheDocument();
    expect(screen.getByText("Rugi (Persentase Keuntungan Negatif)")).toBeInTheDocument();
    expect(screen.getByText("Persentase Keuntungan Rendah")).toBeInTheDocument();
    expect(screen.getByText("-5.2%")).toBeInTheDocument();
    expect(screen.getByText("4.1%")).toBeInTheDocument();
  });

  it("renders empty state saat tidak ada produk margin negatif/rendah", () => {
    useAnalyticsAdvanced.mockReturnValue({
      ...BASE,
      marginRisk: { lowMarginThresholdPct: 10, negativeMarginProducts: [], lowMarginProducts: [] },
    });
    render(<AdvancedTab />);
    expect(screen.getByText("Tidak ada produk yang terjual rugi.")).toBeInTheDocument();
    expect(screen.getByText("Tidak ada produk dengan persentase keuntungan rendah.")).toBeInTheDocument();
  });

  it("every group has a description", () => {
    render(<AdvancedTab />);
    expect(screen.getByText(/Empat angka ringkas untuk memahami kesehatan bisnis/)).toBeInTheDocument();
    expect(screen.getByText(/Membandingkan 2 periode kalender PENUH terakhir/)).toBeInTheDocument();
    expect(screen.getByText(/Kapan pelanggan Anda paling banyak belanja/)).toBeInTheDocument();
  });

  it("no ellipsis/truncate/overflow-hidden anywhere in rendered output", () => {
    const { container } = render(<AdvancedTab />);
    const offenders = Array.from(container.querySelectorAll("*")).filter((el) =>
      ["truncate", "whitespace-nowrap", "overflow-hidden"].some((cls) => el.className?.toString().includes(cls)),
    );
    expect(offenders).toHaveLength(0);
  });
});
