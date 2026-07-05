import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/components/FinanceLayout", () => ({
  default: ({ children, title, headerAction }) => (
    <div><h1>{title}</h1>{headerAction}{children}</div>
  ),
}));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
  fmtTanggalPendek: vi.fn((v) => v || ""),
}));
vi.mock("../components/PettycashForm", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="form">
      <button onClick={onClose}>Close</button>
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));

const mockDelete = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  usePettycashAll: vi.fn(() => ({
    rows: [
      { id: "pc1", tanggal: "2026-07-01", jenis: "isi", kategori: "ATK", keterangan: "isi ulang", jumlah: 300000 },
      { id: "pc2", tanggal: "2026-07-02", jenis: "keluar", kategori: "Operasional", keterangan: "beli kertas", jumlah: 50000 },
    ],
    saldo: 250000,
    loading: false,
    loadError: null,
  })),
  useDeletePettycash: vi.fn(() => mockDelete),
}));

import { usePettycashAll } from "../hooks";
import PettycashPage from "./PettycashPage";

beforeEach(() => {
  vi.clearAllMocks();
  mockDelete.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("PettycashPage", () => {
  it("renders title", () => {
    render(<PettycashPage />);
    expect(screen.getByText("Petty Cash")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    usePettycashAll.mockReturnValueOnce({ rows: [], saldo: 0, loading: true, loadError: null });
    render(<PettycashPage />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("renders saldo", () => {
    render(<PettycashPage />);
    expect(screen.getByText("Rp250000")).toBeInTheDocument();
  });

  it("renders keterangan rows", () => {
    render(<PettycashPage />);
    expect(screen.getByText("isi ulang")).toBeInTheDocument();
    expect(screen.getByText("beli kertas")).toBeInTheDocument();
  });

  it("opens form on + Catat click", () => {
    render(<PettycashPage />);
    fireEvent.click(screen.getByText("+ Catat"));
    expect(screen.getByTestId("form")).toBeInTheDocument();
  });

  it("closes form on Close", () => {
    render(<PettycashPage />);
    fireEvent.click(screen.getByText("+ Catat"));
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("form")).toBeNull();
  });

  it("calls delete and shows success on Hapus confirmed", async () => {
    render(<PettycashPage />);
    fireEvent.click(screen.getAllByText("Hapus")[0]);
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith("pc1"));
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("does not delete when confirm=false", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<PettycashPage />);
    fireEvent.click(screen.getAllByText("Hapus")[0]);
    expect(mockDelete).not.toHaveBeenCalled();
  });
});

describe("PettycashPage — additional branches", () => {
  it("shows loadError message", () => {
    usePettycashAll.mockReturnValueOnce({ rows: [], saldo: 0, loading: false, loadError: "DB error" });
    render(<PettycashPage />);
    expect(screen.getByText(/Gagal memuat/)).toBeInTheDocument();
  });

  it("negative saldo uses red class (renders without crash)", () => {
    usePettycashAll.mockReturnValueOnce({
      rows: [], saldo: -50000, loading: false, loadError: null,
    });
    render(<PettycashPage />);
    expect(screen.getByText("Rp-50000")).toBeInTheDocument();
  });

  it("filterBulan onChange updates filter", () => {
    render(<PettycashPage />);
    const monthInput = document.querySelector('input[type="month"]');
    fireEvent.change(monthInput, { target: { value: "2026-06" } });
    // rows have tanggal starting with 2026-07 so they get filtered out
    expect(screen.queryByText("isi ulang")).toBeNull();
  });

  it("filterJenis click filters by isi", () => {
    render(<PettycashPage />);
    fireEvent.click(screen.getByText("↓ Isi Ulang"));
    // only isi rows remain; keluar row filtered out
    expect(screen.getByText("isi ulang")).toBeInTheDocument();
    expect(screen.queryByText("beli kertas")).toBeNull();
  });

  it("filterJenis click filters by keluar", () => {
    render(<PettycashPage />);
    fireEvent.click(screen.getByText("↑ Pengeluaran"));
    expect(screen.getByText("beli kertas")).toBeInTheDocument();
    expect(screen.queryByText("isi ulang")).toBeNull();
  });

  it("keterangan=null shows dash", () => {
    usePettycashAll.mockReturnValueOnce({
      rows: [{ id: "pc3", tanggal: "2026-07-03", jenis: "isi", kategori: "ATK", keterangan: null, jumlah: 10000 }],
      saldo: 10000, loading: false, loadError: null,
    });
    render(<PettycashPage />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("clicking Edit sets editTarget and shows form", () => {
    render(<PettycashPage />);
    fireEvent.click(screen.getAllByText("Edit")[0]);
    expect(screen.getByTestId("form")).toBeInTheDocument();
  });

  it("editTarget form onClose clears editTarget", () => {
    render(<PettycashPage />);
    fireEvent.click(screen.getAllByText("Edit")[0]);
    // form shows; click Close
    const closes = screen.getAllByText("Close");
    fireEvent.click(closes[0]);
    expect(screen.queryByTestId("form")).toBeNull();
  });

  it("editTarget form onSave clears editTarget", () => {
    render(<PettycashPage />);
    fireEvent.click(screen.getAllByText("Edit")[0]);
    const saves = screen.getAllByText("Save");
    fireEvent.click(saves[0]);
    expect(screen.queryByTestId("form")).toBeNull();
  });

  it("empty filtered state shows empty message", () => {
    usePettycashAll.mockReturnValueOnce({ rows: [], saldo: 0, loading: false, loadError: null });
    render(<PettycashPage />);
    expect(screen.getByText("Tidak ada transaksi petty cash.")).toBeInTheDocument();
  });
});

describe("PettycashPage — periodeIsi/keluar || 0 branch", () => {
  it("covers || 0 fallback in reduce when jumlah=0", () => {
    usePettycashAll.mockReturnValueOnce({
      rows: [
        { id: "pc5", tanggal: "2026-07-05", jenis: "isi",    kategori: "ATK", keterangan: null, jumlah: 0 },
        { id: "pc6", tanggal: "2026-07-06", jenis: "keluar", kategori: "Ops", keterangan: null, jumlah: 0 },
      ],
      saldo: 0, loading: false, loadError: null,
    });
    render(<PettycashPage />);
    // saldo, periodeIsi, periodeKeluar all render Rp0 via fmtRp(0)
    expect(screen.getAllByText("Rp0").length).toBeGreaterThan(0);
  });
});

describe("PettycashPage — Semua filter reset", () => {
  it("clicking Semua resets filterJenis and shows all rows", () => {
    render(<PettycashPage />);
    // First filter to isi only
    fireEvent.click(screen.getByText("↓ Isi Ulang"));
    expect(screen.queryByText("beli kertas")).toBeNull();
    // Then reset
    fireEvent.click(screen.getByText("Semua"));
    expect(screen.getByText("beli kertas")).toBeInTheDocument();
    expect(screen.getByText("isi ulang")).toBeInTheDocument();
  });
});

describe("PettycashPage — showForm onSave", () => {
  it("showForm onSave closes the form", () => {
    render(<PettycashPage />);
    fireEvent.click(screen.getByText("+ Catat"));
    fireEvent.click(screen.getByText("Save"));
    expect(screen.queryByTestId("form")).toBeNull();
  });
});
