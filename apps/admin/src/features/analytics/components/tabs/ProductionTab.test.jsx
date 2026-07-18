import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../hooks", () => ({
  useAnalyticsProduction: vi.fn(),
  useTagihanJatuhTempo: vi.fn(),
}));

import ProductionTab from "./ProductionTab";
import { useAnalyticsProduction, useTagihanJatuhTempo } from "../../hooks";

const BATCH = {
  id: "b1",
  batchNo: "BATCH-001",
  kodeProduk: "D-93-SWI",
  namaProduk: "Gamis Swiss",
  tanggalProduksi: "2026-06-01",
  totalKain: 90,
  catatan: "Catatan batch",
  hppPerItem: 169392,
  modal: 15245280,
  costBreakdown: { bahan: 101259, jahit: 35000, bordir: 15000, studio: 1833, lainnya: 16300 },
  hargaJualAvg: 220000,
  unitsSoldSinceProduksi: 38,
  sellThroughPct: 42.2,
  avgHargaJualRealized: 220526,
  marginRealizedPerItem: 51134,
};

const PRODUCTION_BASE = {
  batches: [BATCH],
  ringkasan: {
    totalBatch: 1,
    totalBaju: 90,
    totalModal: 15245280,
    hppAvg: 169392,
    hargaJualAvg: 220000,
    avgSellThroughPct: 42.2,
    batchesMissingHpp: 0,
  },
  totalAllTime: { totalBatch: 21, totalBaju: 1399, totalModal: 162414078 },
  bahanUsage: [
    { nama: "Swiss Jacquard", satuan: "yard", jenis: "motif", jumlah: 97.83 },
    { nama: "Jasmine Rose Crepe", satuan: "yard", jenis: "tambahan", jumlah: 187.01 },
  ],
  bahanUsageByJenis: [
    { jenis: "motif", satuan: "yard", jumlah: 1427.76 },
    { jenis: "tambahan", satuan: "yard", jumlah: 2208.52 },
  ],
  dataQuality: { batchesMissingHpp: 0, batchesTotal: 1 },
  loading: false,
  error: null,
  refetch: vi.fn(),
};

const TAGIHAN_BASE = { tagihan: [], loading: false, error: null, refetch: vi.fn() };

beforeEach(() => {
  vi.clearAllMocks();
  useAnalyticsProduction.mockReturnValue(PRODUCTION_BASE);
  useTagihanJatuhTempo.mockReturnValue(TAGIHAN_BASE);
});

