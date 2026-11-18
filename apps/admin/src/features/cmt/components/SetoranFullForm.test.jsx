import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));

vi.mock("@deera/shared/features/auth/hooks", () => ({
  useAuth: () => ({ user: { email: "a@b.com" } }),
}));

const mockUseProducts = vi.fn();
vi.mock("@deera/shared/features/products/hooks", () => ({
  useProducts: (...a) => mockUseProducts(...a),
}));

const mockCreateSetoranFull = vi.fn();
vi.mock("../hooks", () => ({
  useCreateSetoranFull: () => ({ createSetoranFull: mockCreateSetoranFull, creating: false }),
}));

import SetoranFullForm from "./SetoranFullForm";

const PRODUCTS = [
  {
    kode: "D-02-SFN",
    nama: "Mukena B",
    variants: [{ size: "Midi" }, { size: "Gamis" }],
    warna: ["HITAM", "MERAH"],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseProducts.mockReturnValue({ products: PRODUCTS, loading: false });
  mockCreateSetoranFull.mockResolvedValue(undefined);
});

function fillRequiredFields() {
  fireEvent.change(screen.getByText("Nama Vendor *").nextSibling, {
    target: { value: "Vendor B" },
  });
  fireEvent.change(screen.getByPlaceholderText("— Pilih/cari kode —"), {
    target: { value: "D-02-SFN" },
  });
  fireEvent.change(screen.getByText("Upah/pcs (opsional — bisa diisi nanti)").nextSibling, {
    target: { value: "10000" },
  });
  const selects = document.querySelectorAll("select");
  fireEvent.change(selects[0], { target: { value: "Midi" } });
  fireEvent.change(selects[1], { target: { value: "HITAM" } });
  const qtyInput = document.querySelectorAll('input[type="number"]')[1];
  fireEvent.change(qtyInput, { target: { value: "5" } });
}

describe("SetoranFullForm", () => {
  it("submit dgn data lengkap memanggil createSetoranFull & menampilkan total upah", async () => {
    const onClose = vi.fn();
    render(<SetoranFullForm onClose={onClose} />);
    fillRequiredFields();

    expect(screen.getByText(/Total Upah/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Simpan & Tambah Stok"));

    await vi.waitFor(() => expect(mockCreateSetoranFull).toHaveBeenCalled());
    const args = mockCreateSetoranFull.mock.calls[0][0];
    expect(args.namaVendor).toBe("Vendor B");
    expect(args.kodeProduk).toBe("D-02-SFN");
    expect(args.namaProduk).toBe("Mukena B");
    expect(args.hargaUpah).toBe("10000");
    expect(args.items).toEqual([{ size: "Midi", warna: "HITAM", qty: "5" }]);
    expect(args.user).toEqual({ email: "a@b.com" });
    expect(mockToast.success).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("gagal createSetoranFull -> toast.error, modal tidak ditutup", async () => {
    mockCreateSetoranFull.mockRejectedValueOnce(new Error("gagal jaringan"));
    const onClose = vi.fn();
    render(<SetoranFullForm onClose={onClose} />);
    fillRequiredFields();
    fireEvent.click(screen.getByText("Simpan & Tambah Stok"));
    await vi.waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("gagal jaringan")),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("+ Tambah baris menambah baris breakdown baru", () => {
    render(<SetoranFullForm onClose={vi.fn()} />);
    expect(document.querySelectorAll("select").length).toBe(2);
    fireEvent.click(screen.getByText("+ Tambah baris"));
    expect(document.querySelectorAll("select").length).toBe(4);
  });

  it("klik Batal memanggil onClose", () => {
    const onClose = vi.fn();
    render(<SetoranFullForm onClose={onClose} />);
    fireEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("upah TIDAK wajib -- submit tanpa isi upah tetap jalan (bisa diisi nanti)", async () => {
    render(<SetoranFullForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByText("Nama Vendor *").nextSibling, {
      target: { value: "Vendor B" },
    });
    fireEvent.change(screen.getByPlaceholderText("— Pilih/cari kode —"), {
      target: { value: "D-02-SFN" },
    });
    const selects = document.querySelectorAll("select");
    fireEvent.change(selects[0], { target: { value: "Midi" } });
    fireEvent.change(selects[1], { target: { value: "HITAM" } });
    fireEvent.change(document.querySelectorAll('input[type="number"]')[1], {
      target: { value: "5" },
    });

    fireEvent.click(screen.getByText("Simpan & Tambah Stok"));
    await vi.waitFor(() => expect(mockCreateSetoranFull).toHaveBeenCalled());
    expect(mockCreateSetoranFull.mock.calls[0][0].hargaUpah).toBe("");
  });
});
