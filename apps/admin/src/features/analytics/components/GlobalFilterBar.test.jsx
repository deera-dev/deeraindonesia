import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/features/products/hooks", () => ({
  useProducts: vi.fn(),
}));
vi.mock("../hooks", () => ({
  useAnalyticsFilter: vi.fn(),
}));

import GlobalFilterBar from "./GlobalFilterBar";
import { useProducts } from "@deera/shared/features/products/hooks";
import { useAnalyticsFilter } from "../hooks";

const setDateRange = vi.fn();
const setLocation = vi.fn();
const setKode = vi.fn();
const setDatePreset = vi.fn();

function mockFilter(overrides = {}) {
  useAnalyticsFilter.mockReturnValue({
    filter: { fromDate: "2024-01-01", toDate: "2024-01-31", location: null, kode: null },
    datePreset: "30d",
    setDateRange,
    setLocation,
    setKode,
    setDatePreset,
    ...overrides,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  useProducts.mockReturnValue({
    products: [
      { kode: "D-01-OSK", nama: "Gamis A" },
      { kode: "D-02-SFN", nama: "Gamis B" },
    ],
  });
  mockFilter();
});

describe("GlobalFilterBar", () => {
  it("renders 4 tombol preset (7 Hari/30 Hari/1 Tahun/Custom)", () => {
    render(<GlobalFilterBar />);
    expect(screen.getByText("7 Hari")).toBeInTheDocument();
    expect(screen.getByText("30 Hari")).toBeInTheDocument();
    expect(screen.getByText("1 Tahun")).toBeInTheDocument();
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("clicking a preset button calls setDatePreset dengan key yang benar", () => {
    render(<GlobalFilterBar />);
    fireEvent.click(screen.getByText("7 Hari"));
    expect(setDatePreset).toHaveBeenCalledWith("7d");

    fireEvent.click(screen.getByText("1 Tahun"));
    expect(setDatePreset).toHaveBeenCalledWith("1y");
  });

  it("preset yang aktif mendapat highlight style", () => {
    mockFilter({ datePreset: "7d" });
    render(<GlobalFilterBar />);
    expect(screen.getByText("7 Hari").className).toContain("bg-[#CAB170]");
    expect(screen.getByText("30 Hari").className).not.toContain("bg-[#CAB170]");
  });

  it("date picker manual TIDAK muncul saat preset bukan 'custom'", () => {
    mockFilter({ datePreset: "30d" });
    render(<GlobalFilterBar />);
    expect(document.querySelectorAll('input[type="date"]')).toHaveLength(0);
  });

  it("date picker manual MUNCUL dengan nilai filter saat ini saat preset 'custom'", () => {
    mockFilter({ datePreset: "custom" });
    render(<GlobalFilterBar />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs).toHaveLength(2);
    expect(dateInputs[0].value).toBe("2024-01-01");
    expect(dateInputs[1].value).toBe("2024-01-31");
  });

  it("mengubah date picker manual (mode custom) tetap memanggil setDateRange, bukan setDatePreset", () => {
    mockFilter({ datePreset: "custom" });
    render(<GlobalFilterBar />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: "2024-02-01" } });
    expect(setDateRange).toHaveBeenCalledWith("2024-02-01", "2024-01-31");
    expect(setDatePreset).not.toHaveBeenCalled();
  });

  it("renders market options from LOCATIONS", () => {
    render(<GlobalFilterBar />);
    expect(screen.getByText("Semua Market")).toBeInTheDocument();
    expect(screen.getByText("Gudang")).toBeInTheDocument();
    expect(screen.getByText("Cideng")).toBeInTheDocument();
    expect(screen.getByText("Tegalgubug")).toBeInTheDocument();
  });

  it("renders product options from useProducts", () => {
    render(<GlobalFilterBar />);
    expect(screen.getByText("Semua Produk")).toBeInTheDocument();
    expect(screen.getByText("D-01-OSK — Gamis A")).toBeInTheDocument();
    expect(screen.getByText("D-02-SFN — Gamis B")).toBeInTheDocument();
  });

  it("changing market select calls setLocation", () => {
    render(<GlobalFilterBar />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "cideng" } });
    expect(setLocation).toHaveBeenCalledWith("cideng");
  });

  it("selecting 'Semua Market' calls setLocation(null)", () => {
    render(<GlobalFilterBar />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[0], { target: { value: "" } });
    expect(setLocation).toHaveBeenCalledWith(null);
  });

  it("changing product select calls setKode", () => {
    render(<GlobalFilterBar />);
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1], { target: { value: "D-01-OSK" } });
    expect(setKode).toHaveBeenCalledWith("D-01-OSK");
  });

  it("handles products=null gracefully (still loading)", () => {
    useProducts.mockReturnValue({ products: null });
    render(<GlobalFilterBar />);
    expect(screen.getByText("Semua Produk")).toBeInTheDocument();
  });

  it("preset aktif punya aria-pressed=true, lainnya false (Phase 5, accessibility)", () => {
    mockFilter({ datePreset: "7d" });
    render(<GlobalFilterBar />);
    expect(screen.getByText("7 Hari")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("30 Hari")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("1 Tahun")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByText("Custom")).toHaveAttribute("aria-pressed", "false");
  });
});
