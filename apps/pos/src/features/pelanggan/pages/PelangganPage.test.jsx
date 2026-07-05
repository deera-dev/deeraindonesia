import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../hooks", () => ({
  usePelanggan: vi.fn(() => ({
    pelanggan: [],
    loading: false,
    reload: vi.fn(),
  })),
  addPelanggan: vi.fn().mockResolvedValue({ id: "np1" }),
  updatePelanggan: vi.fn().mockResolvedValue(undefined),
  deletePelanggan: vi.fn().mockResolvedValue(undefined),
  searchPelanggan: vi.fn().mockResolvedValue([]),
}));
vi.mock("../components/PelangganForm", () => ({
  default: ({ onSave, onCancel, saving }) => (
    <div data-testid="pelanggan-form">
      <button onClick={() => onSave({ nama: "BUDI", no_hp: "081", alamat: "" })}>Simpan</button>
      <button onClick={onCancel}>Batal</button>
      {saving && <span>Menyimpan...</span>}
    </div>
  ),
}));

import { usePelanggan, addPelanggan, updatePelanggan, deletePelanggan } from "../hooks";
import PelangganPage from "../pages/PelangganPage";

beforeEach(() => {
  vi.clearAllMocks();
  usePelanggan.mockReturnValue({ pelanggan: [], loading: false, reload: vi.fn() });
});

describe("PelangganPage", () => {
  it("shows empty message when no pelanggan", () => {
    render(<PelangganPage />);
    expect(screen.getByText("Belum ada pelanggan")).toBeInTheDocument();
  });

  it("shows loading text when loading=true", () => {
    usePelanggan.mockReturnValue({ pelanggan: [], loading: true, reload: vi.fn() });
    render(<PelangganPage />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("renders pelanggan list", () => {
    usePelanggan.mockReturnValue({
      pelanggan: [{ id: "p1", nama: "BUDI", no_hp: "081" }],
      loading: false,
      reload: vi.fn(),
    });
    render(<PelangganPage />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });

  it("shows add form when Tambah clicked", () => {
    render(<PelangganPage />);
    fireEvent.click(screen.getByText("Tambah"));
    expect(screen.getByTestId("pelanggan-form")).toBeInTheDocument();
  });

  it("calls addPelanggan and hides form on save", async () => {
    render(<PelangganPage />);
    fireEvent.click(screen.getByText("Tambah"));
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() => expect(addPelanggan).toHaveBeenCalledWith({ nama: "BUDI", no_hp: "081", alamat: "" }));
    await waitFor(() => expect(screen.queryByTestId("pelanggan-form")).not.toBeInTheDocument());
  });

  it("hides form when Batal clicked", () => {
    render(<PelangganPage />);
    fireEvent.click(screen.getByText("Tambah"));
    fireEvent.click(screen.getByText("Batal"));
    expect(screen.queryByTestId("pelanggan-form")).not.toBeInTheDocument();
  });

  it("shows edit form when Edit clicked", () => {
    usePelanggan.mockReturnValue({
      pelanggan: [{ id: "p1", nama: "BUDI", no_hp: "081" }],
      loading: false,
      reload: vi.fn(),
    });
    render(<PelangganPage />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("pelanggan-form")).toBeInTheDocument();
    expect(screen.getByText("Edit Pelanggan")).toBeInTheDocument();
  });

  it("calls updatePelanggan on edit save", async () => {
    usePelanggan.mockReturnValue({
      pelanggan: [{ id: "p1", nama: "BUDI", no_hp: "081" }],
      loading: false,
      reload: vi.fn(),
    });
    render(<PelangganPage />);
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() => expect(updatePelanggan).toHaveBeenCalledWith("p1", { nama: "BUDI", no_hp: "081", alamat: "" }));
  });

  it("shows delete confirm modal when × clicked", () => {
    usePelanggan.mockReturnValue({
      pelanggan: [{ id: "p1", nama: "BUDI" }],
      loading: false,
      reload: vi.fn(),
    });
    render(<PelangganPage />);
    fireEvent.click(screen.getByText("×"));
    expect(screen.getByText("Hapus Pelanggan?")).toBeInTheDocument();
  });

  it("calls deletePelanggan when Ya Hapus clicked", async () => {
    usePelanggan.mockReturnValue({
      pelanggan: [{ id: "p1", nama: "BUDI" }],
      loading: false,
      reload: vi.fn(),
    });
    render(<PelangganPage />);
    fireEvent.click(screen.getByText("×"));
    fireEvent.click(screen.getByText("Ya, Hapus"));
    await waitFor(() => expect(deletePelanggan).toHaveBeenCalledWith("p1"));
  });

  it("closes delete modal when Batal clicked", () => {
    usePelanggan.mockReturnValue({
      pelanggan: [{ id: "p1", nama: "BUDI" }],
      loading: false,
      reload: vi.fn(),
    });
    render(<PelangganPage />);
    fireEvent.click(screen.getByText("×"));
    const buttons = screen.getAllByText("Batal");
    fireEvent.click(buttons[buttons.length - 1]);
    expect(screen.queryByText("Hapus Pelanggan?")).not.toBeInTheDocument();
  });

  it("filters by search query", () => {
    usePelanggan.mockReturnValue({
      pelanggan: [
        { id: "p1", nama: "BUDI" },
        { id: "p2", nama: "SARI" },
      ],
      loading: false,
      reload: vi.fn(),
    });
    render(<PelangganPage />);
    fireEvent.change(screen.getByPlaceholderText("Cari nama atau no HP..."), { target: { value: "budi" } });
    expect(screen.getByText("BUDI")).toBeInTheDocument();
    expect(screen.queryByText("SARI")).not.toBeInTheDocument();
  });

  it("shows not found message when search has no match", () => {
    usePelanggan.mockReturnValue({
      pelanggan: [{ id: "p1", nama: "BUDI" }],
      loading: false,
      reload: vi.fn(),
    });
    render(<PelangganPage />);
    fireEvent.change(screen.getByPlaceholderText("Cari nama atau no HP..."), { target: { value: "zzz" } });
    expect(screen.getByText("Pelanggan tidak ditemukan")).toBeInTheDocument();
  });
});
