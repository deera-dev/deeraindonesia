import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("./FotoUpload", () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange("https://foto.jpg")}>Set Foto</button>
  ),
}));

import PinjamBulkForm from "./PinjamBulkForm";

describe("PinjamBulkForm", () => {
  it("renders with arah masuk selected by default", () => {
    render(<PinjamBulkForm onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByText(/Pihak lain meminjamkan ke Deera/)).toBeInTheDocument();
  });

  it("shows Nama Pemberi field when arah=masuk", () => {
    render(<PinjamBulkForm onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByPlaceholderText("Nama supplier / toko")).toBeInTheDocument();
  });

  it("switches to Nama Peminjam field when keluar clicked", async () => {
    const user = userEvent.setup();
    render(<PinjamBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByText(/Keluar/));
    expect(screen.getByPlaceholderText("Nama pihak yang meminjam")).toBeInTheDocument();
  });

  it("shows validation error for missing nama_pemberi when masuk", async () => {
    const user = userEvent.setup();
    render(<PinjamBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText(/Nama bahan/), "Wolfis");
    await user.type(screen.getAllByPlaceholderText("0")[0], "5");
    await user.click(screen.getByText(/Simpan/));
    expect(screen.getByText(/Nama pemberi pinjaman wajib diisi/)).toBeInTheDocument();
  });

  it("shows validation error for missing nama_peminjam when keluar", async () => {
    const user = userEvent.setup();
    render(<PinjamBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByText(/Keluar/));
    await user.type(screen.getByPlaceholderText(/Nama bahan/), "Wolfis");
    await user.type(screen.getAllByPlaceholderText("0")[0], "5");
    await user.click(screen.getByText(/Simpan/));
    expect(screen.getByText(/Nama peminjam wajib diisi/)).toBeInTheDocument();
  });

  it("shows error when no valid rows", async () => {
    const user = userEvent.setup();
    render(<PinjamBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText("Nama supplier / toko"), "Toko A");
    await user.click(screen.getByText(/Simpan/));
    expect(screen.getByText(/Isi minimal 1 bahan/)).toBeInTheDocument();
  });

  it("calls onSave with correct payload", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<PinjamBulkForm onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText("Nama supplier / toko"), "Toko A");
    await user.type(screen.getByPlaceholderText(/Nama bahan/), "Sifon");
    await user.type(screen.getAllByPlaceholderText("0")[0], "3");
    await user.click(screen.getByText(/Simpan/));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const [payload] = onSave.mock.calls[0];
    expect(Array.isArray(payload)).toBe(true);
    expect(payload[0].nama_bahan).toBe("Sifon");
    expect(payload[0].arah_pinjam).toBe("masuk");
    expect(payload[0].nama_pemberi).toBe("Toko A");
    expect(payload[0].status_bayar).toBe("belum");
  });

  it("calls onCancel when Batal clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<PinjamBulkForm onSave={() => {}} onCancel={onCancel} />);
    await user.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("adds row when + Tambah Baris clicked", async () => {
    const user = userEvent.setup();
    render(<PinjamBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByText("+ Tambah Baris"));
    expect(screen.getByText("Bahan 2")).toBeInTheDocument();
  });

  it("removes row when × clicked (multiple rows)", async () => {
    const user = userEvent.setup();
    render(<PinjamBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByText("+ Tambah Baris"));
    const remove = screen.getAllByText("×")[0];
    await user.click(remove);
    expect(screen.queryByText("Bahan 2")).not.toBeInTheDocument();
  });

  it("shows grand total when jumlah + harga entered", async () => {
    const user = userEvent.setup();
    render(<PinjamBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText(/Nama bahan/), "Wolfis");
    await user.type(screen.getAllByPlaceholderText("0")[0], "5");
    await user.type(screen.getAllByPlaceholderText("0")[1], "10000");
    await waitFor(() => expect(screen.getByText("Total Keseluruhan")).toBeInTheDocument());
  });

  it("shows error from onSave exception", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<PinjamBulkForm onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText("Nama supplier / toko"), "A");
    await user.type(screen.getByPlaceholderText(/Nama bahan/), "X");
    await user.type(screen.getAllByPlaceholderText("0")[0], "1");
    await user.click(screen.getByText("Simpan"));
    await waitFor(() => expect(screen.getByText(/Network error/)).toBeInTheDocument());
  });
});
