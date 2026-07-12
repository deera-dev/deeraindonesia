import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../hooks", () => ({
  useAnalyticsInventory: vi.fn(),
}));

import InventoryTab from "./InventoryTab";
import { useAnalyticsInventory } from "../../hooks";

const BASE = {
  summary: {
    totalInventoryValue: 50000000,
    totalSkuWithStock: 42,
    avgDailyCogs: 500000,
    daysOfInventory: 100,
    inventoryTurnover: 0.3,
    method: "days_of_inventory_from_current_stock_and_period_cogs",
  },
  stockHealth: { dead: 3, critical: 2, low: 5, healthy: 30, overstock: 2, noMovementPeriod: 1 },
  deadStock: [{ kode: "D-01-OSK", value: 45 }, { kode: "D-05-XYZ", value: null }],
  agingStock: [{ kode: "D-02-SFN", value: 20 }],
  overstock: [{ kode: "D-03-MKN", value: 90.5 }],
  understock: [{ kode: "D-04-CTN", value: 2.1 }],
  suggestedRestock: [{ kode: "D-04-CTN", value: 15 }],
  restockPriority: [{ kode: "D-04-CTN", value: 250000 }],
  stockRiskIndicator: [
    { kode: "D-01-OSK", value: null, category: "dead" },
    { kode: "D-04-CTN", value: 2.1, category: "critical" },
  ],
  loading: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsInventory.mockReturnValue(BASE);
});

describe("InventoryTab", () => {
  it("shows skeleton loading state", () => {
    useAnalyticsInventory.mockReturnValue({ ...BASE, loading: true });
    const { container } = render(<InventoryTab />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows ErrorState with retry when error present", () => {
    const refetch = vi.fn();
    useAnalyticsInventory.mockReturnValue({ ...BASE, error: new Error("gagal"), refetch });
    render(<InventoryTab />);
    expect(screen.getByText("Gagal memuat Persediaan.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("renders 4 Ringkasan Persediaan KPI cards with simplified Indonesian labels", () => {
    render(<InventoryTab />);
    expect(screen.getByText("Nilai Persediaan")).toBeInTheDocument();
    expect(screen.getByText("Jenis Produk Berstok")).toBeInTheDocument();
    expect(screen.getByText("Kecukupan Stok")).toBeInTheDocument();
    expect(screen.getByText("Kecepatan Perputaran Stok")).toBeInTheDocument();
  });

  it("renders hint text explaining Kecukupan Stok and Kecepatan Perputaran Stok", () => {
    render(<InventoryTab />);
    expect(screen.getByText(/Perkiraan berapa hari stok masih cukup/)).toBeInTheDocument();
    expect(screen.getByText(/Seberapa sering stok terjual habis/)).toBeInTheDocument();
  });

  it("renders Kesehatan Stok distribution (6 kategori) with Indonesian labels", () => {
    render(<InventoryTab />);
    expect(screen.getByText("Tidak Bergerak")).toBeInTheDocument();
    expect(screen.getByText("Kritis")).toBeInTheDocument();
    expect(screen.getByText("Menipis")).toBeInTheDocument();
    expect(screen.getByText("Sehat")).toBeInTheDocument();
    expect(screen.getAllByText("Stok Berlebih").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Tanpa Gerak (Periode Ini)")).toBeInTheDocument();
  });

  it("Stok Tidak Bergerak, Stok Berlebih & Kurang, dan Indikator Risiko Stok are collapsed <details>", () => {
    const { container } = render(<InventoryTab />);
    const detailsEls = container.querySelectorAll("details");
    expect(detailsEls.length).toBe(3);
    detailsEls.forEach((d) => expect(d.open).toBe(false));
  });

  it("renders Stok Tidak Bergerak dengan 'Belum pernah terjual' untuk value null", () => {
    render(<InventoryTab />);
    expect(screen.getByText("45 hari")).toBeInTheDocument();
    expect(screen.getByText("Belum pernah terjual")).toBeInTheDocument();
  });

  it("renders Stok Berlebih & Kurang sections dengan format hari cover", () => {
    render(<InventoryTab />);
    expect(screen.getByText("Stok Berlebih", { selector: "h3" })).toBeInTheDocument();
    expect(screen.getByText("Stok Kurang")).toBeInTheDocument();
    expect(screen.getByText("90,5 hari cover")).toBeInTheDocument();
    expect(screen.getByText("2,1 hari cover")).toBeInTheDocument();
  });

  it("renders Saran Restock & Prioritas Restock sections", () => {
    render(<InventoryTab />);
    expect(screen.getByText("Saran Restock")).toBeInTheDocument();
    expect(screen.getByText("Prioritas Restock")).toBeInTheDocument();
    expect(screen.getByText("15 pcs")).toBeInTheDocument();
  });

  it("renders Indikator Risiko Stok dengan label kategori digabung ke value", () => {
    render(<InventoryTab />);
    expect(screen.getByText("Indikator Risiko Stok")).toBeInTheDocument();
    expect(screen.getByText("Tidak bergerak (belum pernah terjual)")).toBeInTheDocument();
    expect(screen.getByText(/Kritis · 2,1 hari cover/)).toBeInTheDocument();
  });

  it("every visible/collapsed section has a description", () => {
    render(<InventoryTab />);
    expect(screen.getByText(/Nilai dan kecepatan perputaran seluruh stok/)).toBeInTheDocument();
    expect(screen.getByText(/Sebaran kondisi stok Anda/)).toBeInTheDocument();
    expect(screen.getByText(/Produk yang sebaiknya segera ditambah stoknya/)).toBeInTheDocument();
    expect(screen.getByText(/Produk yang belum pernah terjual, atau sudah lama sekali/)).toBeInTheDocument();
    expect(screen.getByText(/Produk dengan stok jauh lebih banyak/)).toBeInTheDocument();
    expect(screen.getByText(/Produk yang perlu perhatian karena tidak bergerak/)).toBeInTheDocument();
  });

  it("no ellipsis/truncate/overflow-hidden anywhere in rendered output", () => {
    const { container } = render(<InventoryTab />);
    const offenders = Array.from(container.querySelectorAll("*")).filter((el) =>
      ["truncate", "whitespace-nowrap", "overflow-hidden"].some((cls) => el.className?.toString().includes(cls)),
    );
    expect(offenders).toHaveLength(0);
  });
});
