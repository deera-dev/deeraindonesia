import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => ({ user: { email: "a@b.com" } }),
}));

const mockCreateKirimBahan = vi.fn();
vi.mock("../hooks", () => ({
  useCreateCmtFullKirim: () => ({ createKirimBahan: mockCreateKirimBahan, creating: false }),
}));

import KirimBahanForm from "./KirimBahanForm";

beforeEach(() => {
  vi.clearAllMocks();
  mockCreateKirimBahan.mockResolvedValue(undefined);
});

function fillBahanRow(namaBahan, jumlah) {
  fireEvent.change(screen.getByPlaceholderText("Nama bahan (cth: Wolfis)"), {
    target: { value: namaBahan },
  });
  fireEvent.change(screen.getByPlaceholderText("Jumlah"), { target: { value: jumlah } });
}

describe("KirimBahanForm", () => {
  it("TIDAK ada field kode produk / ukuran / warna sama sekali -- cuma bahan & yard", () => {
    render(<KirimBahanForm onClose={vi.fn()} />);
    expect(screen.queryByPlaceholderText(/pilih\/cari kode/i)).toBeNull();
    expect(document.querySelectorAll('input[type="text"]').length).toBe(4); // vendor, nama bahan, kode bahan, catatan
    expect(screen.getByPlaceholderText("Kode bahan (opsional)")).toBeInTheDocument();
  });

  it("submit dgn data lengkap memanggil createKirimBahan dgn bahan & user", async () => {
    const onClose = vi.fn();
    render(<KirimBahanForm onClose={onClose} />);
    fireEvent.change(screen.getByText("Nama Vendor *").nextSibling, {
      target: { value: "Vendor C" },
    });
    fillBahanRow("Wolfis", "50");
    fireEvent.click(screen.getByText("Kirim"));

    await waitFor(() => expect(mockCreateKirimBahan).toHaveBeenCalled());
    const args = mockCreateKirimBahan.mock.calls[0][0];
    expect(args.namaVendor).toBe("Vendor C");
    expect(args.bahan).toEqual([
      { nama_bahan: "Wolfis", kode_bahan: "", satuan: "yard", jumlah: "50" },
    ]);
    expect(args.user).toEqual({ email: "a@b.com" });
    expect(mockToast.success).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("submit tanpa isi bahan -> toast.error, tidak memanggil createKirimBahan", () => {
    render(<KirimBahanForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByText("Nama Vendor *").nextSibling, {
      target: { value: "Vendor C" },
    });
    fireEvent.click(screen.getByText("Kirim"));
    expect(mockToast.error).toHaveBeenCalled();
    expect(mockCreateKirimBahan).not.toHaveBeenCalled();
  });

  it("gagal createKirimBahan -> toast.error, modal tidak ditutup", async () => {
    mockCreateKirimBahan.mockRejectedValueOnce(new Error("gagal jaringan"));
    const onClose = vi.fn();
    render(<KirimBahanForm onClose={onClose} />);
    fireEvent.change(screen.getByText("Nama Vendor *").nextSibling, {
      target: { value: "Vendor C" },
    });
    fillBahanRow("Wolfis", "50");
    fireEvent.click(screen.getByText("Kirim"));
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("gagal jaringan")),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("+ Tambah bahan menambah baris bahan baru", () => {
    render(<KirimBahanForm onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Tambah bahan"));
    expect(screen.getAllByPlaceholderText("Nama bahan (cth: Wolfis)")).toHaveLength(2);
  });

  it("klik Batal memanggil onClose", () => {
    const onClose = vi.fn();
    render(<KirimBahanForm onClose={onClose} />);
    fireEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });
});
