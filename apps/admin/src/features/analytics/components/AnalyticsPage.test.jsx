import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => <div data-testid="bottom-nav" /> }));
vi.mock("@deera/shared/components/BackToTop", () => ({ default: () => null }));
vi.mock("./GlobalFilterBar", () => ({ default: () => <div data-testid="filter-bar" /> }));
vi.mock("./tabs/OverviewTab", () => ({ default: () => <div data-testid="overview-tab">OverviewTabContent</div> }));
vi.mock("./tabs/ProductsTab", () => ({ default: () => <div data-testid="products-tab">ProductsTabContent</div> }));
vi.mock("./tabs/MarketsTab", () => ({ default: () => <div data-testid="markets-tab">MarketsTabContent</div> }));
vi.mock("./tabs/TrendsTab", () => ({ default: () => <div data-testid="trends-tab">TrendsTabContent</div> }));
vi.mock("./tabs/CustomersTab", () => ({ default: () => <div data-testid="customers-tab">CustomersTabContent</div> }));
vi.mock("./tabs/AdvancedTab", () => ({ default: () => <div data-testid="advanced-tab">AdvancedTabContent</div> }));
vi.mock("./tabs/InventoryTab", () => ({ default: () => <div data-testid="inventory-tab">InventoryTabContent</div> }));
vi.mock("./tabs/ForecastTab", () => ({ default: () => <div data-testid="forecast-tab">ForecastTabContent</div> }));
vi.mock("./tabs/ExecutiveTab", () => ({ default: () => <div data-testid="executive-tab">ExecutiveTabContent</div> }));

import AnalyticsPage from "./AnalyticsPage";

beforeEach(() => vi.clearAllMocks());

async function switchTo(user, label) {
  fireEvent.click(screen.getByText("Halaman Saat Ini"));
  await user.click(screen.getByText(label));
}

describe("AnalyticsPage", () => {
  it("renders page title (Bahasa Indonesia, redesign 2026-07)", () => {
    render(<AnalyticsPage />);
    expect(screen.getByText("Dasbor Bisnis")).toBeInTheDocument();
  });

  it("renders GlobalFilterBar", () => {
    render(<AnalyticsPage />);
    expect(screen.getByTestId("filter-bar")).toBeInTheDocument();
  });

  it("menampilkan Ringkasan Bisnis (Executive) sebagai halaman DEFAULT (redesign: beranda, bukan lagi overview)", () => {
    render(<AnalyticsPage />);
    expect(screen.getByTestId("executive-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("overview-tab")).not.toBeInTheDocument();
  });

  it("SectionPicker trigger menampilkan 'Ringkasan Bisnis' sebagai halaman aktif default", () => {
    render(<AnalyticsPage />);
    expect(screen.getByText("Halaman Saat Ini")).toBeInTheDocument();
    // Trigger + baris pinned di dalam sheet (belum dibuka) -> hanya trigger yang ada
    expect(screen.getAllByText("Ringkasan Bisnis").length).toBeGreaterThanOrEqual(1);
  });

  it("membuka SectionPicker menampilkan seluruh 9 halaman terkelompok", () => {
    render(<AnalyticsPage />);
    fireEvent.click(screen.getByText("Halaman Saat Ini"));
    expect(screen.getByText("Penjualan")).toBeInTheDocument();
    expect(screen.getByText("Produk & Stok")).toBeInTheDocument();
    expect(screen.getByText("Pasar & Pelanggan")).toBeInTheDocument();
    expect(screen.getByText("Prediksi & Analisis")).toBeInTheDocument();
    expect(screen.getByText("Ringkasan Penjualan")).toBeInTheDocument();
    expect(screen.getByText("Tren Penjualan")).toBeInTheDocument();
    expect(screen.getByText("Produk")).toBeInTheDocument();
    expect(screen.getByText("Persediaan")).toBeInTheDocument();
    expect(screen.getByText("Pasar")).toBeInTheDocument();
    expect(screen.getByText("Pelanggan")).toBeInTheDocument();
    expect(screen.getByText("Prediksi Penjualan")).toBeInTheDocument();
    expect(screen.getByText("Analisis Lanjutan")).toBeInTheDocument();
  });

  it("switches to Ringkasan Penjualan (Overview) tab on click", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await switchTo(user, "Ringkasan Penjualan");
    expect(screen.getByTestId("overview-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("executive-tab")).not.toBeInTheDocument();
  });

  it("switches to Produk tab on click", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await switchTo(user, "Produk");
    expect(screen.getByTestId("products-tab")).toBeInTheDocument();
  });

  it("switches to Pasar tab on click", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await switchTo(user, "Pasar");
    expect(screen.getByTestId("markets-tab")).toBeInTheDocument();
  });

  it("switches to Tren Penjualan tab on click", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await switchTo(user, "Tren Penjualan");
    expect(screen.getByTestId("trends-tab")).toBeInTheDocument();
  });

  it("switches to Pelanggan tab on click", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await switchTo(user, "Pelanggan");
    expect(screen.getByTestId("customers-tab")).toBeInTheDocument();
  });

  it("switches to Analisis Lanjutan tab on click", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await switchTo(user, "Analisis Lanjutan");
    expect(screen.getByTestId("advanced-tab")).toBeInTheDocument();
  });

  it("switches to Persediaan tab on click", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await switchTo(user, "Persediaan");
    expect(screen.getByTestId("inventory-tab")).toBeInTheDocument();
  });

  it("switches to Prediksi Penjualan tab on click", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await switchTo(user, "Prediksi Penjualan");
    expect(screen.getByTestId("forecast-tab")).toBeInTheDocument();
  });

  it("kembali ke Ringkasan Bisnis (beranda) dari halaman lain", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await switchTo(user, "Produk");
    expect(screen.getByTestId("products-tab")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Halaman Saat Ini"));
    // Trigger sedang menampilkan "Produk" (bukan "Ringkasan Bisnis"), jadi
    // "Ringkasan Bisnis" HANYA muncul 1x di sheet (baris pinned).
    await user.click(screen.getAllByText("Ringkasan Bisnis")[0]);
    expect(screen.getByTestId("executive-tab")).toBeInTheDocument();
  });

  it("hanya SATU tab konten yang tampil dalam satu waktu (tidak tumpang tindih)", async () => {
    const user = userEvent.setup();
    render(<AnalyticsPage />);
    await switchTo(user, "Produk");
    expect(screen.getByTestId("products-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("executive-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("overview-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("markets-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("trends-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("customers-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("advanced-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("inventory-tab")).not.toBeInTheDocument();
    expect(screen.queryByTestId("forecast-tab")).not.toBeInTheDocument();
  });

  it("renders AdminBottomNav", () => {
    render(<AnalyticsPage />);
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
  });
});
