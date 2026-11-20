import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));

const mockUseProducts = vi.fn();
vi.mock("@deera/shared/features/products/hooks", () => ({
  useProducts: (...a) => mockUseProducts(...a),
}));

const mockCreateKirim = vi.fn();
const mockFetchPotongan = vi.fn();
vi.mock("../hooks", () => ({
  useCreateKirimCmtJahit: () => ({ createKirim: mockCreateKirim, creating: false }),
  useAvailablePotongan: () => ({ fetchPotongan: mockFetchPotongan, fetching: false }),
}));

import KirimForm from "./KirimForm";

const PRODUCTS = [{ kode: "D-01-OSK", nama: "Gamis A" }];
const CARDS = [
  {
    id: "c1",
    kode_produk: "D-01-OSK",
    nama_produk: "Gamis A",
    size: "Midi",
    warna: "HITAM",
    qty: 10,
  },
  {
    id: "c2",
    kode_produk: "D-01-OSK",
    nama_produk: "Gamis A",
    size: "Midi",
    warna: "PUTIH",
    qty: 4,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockUseProducts.mockReturnValue({ products: PRODUCTS, loading: false });
  mockCreateKirim.mockResolvedValue(undefined);
  mockFetchPotongan.mockResolvedValue(CARDS);
});

async function pickKode() {
  fireEvent.change(screen.getByTestId("kirim-kode-0"), { target: { value: "D-01-OSK" } });
  await waitFor(() => expect(mockFetchPotongan).toHaveBeenCalledWith("D-01-OSK"));
}

describe("KirimForm", () => {
  it("pilih kode mengambil buku potongan otomatis & menampilkannya read-only (bukan input manual)", async () => {
    render(<KirimForm onClose={vi.fn()} />);
    await pickKode();

    expect(await screen.findByText(/Midi · HITAM — 10 pcs/)).toBeInTheDocument();
    expect(screen.getByText(/Midi · PUTIH — 4 pcs/)).toBeInTheDocument();
    expect(document.querySelectorAll("select").length).toBe(0); // tidak ada dropdown warna
    expect(document.querySelectorAll('input[type="number"]').length).toBe(1); // cuma upah
  });

  it("kode tanpa potongan tersedia -> pesan peringatan, tidak ada baris qty", async () => {
    mockFetchPotongan.mockResolvedValueOnce([]);
    render(<KirimForm onClose={vi.fn()} />);
    await pickKode();

    expect(await screen.findByText(/Tidak ada potongan tersedia/)).toBeInTheDocument();
  });

  it("submit mengirim semua kartu yang terkumpul dari buku potongan, upah opsional", async () => {
    const onClose = vi.fn();
    render(<KirimForm onClose={onClose} />);
    await pickKode();
    await screen.findByText(/Midi · HITAM — 10 pcs/);

    fireEvent.change(screen.getByText("Nama Vendor *").nextSibling, {
      target: { value: "Vendor A" },
    });
    fireEvent.change(screen.getByText("Tgl Kirim *").nextSibling, {
      target: { value: "2026-11-18" },
    });
    fireEvent.click(screen.getByText("Kirim"));

    await waitFor(() => expect(mockCreateKirim).toHaveBeenCalled());
    const args = mockCreateKirim.mock.calls[0][0];
    expect(args.namaVendor).toBe("Vendor A");
    expect(args.hargaUpah).toBe("");
    expect(args.cards).toEqual(CARDS);
    expect(mockToast.success).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("belum pilih kode sama sekali -> submit toast.error, tidak memanggil createKirim", () => {
    render(<KirimForm onClose={vi.fn()} />);
    fireEvent.change(screen.getByText("Nama Vendor *").nextSibling, {
      target: { value: "Vendor A" },
    });
    fireEvent.click(screen.getByText("Kirim"));
    expect(mockToast.error).toHaveBeenCalled();
    expect(mockCreateKirim).not.toHaveBeenCalled();
  });

  it("gagal createKirim -> toast.error, modal tidak ditutup", async () => {
    mockCreateKirim.mockRejectedValueOnce(new Error("gagal jaringan"));
    const onClose = vi.fn();
    render(<KirimForm onClose={onClose} />);
    await pickKode();
    await screen.findByText(/Midi · HITAM — 10 pcs/);
    fireEvent.change(screen.getByText("Nama Vendor *").nextSibling, {
      target: { value: "Vendor A" },
    });
    fireEvent.click(screen.getByText("Kirim"));
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("gagal jaringan")),
    );
    expect(onClose).not.toHaveBeenCalled();
  });

  it("gagal ambil buku potongan -> toast.error, blok itu dianggap kosong", async () => {
    mockFetchPotongan.mockRejectedValueOnce(new Error("db down"));
    render(<KirimForm onClose={vi.fn()} />);
    await pickKode();
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("db down")),
    );
  });

  it("+ Tambah produk menambah blok kode baru", () => {
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