describe("ProductionTab", () => {
  it("shows skeleton loading state", () => {
    useAnalyticsProduction.mockReturnValue({ ...PRODUCTION_BASE, loading: true });
    const { container } = render(<ProductionTab />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("shows ErrorState with retry when production query errors", () => {
    const refetchProduction = vi.fn();
    useAnalyticsProduction.mockReturnValue({ ...PRODUCTION_BASE, error: new Error("gagal"), refetch: refetchProduction });
    render(<ProductionTab />);
    expect(screen.getByText("Gagal memuat Ringkasan Produksi.")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Coba Lagi"));
    expect(refetchProduction).toHaveBeenCalledTimes(1);
  });

  it("shows ErrorState when tagihan query errors (even if production is fine)", () => {
    useTagihanJatuhTempo.mockReturnValue({ ...TAGIHAN_BASE, error: new Error("gagal tagihan") });
    render(<ProductionTab />);
    expect(screen.getByText("Gagal memuat Ringkasan Produksi.")).toBeInTheDocument();
  });

  it("renders Ringkasan Produksi KPI cards from ringkasan", () => {
    render(<ProductionTab />);
    expect(screen.getByText("Ringkasan Produksi")).toBeInTheDocument();
    // "Total Batch"/"Total Baju" juga muncul di section Total Produksi
    // (Semua Waktu) di bawahnya -> pakai getAllByText, bukan getByText.
    expect(screen.getAllByText("Total Batch").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Total Baju").length).toBeGreaterThan(0);
    expect(screen.getByText("Sell-Through Rata-rata")).toBeInTheDocument();
    expect(screen.getByText("42,2%")).toBeInTheDocument();
  });

  it("shows data-quality warning banner when batchesMissingHpp > 0", () => {
    useAnalyticsProduction.mockReturnValue({
      ...PRODUCTION_BASE,
      dataQuality: { batchesMissingHpp: 3, batchesTotal: 21 },
    });
    render(<ProductionTab />);
    expect(screen.getByText(/3 dari 21 batch/)).toBeInTheDocument();
  });

  it("does not show data-quality banner when batchesMissingHpp = 0", () => {
    render(<ProductionTab />);
    expect(screen.queryByText(/batch pada periode ini belum punya Template HPP/)).toBeNull();
  });

  it("renders batch list with kode, batchNo, and HPP", () => {
    render(<ProductionTab />);
    expect(screen.getByText("D-93-SWI")).toBeInTheDocument();
    expect(screen.getByText(/BATCH-001/)).toBeInTheDocument();
  });

  it("expands a batch on click to show cost breakdown and sell-through detail", () => {
    render(<ProductionTab />);
    fireEvent.click(screen.getByText("D-93-SWI"));
    expect(screen.getByText("Komponen Biaya")).toBeInTheDocument();
    expect(screen.getByText("Performa Penjualan")).toBeInTheDocument();
    expect(screen.getByText("38 pcs")).toBeInTheDocument();
  });

  it("collapses an expanded batch on second click", () => {
    render(<ProductionTab />);
    fireEvent.click(screen.getByText("D-93-SWI"));
    expect(screen.getByText("Komponen Biaya")).toBeInTheDocument();
    fireEvent.click(screen.getByText("D-93-SWI"));
    expect(screen.queryByText("Komponen Biaya")).toBeNull();
  });

  it("shows 'belum ada HPP' for batches with hppPerItem = 0", () => {
    useAnalyticsProduction.mockReturnValue({
      ...PRODUCTION_BASE,
      batches: [{ ...BATCH, hppPerItem: 0 }],
    });
    render(<ProductionTab />);
    expect(screen.getByText("belum ada HPP")).toBeInTheDocument();
  });

  it("shows empty message when there are no batches in the period", () => {
    useAnalyticsProduction.mockReturnValue({ ...PRODUCTION_BASE, batches: [] });
    render(<ProductionTab />);
    expect(screen.getByText("Tidak ada batch produksi pada periode ini.")).toBeInTheDocument();
  });

  it("renders Pemakaian Bahan section with motif/tambahan breakdown", () => {
    render(<ProductionTab />);
    expect(screen.getByText("Pemakaian Bahan")).toBeInTheDocument();
    // Label "Bahan Motif"/"Bahan Tambahan" muncul 2x per jenis: KpiCard
    // ringkasan DAN badge per baris di daftar bahan -> getAllByText.
    expect(screen.getAllByText("Bahan Motif").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Bahan Tambahan").length).toBeGreaterThan(0);
    expect(screen.getByText("Swiss Jacquard")).toBeInTheDocument();
    expect(screen.getByText("Jasmine Rose Crepe")).toBeInTheDocument();
  });

  it("renders Total Produksi (Semua Waktu) from totalAllTime, independent of period", () => {
    render(<ProductionTab />);
    expect(screen.getByText("Total Produksi (Semua Waktu)")).toBeInTheDocument();
  });

  it("renders Tagihan Jatuh Tempo section with empty state when no tagihan", () => {
    render(<ProductionTab />);
    expect(screen.getByText("Tagihan Jatuh Tempo")).toBeInTheDocument();
    expect(screen.getByText("Tidak ada tagihan jatuh tempo pada periode ini.")).toBeInTheDocument();
  });

  it("renders tagihan rows with nama_bahan and total_harga", () => {
    useTagihanJatuhTempo.mockReturnValue({
      ...TAGIHAN_BASE,
      tagihan: [
        { id: "t1", nama_bahan: "Malaga", total_harga: 500000, jatuh_tempo: "2026-07-25", jumlah: 100, satuan: "yard", status_bayar: "belum", _type: "beli" },
      ],
    });
    render(<ProductionTab />);
    expect(screen.getByText("Malaga")).toBeInTheDocument();
    // "Rp 500.000" muncul 2x: badge total tagihan di header section (SUM
    // 1 baris = sama persis) DAN nominal baris itu sendiri -> getAllByText.
    expect(screen.getAllByText("Rp 500.000").length).toBeGreaterThan(0);
  });
});
