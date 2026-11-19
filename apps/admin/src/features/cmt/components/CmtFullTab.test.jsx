import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));

const mockUseCmtFullKirim = vi.fn();
const mockUseCmtSetoranFull = vi.fn();
const mockDeleteKirimBahan = vi.fn();
vi.mock("../hooks", () => ({
  useCmtFullKirim: (...a) => mockUseCmtFullKirim(...a),
  useCmtSetoranFull: (...a) => mockUseCmtSetoranFull(...a),
  useDeleteCmtFullKirim: () => mockDeleteKirimBahan,
}));

vi.mock("./KirimBahanForm", () => ({
  default: ({ onClose }) => (
    <div data-testid="kirim-bahan-form">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));
vi.mock("./SetoranFullForm", () => ({
  default: ({ onClose }) => (
    <div data-testid="setoran-full-form">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

import CmtFullTab from "./CmtFullTab";

const KIRIM_ROW = (o) => ({
  id: "b1",
  nama_vendor: "Vendor C",
  tanggal_kirim: "2026-11-18",
  estimasi_selesai: null,
  bahan: [{ nama_bahan: "Wolfis", kode_bahan: "WLF-01", satuan: "yard", jumlah: 50 }],
  ...o,
});
const SETORAN_ROW = (o) => ({
  id: "f1",
  nama_vendor: "Vendor B",
  kode_produk: "D-02-SFN",
  tanggal_setor: "2026-11-18",
  items: [{ size: "Midi", warna: "HITAM", qty: 5 }],
  total_upah: 50000,
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUseCmtFullKirim.mockReturnValue({ rows: [KIRIM_ROW({})], loading: false });
  mockUseCmtSetoranFull.mockReturnValue({ rows: [SETORAN_ROW({})], loading: false });
  mockDeleteKirimBahan.mockResolvedValue(undefined);
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
});

describe("CmtFullTab", () => {
  it("menampilkan dua seksi: Bahan Dikirim & Barang Jadi Diterima", () => {
    render(<CmtFullTab />);
    expect(screen.getByText("Bahan Dikirim ke Vendor")).toBeInTheDocument();
    expect(screen.getByText("Barang Jadi Diterima")).toBeInTheDocument();
    expect(screen.getByText("Vendor C")).toBeInTheDocument();
    expect(screen.getByText(/Wolfis — 50 yard/)).toBeInTheDocument();
    expect(screen.getByText("Vendor B")).toBeInTheDocument();
    expect(screen.getByText(/D-02-SFN/)).toBeInTheDocument();
  });

  it("loading di masing2 seksi independen", () => {
    mockUseCmtFullKirim.mockReturnValue({ rows: [], loading: true });
    mockUseCmtSetoranFull.mockReturnValue({ rows: [], loading: false });
    render(<CmtFullTab />);
    expect(screen.getAllByText("Memuat...")).toHaveLength(1);
    expect(screen.getByText(/Belum ada setoran CMT Full/)).toBeInTheDocument();
  });

  it("kosong -> pesan masing2 seksi", () => {
    mockUseCmtFullKirim.mockReturnValue({ rows: [], loading: false });
    mockUseCmtSetoranFull.mockReturnValue({ rows: [], loading: false });
    render(<CmtFullTab />);
    expect(screen.getByText(/Belum ada bahan yang dikirim/)).toBeInTheDocument();
    expect(screen.getByText(/Belum ada setoran CMT Full/)).toBeInTheDocument();
  });

  it("klik + Kirim Bahan ke Vendor membuka KirimBahanForm", () => {
    render(<CmtFullTab />);
    fireEvent.click(screen.getByText("+ Kirim Bahan ke Vendor"));
    expect(screen.getByTestId("kirim-bahan-form")).toBeInTheDocument();
  });

  it("klik + Terima Setoran CMT Full membuka SetoranFullForm", () => {
    render(<CmtFullTab />);
    fireEvent.click(screen.getByText("+ Terima Setoran CMT Full"));
    expect(screen.getByTestId("setoran-full-form")).toBeInTheDocument();
  });

  it("Hapus pada baris bahan dikirim (confirm true) memanggil deleteKirimBahan", async () => {
    render(<CmtFullTab />);
    fireEvent.click(screen.getByText("Hapus"));
    await waitFor(() => expect(mockDeleteKirimBahan).toHaveBeenCalledWith("b1"));
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("Hapus (confirm false) tidak memanggil deleteKirimBahan", () => {
    vi.stubGlobal(
      "confirm",
      vi.fn(() => false),
    );
    render(<CmtFullTab />);
    fireEvent.click(screen.getByText("Hapus"));
    expect(mockDeleteKirimBahan).not.toHaveBeenCalled();
  });

  it("gagal hapus -> toast.error", async () => {
    mockDeleteKirimBahan.mockRejectedValueOnce(new Error("gagal jaringan"));
    render(<CmtFullTab />);
    fireEvent.click(screen.getByText("Hapus"));
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("gagal jaringan")),
    );
  });
});
