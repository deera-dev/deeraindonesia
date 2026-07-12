import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../hooks", () => ({
  useAnalyticsCustomers: vi.fn(),
}));

import CustomersTab from "./CustomersTab";
import { useAnalyticsCustomers } from "../../hooks";

const BASE = {
  leaderboard: {
    revenueTertinggi: [{ pelangganId: "p1", nama: "BUDI", value: 3000000 }],
    profitTertinggi: [{ pelangganId: "p1", nama: "BUDI", value: 700000 }],
    qtyTerbanyak: [{ pelangganId: "p1", nama: "BUDI", value: 15 }],
  },
  insight: {
    customerBaru: 2,
    repeatCustomer: 5,
    avgOrder: 500000,
    ltv: 4000000,
    anonymousTransactionCount: 3,
    anonymousRevenue: 900000,
  },
  ranking: [
    { pelangganId: "p1", nama: "BUDI", revenue: 3000000, profit: 700000, qty: 15, jumlahTransaksi: 4 },
    { pelangganId: "p2", nama: "SITI", revenue: 2000000, profit: 400000, qty: 8, jumlahTransaksi: 2 },
  ],
  loading: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsCustomers.mockReturnValue(BASE);
});

describe("CustomersTab", () => {
  it("shows skeleton loading state", () => {
    useAnalyticsCustomers.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<CustomersTab />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows ErrorState with retry when error present", () => {
    const refetch = vi.fn();
    useAnalyticsCustomers.mockReturnValue({ ...BASE, error: new Error("gagal"), refetch });
    render(<CustomersTab />);
    expect(screen.getByText("Gagal memuat Pelanggan.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders 4 Ringkasan Pelanggan KPI cards with simplified Indonesian labels", () => {
    render(<CustomersTab />);
    expect(screen.getByText("Pelanggan Baru")).toBeInTheDocument();
    expect(screen.getByText("Pelanggan Kembali")).toBeInTheDocument();
    expect(screen.getByText("Rata-rata Nilai Transaksi")).toBeInTheDocument();
    expect(screen.getByText("Nilai Pelanggan")).toBeInTheDocument();
  });

  it("renders hint text explaining each KPI", () => {
    render(<CustomersTab />);
    expect(screen.getByText(/Pelanggan yang baru pertama kali belanja/)).toBeInTheDocument();
    expect(screen.getByText(/Pelanggan yang sudah belanja lebih dari sekali/)).toBeInTheDocument();
  });

  it("every section has a description", () => {
    render(<CustomersTab />);
    expect(screen.getByText(/Gambaran singkat pelanggan Anda/)).toBeInTheDocument();
    expect(screen.getByText(/Pelanggan dengan penjualan, keuntungan/)).toBeInTheDocument();
    expect(screen.getByText(/Daftar lengkap seluruh pelanggan/)).toBeInTheDocument();
  });

  it("shows anonymous transparency note when anonymousTransactionCount > 0", () => {
    render(<CustomersTab />);
    expect(screen.getByText(/transaksi tanpa nama pembeli/)).toBeInTheDocument();
  });

  it("HIDES anonymous transparency note when both anonymous fields are 0", () => {
    useAnalyticsCustomers.mockReturnValue({
      ...BASE,
      insight: { ...BASE.insight, anonymousTransactionCount: 0, anonymousRevenue: 0 },
    });
    render(<CustomersTab />);
    expect(screen.queryByText(/tidak dihitung di daftar pelanggan/)).not.toBeInTheDocument();
  });

  it("renders Pelanggan Terbaik sections using nama (BUKAN kode) as identity", () => {
    render(<CustomersTab />);
    expect(screen.getByText("Penjualan Tertinggi")).toBeInTheDocument();
    expect(screen.getByText("Keuntungan Tertinggi")).toBeInTheDocument();
    expect(screen.getByText("Pembelian Terbanyak")).toBeInTheDocument();
    // "BUDI" muncul di ke-3 leaderboard + ranking -> pakai getAllByText
    expect(screen.getAllByText("BUDI").length).toBeGreaterThanOrEqual(3);
  });

  it("Ranking Pelanggan is a collapsed <details> (progressive disclosure)", () => {
    const { container } = render(<CustomersTab />);
    const details = container.querySelector("details");
    expect(details).toBeInTheDocument();
    expect(details.open).toBe(false);
  });

  it("renders Ranking Pelanggan cards dengan Penjualan/Keuntungan/Jumlah Beli/Transaksi per baris", () => {
    render(<CustomersTab />);
    expect(screen.getByText("Ranking Pelanggan")).toBeInTheDocument();
    expect(screen.getByText("SITI")).toBeInTheDocument();
    expect(screen.getAllByText("Transaksi").length).toBe(2); // 1 per baris ranking
  });

  it("shows empty message when ranking is empty", () => {
    useAnalyticsCustomers.mockReturnValue({ ...BASE, ranking: [] });
    render(<CustomersTab />);
    expect(screen.getByText(/Belum ada transaksi bernama pada periode ini/)).toBeInTheDocument();
  });

  it("no ellipsis/truncate/overflow-hidden anywhere in rendered output", () => {
    const { container } = render(<CustomersTab />);
    const offenders = Array.from(container.querySelectorAll("*")).filter((el) =>
      ["truncate", "whitespace-nowrap", "overflow-hidden"].some((cls) => el.className?.toString().includes(cls)),
    );
    expect(offenders).toHaveLength(0);
  });
});
