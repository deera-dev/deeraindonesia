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

const mockCreateKirim = vi.fn();
vi.mock("../hooks", () => ({
  useCreateKirimCmtJahit: () => ({ createKirim: mockCreateKirim, creating: false }),
}));

import KirimForm from "./KirimForm";

const PRODUCTS = [
  {
    kode: "D-01-OSK",
    nama: "Gamis A",
    variants: [{ size: "Midi" }, { size: "Gamis" }],
    warna: ["HITAM", "MERAH"],
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseProducts.mockReturnValue({ products: PRODUCTS, loading: false });
  mockCreateKirim.mockResolvedValue(undefined);
});

function fillRequiredFields() {
  fireEvent.change(screen.getByText("Nama Vendor *").nextSibling, {
    target: { value: "Vendor A" },
  });
  fireEvent.change(screen.getByText("Upah/pcs Sepakat *").nextSibling, {
    target: { value: "7000" },
  });
  fireEvent.change(screen.getByTestId("kirim-kode-0"), { target: { value: "D-01-OSK" } });
  const selects = document.querySelectorAll("select");
  fireEvent.change(selects[0], { target: { value: "Midi" } });
  fireEvent.change(selects[1], { target: { value: "HITAM" } });
  const qtyInput = document.querySelectorAll('input[type="number"]')[1];
  fireEvent.change(qtyInput, { target: { value: "10" } });
}

describe("KirimForm", () => {
  it("submit dgn data lengkap memanggil createKirim dgn items & user", async () => {
    const onClose = vi.fn();
    render(<KirimForm onClose={onClose} />);
    fillRequiredFields();
    fireEvent.click(screen.getByText("Kirim"));

    await vi.waitFor(() => expect(mockCreateKirim).toHaveBeenCalled());
    const args = mockCreateKirim.mock.calls[0][0];
    expect(args.namaVendor).toBe("Vendor A");
    expect(args.hargaUpah).toBe("7000");
    expect(args.items).toEqual([
      { kode_produk: "D-01-OSK", nama_produk: "Gamis A", size: "Midi", warna: "HITAM", qty: "10" },
    ]);
    expect(args.user).toEqual({ email: "a@b.com" });
    expect(mockToast.success).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("submit tanpa isi produk -> toast.error, tidak memanggil createKirim", () => {
    render(<KirimForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByText("Nama Vendor *").nextSibling, {
      target: { value: "Vendor A" },
    });
    fireEvent.change(screen.getByText("Upah/pcs Sepakat *").nextSibling, {
      target: { value: "7000" },
    });
    fireEvent.click(screen.getByText("Kirim"));
    expect(mockToast.error).toHaveBeenCalled();
    expect(mockCreateKirim).not.toHaveBeenCalled();
  });

  it("gagal createKirim -> toast.error, modal tidak ditutup", async () => {
    mockCreateKirim.mockRejectedValueOnce(new Error("gagal jaringan"));
    const onClose = vi.fn();
    render(<KirimForm onClose={onClose} />);
    fillRequiredFields();
    fireEvent.click(screen.getByText("Kirim"));
    await vi.waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("gagal jaringan")),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("+ Tambah produk menambah baris produk baru", () => {
    render(<KirimForm onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("+ Tambah produk"));
    expect(screen.getByTestId("kirim-kode-1")).toBeInTheDocument();
  });

  it("klik × atau Batal memanggil onClose", () => {
    const onClose = vi.fn();
    render(<KirimForm onClose={onClose} />);
    fireEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });
});
