import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("./FotoUpload", () => ({
  default: ({ value, onChange }) => (
    <div>
      <span data-testid="foto-value">{value || "no-foto"}</span>
      <button type="button" onClick={() => onChange("https://new-foto.jpg")}>Set Foto</button>
    </div>
  ),
}));

import BahanForm from "./BahanForm";

const today = new Date().toISOString().split("T")[0];

describe("BahanForm — pembelian mode", () => {
  it("renders Tambah button for new item (no initial)", () => {
    render(<BahanForm mode="pembelian" initial={null} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Tambah")).toBeInTheDocument();
  });

  it("renders Simpan Perubahan button when initial provided", () => {
    render(<BahanForm mode="pembelian" initial={{ nama_bahan: "X", jumlah: 5, satuan: "yard", jatuh_tempo: "2024-06-01" }} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Simpan Perubahan")).toBeInTheDocument();
  });

  it("shows satuan fixed as 'yard' for pembelian", () => {
    render(<BahanForm mode="pembelian" initial={null} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("yard")).toBeInTheDocument();
  });

  it("shows validation error when nama_bahan is empty on submit", async () => {
    const user = userEvent.setup();
    render(<BahanForm mode="pembelian" initial={null} onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByText("Tambah"));
    expect(screen.getByText("Nama bahan wajib diisi.")).toBeInTheDocument();
  });

  it("shows validation error when jumlah is 0 on submit", async () => {
    const user = userEvent.setup();
    render(<BahanForm mode="pembelian" initial={null} onSave={() => {}} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText("Cth: Wolfis, Sifon, Katun"), "Wolfis");
    await user.click(screen.getByText("Tambah"));
    expect(screen.getByText(/Jumlah harus lebih dari 0/)).toBeInTheDocument();
  });

  it("calls onSave with correct payload on valid submit", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<BahanForm mode="pembelian" initial={null} onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText("Cth: Wolfis, Sifon, Katun"), "Wolfis");
    await user.type(screen.getAllByPlaceholderText("0")[0], "5");
    await user.click(screen.getByText("Tambah"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(payload.nama_bahan).toBe("Wolfis");
    expect(payload.jumlah).toBe(5);
    expect(payload.satuan).toBe("yard");
  });

  it("calls onCancel when Batal clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<BahanForm mode="pembelian" initial={null} onSave={() => {}} onCancel={onCancel} />);
    await user.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows error from onSave exception", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("Server error"));
    render(<BahanForm mode="pembelian" initial={null} onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText("Cth: Wolfis, Sifon, Katun"), "Wolfis");
    await user.type(screen.getAllByPlaceholderText("0")[0], "5");
    await user.click(screen.getByText("Tambah"));
    await waitFor(() => expect(screen.getByText("Server error")).toBeInTheDocument());
  });

  it("updates jatuh_tempo when tanggal changes", () => {
    render(<BahanForm mode="pembelian" initial={null} onSave={() => {}} onCancel={() => {}} />);
    const dateInput = screen.getAllByDisplayValue(today)[0];
    // Use fireEvent.change to set full value at once (avoids per-char partial-date errors)
    fireEvent.change(dateInput, { target: { value: "2024-01-01" } });
    // addFourMonths("2024-01-01") = "2024-05-01"
    expect(screen.getAllByDisplayValue("2024-05-01").length).toBeGreaterThan(0);
  });

  it("prefills nama_bahan from initial", () => {
    render(<BahanForm mode="pembelian" initial={{ nama_bahan: "Sifon", jumlah: 3, satuan: "yard", jatuh_tempo: "2024-06-01" }} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByDisplayValue("Sifon")).toBeInTheDocument();
  });
});

describe("BahanForm — pinjam mode", () => {
  it("shows arah pinjam toggle (Masuk/Keluar)", () => {
    render(<BahanForm mode="pinjam" initial={null} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByText(/Masuk/)).toBeInTheDocument();
    expect(screen.getByText(/Keluar/)).toBeInTheDocument();
  });

  it("shows satuan select for pinjam", () => {
    render(<BahanForm mode="pinjam" initial={null} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByDisplayValue("meter")).toBeInTheDocument();
  });

  it("validates nama_pemberi when arah=masuk", async () => {
    const user = userEvent.setup();
    render(<BahanForm mode="pinjam" initial={null} onSave={() => {}} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText("Cth: Wolfis, Sifon, Katun"), "Wolfis");
    await user.type(screen.getAllByPlaceholderText("0")[0], "5");
    await user.click(screen.getByText("Tambah"));
    expect(screen.getByText(/Nama pemberi pinjaman wajib diisi/)).toBeInTheDocument();
  });

  it("validates nama_peminjam when arah=keluar", async () => {
    const user = userEvent.setup();
    render(<BahanForm mode="pinjam" initial={null} onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByText(/Keluar/));
    await user.type(screen.getByPlaceholderText("Cth: Wolfis, Sifon, Katun"), "Wolfis");
    await user.type(screen.getAllByPlaceholderText("0")[0], "5");
    await user.click(screen.getByText("Tambah"));
    expect(screen.getByText(/Nama peminjam wajib diisi/)).toBeInTheDocument();
  });

  it("includes arah_pinjam in onSave payload", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<BahanForm mode="pinjam" initial={null} onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText("Cth: Wolfis, Sifon, Katun"), "Wolfis");
    await user.type(screen.getAllByPlaceholderText("0")[0], "5");
    await user.type(screen.getByPlaceholderText("Nama supplier / toko"), "Toko A");
    await user.click(screen.getByText("Tambah"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ arah_pinjam: expect.any(String) })
    ));
  });
});
