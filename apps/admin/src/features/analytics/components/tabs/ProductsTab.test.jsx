import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../hooks", () => ({
  useAnalyticsProducts: vi.fn(),
}));

import ProductsTab from "./ProductsTab";
import { useAnalyticsProducts } from "../../hooks";

const BASE = {
  leaderboard: {
    terlaris: [{ kode: "D-01-OSK", value: 15 }],
    omsetTertinggi: [{ kode: "D-01-OSK", value: 3000000 }],
    profitTertinggi: [{ kode: "D-01-OSK", value: 700000 }],
    marginTertinggi: [{ kode: "D-01-OSK", value: 0.35 }],
    marginTerendah: [{ kode: "D-02-SFN", value: -0.05 }],
  },
  harga: {
    hppTertinggi: [{ kode: "D-01-OSK", value: 100000 }],
    hppTerendah: [{ kode: "D-02-SFN", value: 60000 }],
    hargaJualTertinggi: [{ kode: "D-01-OSK", value: 250000 }],
    hargaJualTerendah: [{ kode: "D-02-SFN", value: 150000 }],
  },
  movement: {
    fastMoving: [{ kode: "D-01-OSK", value: 2.5 }],
    slowMoving: [{ kode: "D-02-SFN", value: 0.1 }],
  },
  inventory: {
    stokTerbanyak: [{ kode: "D-01-OSK", value: 120 }],
    stokHampirHabis: [{ kode: "D-02-SFN", value: 3.2 }],
    tidakPernahTerjual: [{ kode: "D-03-MKN", value: 10 }],
    tidakAdaPenjualanPeriode: [{ kode: "D-04-CTN", value: 5 }],
  },
  loading: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsProducts.mockReturnValue(BASE);
});

describe("ProductsTab", () => {
  it("shows skeleton loading state", () => {
    useAnalyticsProducts.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<ProductsTab />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows ErrorState with retry when error present", () => {
    const refetch = vi.fn();
    useAnalyticsProducts.mockReturnValue({ ...BASE, error: new Error("gagal"), refetch });
    render(<ProductsTab />);
    expect(screen.getByText("Gagal memuat Produk.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders all 4 section headers with Indonesian labels (redesign 2026-07)", () => {
    render(<ProductsTab />);
    expect(screen.getByText("Produk Terbaik")).toBeInTheDocument();
    expect(screen.getByText("Harga")).toBeInTheDocument();
    expect(screen.getByText("Kecepatan Terjual")).toBeInTheDocument();
    expect(screen.getByText("Stok")).toBeInTheDocument();
  });

  it("every section has a short description", () => {
    render(<ProductsTab />);
    expect(screen.getByText(/Produk dengan penjualan, keuntungan/)).toBeInTheDocument();
    expect(screen.getByText(/Harga jual dan modal/)).toBeInTheDocument();
    expect(screen.getByText(/Rata-rata jumlah produk terjual per hari/)).toBeInTheDocument();
    expect(screen.getByText(/Kondisi stok produk Anda saat ini/)).toBeInTheDocument();
  });

  it("Harga and Kecepatan Terjual sections are collapsed <details> (progressive disclosure)", () => {
    const { container } = render(<ProductsTab />);
    const detailsEls = container.querySelectorAll("details");
    expect(detailsEls.length).toBe(2);
    detailsEls.forEach((d) => expect(d.open).toBe(false));
  });

  it("renders all 5 leaderboard sub-lists with simplified labels", () => {
    render(<ProductsTab />);
    expect(screen.getByText("Produk Terlaris")).toBeInTheDocument();
    expect(screen.getByText("Penjualan Tertinggi")).toBeInTheDocument();
    expect(screen.getByText("Keuntungan Tertinggi")).toBeInTheDocument();
    expect(screen.getByText("Persentase Keuntungan Tertinggi")).toBeInTheDocument();
    expect(screen.getByText("Persentase Keuntungan Terendah")).toBeInTheDocument();
    // D-01-OSK appears in terlaris/omset/profit/margin tertinggi -> multiple
    expect(screen.getAllByText("D-01-OSK").length).toBeGreaterThan(0);
    expect(screen.getAllByText("D-02-SFN").length).toBeGreaterThan(0);
  });

  it("formats terlaris value as pcs", () => {
    render(<ProductsTab />);
    expect(screen.getByText("15 pcs")).toBeInTheDocument();
  });

  it("formats margin as percent with sign preserved", () => {
    render(<ProductsTab />);
    expect(screen.getByText("35%")).toBeInTheDocument();
    expect(screen.getByText("-5%")).toBeInTheDocument();
  });

  it("renders Harga section labels (HPP renamed to Modal)", () => {
    render(<ProductsTab />);
    expect(screen.getByText("Harga Jual Tertinggi")).toBeInTheDocument();
    expect(screen.getByText("Harga Jual Terendah")).toBeInTheDocument();
    expect(screen.getByText("Modal Tertinggi")).toBeInTheDocument();
    expect(screen.getByText("Modal Terendah")).toBeInTheDocument();
    expect(screen.queryByText("HPP Tertinggi")).not.toBeInTheDocument();
  });

  it("renders Kecepatan Terjual section labels with pcs/hari suffix", () => {
    render(<ProductsTab />);
    expect(screen.getByText("Paling Cepat Terjual")).toBeInTheDocument();
    expect(screen.getByText("Paling Lambat Terjual")).toBeInTheDocument();
    expect(screen.getByText("2,5 pcs/hari")).toBeInTheDocument();
  });

  it("renders Stok section labels with hari cover suffix", () => {
    render(<ProductsTab />);
    expect(screen.getByText("Stok Terbanyak")).toBeInTheDocument();
    expect(screen.getByText("Hampir Habis")).toBeInTheDocument();
    expect(screen.getByText("Tidak Ada Penjualan (Periode Ini)")).toBeInTheDocument();
    expect(screen.getByText("Tidak Pernah Terjual (Sepanjang Waktu)")).toBeInTheDocument();
    expect(screen.getByText("3,2 hari")).toBeInTheDocument();
  });

  it("shows empty message for lists with no data", () => {
    useAnalyticsProducts.mockReturnValue({
      ...BASE,
      inventory: { ...BASE.inventory, stokHampirHabis: [] },
    });
    render(<ProductsTab />);
    expect(screen.getByText("Tidak ada produk hampir habis.")).toBeInTheDocument();
  });

  it("no ellipsis/truncate/overflow-hidden anywhere on the page (no hidden info)", () => {
    const { container } = render(<ProductsTab />);
    const offenders = Array.from(container.querySelectorAll("*")).filter((el) =>
      ["truncate", "whitespace-nowrap", "overflow-hidden"].some((cls) => el.className?.toString().includes(cls)),
    );
    expect(offenders).toHaveLength(0);
  });

  it("does NOT render product nama anywhere (only kode, per instruksi eksplisit)", () => {
    render(<ProductsTab />);
    expect(screen.queryByText(/Gamis/i)).not.toBeInTheDocument();
  });
});
