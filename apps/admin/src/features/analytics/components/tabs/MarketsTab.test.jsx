import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../hooks", () => ({
  useAnalyticsMarkets: vi.fn(),
}));

// Mock MarketDetailPanel supaya kita bisa memverifikasi KAPAN komponen ini
// di-mount (lazy loading di level tab) tanpa bergantung pada implementasi
// internalnya (sudah dites terpisah di MarketDetailPanel.test.jsx).
vi.mock("./MarketDetailPanel", () => ({
  default: ({ market }) => <div data-testid="market-detail-panel">Detail: {market}</div>,
}));

import MarketsTab from "./MarketsTab";
import { useAnalyticsMarkets } from "../../hooks";

const MARKETS = [
  { location: "cideng", revenue: 3000000, profit: 700000, qty: 15, customer: 5 },
  { location: "gudang", revenue: 2000000, profit: 500000, qty: 10, customer: 3 },
  { location: "tegalgubug", revenue: 0, profit: 0, qty: 0, customer: 0 },
];

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsMarkets.mockReturnValue({ markets: MARKETS, loading: false });
});

describe("MarketsTab", () => {
  it("shows skeleton loading state (Phase 5)", () => {
    useAnalyticsMarkets.mockReturnValue({ markets: [], loading: true });
    const { container } = render(<MarketsTab />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows ErrorState with retry when error present (Phase 5)", () => {
    const refetch = vi.fn();
    useAnalyticsMarkets.mockReturnValue({ markets: [], loading: false, error: new Error("gagal"), refetch });
    render(<MarketsTab />);
    expect(screen.getByText("Gagal memuat Pasar.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("expand/collapse button has aria-expanded reflecting state (Phase 5)", () => {
    render(<MarketsTab />);
    const buttons = screen.getAllByText("Lihat Detail");
    expect(buttons[0]).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(buttons[0]);
    expect(screen.getByText("Tutup Detail")).toHaveAttribute("aria-expanded", "true");
  });

  it("renders all markets (cabang) with location label and 4 stats (Indonesian labels, redesign 2026-07)", () => {
    render(<MarketsTab />);
    expect(screen.getByText("Cideng")).toBeInTheDocument();
    expect(screen.getByText("Gudang")).toBeInTheDocument();
    expect(screen.getByText("Tegalgubug")).toBeInTheDocument();
    expect(screen.getAllByText("Penjualan").length).toBe(3);
    expect(screen.getAllByText("Keuntungan").length).toBe(3);
    expect(screen.getAllByText("Jumlah Terjual").length).toBe(3);
    expect(screen.getAllByText("Jumlah Pelanggan").length).toBe(3);
  });

  it("has a section description", () => {
    render(<MarketsTab />);
    expect(screen.getByText(/Perbandingan penjualan tiap cabang/)).toBeInTheDocument();
  });

  it("shows a note that the Market filter does not apply to this page", () => {
    render(<MarketsTab />);
    expect(screen.getByText(/tidak berlaku di halaman ini/)).toBeInTheDocument();
  });

  it("shows empty message when markets is empty", () => {
    useAnalyticsMarkets.mockReturnValue({ markets: [], loading: false });
    render(<MarketsTab />);
    expect(screen.getByText("Belum ada data cabang.")).toBeInTheDocument();
  });

  describe("lazy loading detail (§PERFORMANCE)", () => {
    it("MarketDetailPanel TIDAK ter-mount untuk market manapun sebelum user klik 'Lihat Detail'", () => {
      render(<MarketsTab />);
      expect(screen.queryByTestId("market-detail-panel")).not.toBeInTheDocument();
    });

    it("MarketDetailPanel ter-mount HANYA untuk market yang di-klik", () => {
      render(<MarketsTab />);
      const buttons = screen.getAllByText("Lihat Detail");
      fireEvent.click(buttons[0]); // klik market pertama (Cideng, karena diurut profit DESC dari RPC)

      const panels = screen.getAllByTestId("market-detail-panel");
      expect(panels).toHaveLength(1);
      expect(panels[0]).toHaveTextContent("Detail: cideng");
    });

    it("klik 'Tutup Detail' meng-unmount MarketDetailPanel (collapse)", () => {
      render(<MarketsTab />);
      fireEvent.click(screen.getAllByText("Lihat Detail")[0]);
      expect(screen.getByTestId("market-detail-panel")).toBeInTheDocument();

      fireEvent.click(screen.getByText("Tutup Detail"));
      expect(screen.queryByTestId("market-detail-panel")).not.toBeInTheDocument();
    });

    it("hanya SATU market yang expanded dalam satu waktu (klik market lain menutup yang sebelumnya)", () => {
      render(<MarketsTab />);
      const buttons = screen.getAllByText("Lihat Detail");
      fireEvent.click(buttons[0]); // expand market pertama
      expect(screen.getAllByTestId("market-detail-panel")).toHaveLength(1);

      // tombol market kedua sekarang harus dicari ulang (label market pertama sudah jadi "Tutup Detail")
      const remainingButtons = screen.getAllByText("Lihat Detail");
      fireEvent.click(remainingButtons[0]); // expand market lain
      expect(screen.getAllByTestId("market-detail-panel")).toHaveLength(1);
    });
  });

  it("no ellipsis/truncate/overflow-hidden anywhere on the page", () => {
    const { container } = render(<MarketsTab />);
    const offenders = Array.from(container.querySelectorAll("*")).filter((el) =>
      ["truncate", "whitespace-nowrap", "overflow-hidden"].some((cls) => el.className?.toString().includes(cls)),
    );
    expect(offenders).toHaveLength(0);
  });
});
