import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../shared/components/ProduksiLayout", () => ({
  default: ({ children, title }) => <div><h1>{title}</h1>{children}</div>,
}));
vi.mock("@deera/shared/components/BackToTop", () => ({ default: () => null }));
vi.mock("./StatCard", () => ({
  default: ({ label, value }) => <div data-testid="stat-card"><span>{label}</span><span>{value}</span></div>,
}));
vi.mock("./BatchDetail", () => ({
  default: ({ batch }) => <div data-testid="batch-detail">{batch.kode_produk}</div>,
}));
vi.mock("./JtBadge", () => ({
  default: ({ jatuh_tempo }) => <span data-testid="jt-badge">{jatuh_tempo}</span>,
}));

vi.mock("../hooks", () => ({
  useProduksiBatches: vi.fn(),
  useTagihanJatuhTempo: vi.fn(),
  useProduksiBatchesTotal: vi.fn(),
}));

import ProduksiLaporanPage from "./ProduksiLaporanPage";
import { useProduksiBatches, useTagihanJatuhTempo, useProduksiBatchesTotal } from "../hooks";

const fakeBatches = [
  { id: "b1", kode_produk: "D-07-OSK", batch_no: "PROD-001", tanggal_produksi: "2024-01-10", total_kain: 5, hpp_per_item: 85000, harga_jual: 280000, bahan_dipakai: [] },
  { id: "b2", kode_produk: "D-82-SFN", batch_no: "PROD-002", tanggal_produksi: "2024-01-15", total_kain: 3, hpp_per_item: 0, harga_jual: 0, bahan_dipakai: [] },
];

const fakeTagihan = [
  { id: "t1", nama_bahan: "Wolfis", total_harga: 50000, jatuh_tempo: "2024-01-20", _type: "beli", jumlah: 5, satuan: "yard" },
];

beforeEach(() => {
  vi.clearAllMocks();
  useProduksiBatches.mockReturnValue({ batches: fakeBatches, loading: false });
  useTagihanJatuhTempo.mockReturnValue({ tagihan: fakeTagihan, loading: false });
  useProduksiBatchesTotal.mockReturnValue({ totalBaju: 120, totalModal: 10200000, totalBatch: 24, loading: false });
});

describe("ProduksiLaporanPage", () => {
  it("renders page title", () => {
    render(<ProduksiLaporanPage />);
    expect(screen.getByText("Laporan Produksi")).toBeInTheDocument();
  });

  it("renders StatCards", () => {
    render(<ProduksiLaporanPage />);
    expect(screen.getAllByTestId("stat-card").length).toBeGreaterThan(0);
  });

  it("shows loading state", () => {
    useProduksiBatches.mockReturnValue({ batches: [], loading: true });
    useTagihanJatuhTempo.mockReturnValue({ tagihan: [], loading: false });
    render(<ProduksiLaporanPage />);
    expect(screen.getByText(/Memuat laporan/)).toBeInTheDocument();
  });

  it("shows batch list with kode_produk", () => {
    render(<ProduksiLaporanPage />);
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
    expect(screen.getByText("D-82-SFN")).toBeInTheDocument();
  });

  it("expands batch detail on click", async () => {
    const user = userEvent.setup();
    render(<ProduksiLaporanPage />);
    const batchRow = screen.getAllByText("D-07-OSK")[0].closest("[class]");
    await user.click(batchRow);
    expect(screen.getByTestId("batch-detail")).toBeInTheDocument();
  });

  it("shows tagihan items", () => {
    render(<ProduksiLaporanPage />);
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
    expect(screen.getByTestId("jt-badge")).toBeInTheDocument();
  });

  it("shows empty tagihan message when none", () => {
    useTagihanJatuhTempo.mockReturnValue({ tagihan: [], loading: false });
    render(<ProduksiLaporanPage />);
    expect(screen.getByText(/Tidak ada tagihan jatuh tempo/)).toBeInTheDocument();
  });

  it("shows empty batch+tagihan message when both empty", () => {
    useProduksiBatches.mockReturnValue({ batches: [], loading: false });
    useTagihanJatuhTempo.mockReturnValue({ tagihan: [], loading: false });
    render(<ProduksiLaporanPage />);
    expect(screen.getByText(/Tidak ada data produksi/)).toBeInTheDocument();
  });

  it("renders month picker (Filter Bulan)", () => {
    render(<ProduksiLaporanPage />);
    expect(screen.getByText("Filter Bulan")).toBeInTheDocument();
    const monthSelect = document.querySelector("select");
    expect(monthSelect).toBeInTheDocument();
    // should have options for multiple months
    expect(monthSelect.options.length).toBeGreaterThan(1);
  });

  it("changing month re-queries useProduksiBatches with fromDate+toDate derived from month", async () => {
    render(<ProduksiLaporanPage />);
    const monthSelect = document.querySelector("select");
    // Pick a month guaranteed in buildMonthOptions (-11..+2 from now)
    const opts = Array.from(monthSelect.options);
    const prevMonth = opts.find((o) => o.value < monthSelect.value);
    if (prevMonth) {
      const [yyyy, mm] = prevMonth.value.split("-").map(Number);
      const lastDay = new Date(yyyy, mm, 0).getDate();
      const expectedFrom = `${prevMonth.value}-01`;
      const expectedTo = `${prevMonth.value}-${String(lastDay).padStart(2, "0")}`;
      fireEvent.change(monthSelect, { target: { value: prevMonth.value } });
      expect(useProduksiBatches).toHaveBeenCalledWith(
        expect.objectContaining({ fromDate: expectedFrom, toDate: expectedTo }),
      );
    }
  });

  it("menampilkan total all-time dari useProduksiBatchesTotal", () => {
    render(<ProduksiLaporanPage />);
    expect(screen.getByText("Total Produksi (Semua Waktu)")).toBeInTheDocument();
    expect(screen.getByText("120")).toBeInTheDocument();
    // "Total Batch" appears in both all-time and period sections
    expect(screen.getAllByText("Total Batch").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Total Modal stat card label", () => {
    render(<ProduksiLaporanPage />);
    // "Total Modal" appears in both all-time and period stat sections
    expect(screen.getAllByText(/Total Modal/).length).toBeGreaterThanOrEqual(1);
  });

  it("shows HPP Rata-rata stat card label", () => {
    render(<ProduksiLaporanPage />);
    expect(screen.getByText(/HPP Rata-rata/)).toBeInTheDocument();
  });

  it("shows Harga Jual Avg stat card label", () => {
    render(<ProduksiLaporanPage />);
    expect(screen.getByText(/Harga Jual Avg/)).toBeInTheDocument();
  });

  it("shows pemakaian bahan section when batches have bahan", () => {
    const batchesWithBahan = [
      { ...fakeBatches[0], bahan_dipakai: [{ nama_bahan: "Wolfis", satuan: "yard", jumlah: 25 }] },
    ];
    useProduksiBatches.mockReturnValue({ batches: batchesWithBahan, loading: false });
    render(<ProduksiLaporanPage />);
    expect(screen.getAllByText(/Wolfis/).length).toBeGreaterThanOrEqual(1);
  });
});
