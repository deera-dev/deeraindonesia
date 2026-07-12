import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../hooks", () => ({
  useAnalyticsOverview: vi.fn(),
}));

import OverviewTab from "./OverviewTab";
import { useAnalyticsOverview } from "../../hooks";

// CATATAN (requirement change 2026-07): useAnalyticsOverview() TIDAK LAGI
// mengembalikan `trend` (lihat hooks.js) — OverviewTab.jsx juga sudah
// tidak render chart apa pun (dipindah sepenuhnya ke TrendsTab.jsx). BASE
// di sini sengaja TIDAK menyertakan `trend` supaya mock ini merepresentasikan
// shape hook yang sebenarnya.
const BASE = {
  kpi: { totalRevenue: 5000000, totalProfit: 1200000, totalQty: 25, totalTransaksi: 10, totalCustomer: 6, aov: 500000 },
  quickInsight: {
    // Quick Insight produk WAJIB pakai .kode (keputusan final Denny,
    // 2026-07) — JANGAN diubah kembali ke .nama.
    produkTerlaris: { kode: "D-01-OSK", nama: "Gamis A", value: 15 },
    produkProfitTertinggi: { kode: "D-02-SFN", nama: "Gamis B", value: 400000 },
    pasarTerbaik: { location: "cideng", value: 700000 },
    customerTerbaik: { pelangganId: "p1", nama: "BUDI", value: 2000000 },
  },
  marketSummary: [
    { location: "cideng", revenue: 3000000, profit: 700000, qty: 15 },
    { location: "gudang", revenue: 2000000, profit: 500000, qty: 10 },
  ],
  loading: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsOverview.mockReturnValue(BASE);
});

describe("OverviewTab (Ringkasan Penjualan, redesign 2026-07)", () => {
  it("shows skeleton loading state (Phase 5)", () => {
    useAnalyticsOverview.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<OverviewTab />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows ErrorState (Bahasa Indonesia) with retry when error present", () => {
    const refetch = vi.fn();
    useAnalyticsOverview.mockReturnValue({ ...BASE, error: new Error("gagal"), refetch });
    render(<OverviewTab />);
    expect(screen.getByText("Gagal memuat Ringkasan Penjualan.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders all 6 KPI labels (istilah Bahasa Indonesia sederhana)", () => {
    render(<OverviewTab />);
    expect(screen.getByText("Total Penjualan")).toBeInTheDocument();
    // "Keuntungan" ambigu (juga dipakai label statistik Ringkasan per
    // Cabang di bawah) -> pastikan MINIMAL 1 match (kartu KPI utama).
    expect(screen.getAllByText("Keuntungan").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Produk Terjual")).toBeInTheDocument();
    expect(screen.getByText("Jumlah Transaksi")).toBeInTheDocument();
    expect(screen.getByText("Jumlah Pelanggan")).toBeInTheDocument();
    expect(screen.getByText("Rata-rata Nilai Transaksi")).toBeInTheDocument();
  });

  it("KPI utama punya hint penjelasan istilah (owner tidak perlu bertanya 'ini angka apa')", () => {
    render(<OverviewTab />);
    expect(screen.getByText("Total nilai seluruh penjualan.")).toBeInTheDocument();
    expect(screen.getByText("Total keuntungan setelah dikurangi modal.")).toBeInTheDocument();
    expect(screen.getByText("Rata-rata besar belanja pelanggan per transaksi.")).toBeInTheDocument();
  });

  it("section 'Angka Penting' dan 'Sorotan' punya deskripsi 1 kalimat", () => {
    render(<OverviewTab />);
    expect(screen.getByText("Angka Penting")).toBeInTheDocument();
    expect(screen.getByText(/Ringkasan penjualan pada periode/)).toBeInTheDocument();
    expect(screen.getByText("Sorotan")).toBeInTheDocument();
    expect(screen.getByText(/performa terbaik pada periode ini/)).toBeInTheDocument();
  });

  it("renders Sorotan produk pakai KODE (D-01-OSK/D-02-SFN), BUKAN nama (Gamis A/Gamis B)", () => {
    render(<OverviewTab />);
    expect(screen.getByText("Produk Terlaris")).toBeInTheDocument();
    expect(screen.getByText("Produk Paling Untung")).toBeInTheDocument();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("D-02-SFN")).toBeInTheDocument();
    expect(screen.queryByText("Gamis A")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamis B")).not.toBeInTheDocument();
    // "Cideng" muncul 2x di halaman (Sorotan Cabang Terbaik + baris Ringkasan per Cabang)
    expect(screen.getAllByText("Cideng").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Cabang Terbaik")).toBeInTheDocument();
    // Pelanggan Terbaik TETAP pakai nama (identitas pelanggan memang nama)
    expect(screen.getByText("Pelanggan Terbaik")).toBeInTheDocument();
    expect(screen.getByText("BUDI")).toBeInTheDocument();
    expect(screen.getByText("15 pcs terjual")).toBeInTheDocument();
  });

  it("renders quick insight fallback '—' and 'Belum ada data' when a field is null", () => {
    useAnalyticsOverview.mockReturnValue({
      ...BASE,
      quickInsight: { produkTerlaris: null, produkProfitTertinggi: null, pasarTerbaik: null, customerTerbaik: null },
    });
    render(<OverviewTab />);
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Belum ada data").length).toBe(4);
  });

  it("renders Ringkasan per Cabang (dulu Market Summary) sebagai kartu dengan label Penjualan/Keuntungan/Jumlah Terjual", () => {
    render(<OverviewTab />);
    expect(screen.getByText("Ringkasan per Cabang")).toBeInTheDocument();
    // "Cideng" muncul juga di Sorotan (Cabang Terbaik) — pakai getAllByText
    expect(screen.getAllByText("Cideng").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Gudang")).toBeInTheDocument();
    expect(screen.getAllByText("Penjualan").length).toBe(2);
    // 3x: 1 kartu KPI utama ("Keuntungan") + 2 baris Ringkasan per Cabang.
    expect(screen.getAllByText("Keuntungan").length).toBe(3);
    expect(screen.getAllByText("Jumlah Terjual").length).toBe(2);
  });

  it("shows empty message when marketSummary is empty", () => {
    useAnalyticsOverview.mockReturnValue({ ...BASE, marketSummary: [] });
    render(<OverviewTab />);
    expect(screen.getByText(/Belum ada transaksi pada periode ini/)).toBeInTheDocument();
  });

  it("TIDAK render chart/trend section apa pun (dipindah sepenuhnya ke halaman Tren Penjualan)", () => {
    render(<OverviewTab />);
    expect(screen.queryByText("Revenue Trend")).not.toBeInTheDocument();
    expect(screen.queryByText("Profit Trend")).not.toBeInTheDocument();
    expect(screen.queryByText(/Sales Trend/)).not.toBeInTheDocument();
    expect(document.querySelector("svg")).not.toBeInTheDocument();
  });

  it("no card label/value anywhere uses truncate/whitespace-nowrap/overflow-hidden (no ellipsis allowed)", () => {
    const { container } = render(<OverviewTab />);
    const offenders = Array.from(container.querySelectorAll("*")).filter((el) =>
      ["truncate", "whitespace-nowrap", "overflow-hidden"].some((cls) => el.className?.toString().includes(cls)),
    );
    expect(offenders).toHaveLength(0);
  });
});
