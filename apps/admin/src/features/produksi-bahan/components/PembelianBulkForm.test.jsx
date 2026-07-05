import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("./FotoUpload", () => ({
  default: ({ onChange }) => (
    <button type="button" onClick={() => onChange("https://foto.jpg")}>Set Foto</button>
  ),
}));

import PembelianBulkForm from "./PembelianBulkForm";

describe("PembelianBulkForm", () => {
  it("renders with one initial row", () => {
    render(<PembelianBulkForm onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByText("Bahan 1")).toBeInTheDocument();
  });

  it("adds a new row when '+ Tambah Baris' clicked", async () => {
    const user = userEvent.setup();
    render(<PembelianBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByText("+ Tambah Baris"));
    expect(screen.getByText("Bahan 2")).toBeInTheDocument();
  });

  it("removes a row when × clicked (when > 1 row)", async () => {
    const user = userEvent.setup();
    render(<PembelianBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByText("+ Tambah Baris"));
    expect(screen.getByText("Bahan 2")).toBeInTheDocument();
    // × button for the second row
    const removeButtons = screen.getAllByText("×");
    await user.click(removeButtons[0]);
    expect(screen.queryByText("Bahan 2")).not.toBeInTheDocument();
  });

  it("does NOT show × for single row", () => {
    render(<PembelianBulkForm onSave={() => {}} onCancel={() => {}} />);
    // When there's only 1 row, remove button should not be visible
    const removeButtons = screen.queryAllByText("×");
    expect(removeButtons).toHaveLength(0);
  });

  it("shows validation error when no valid rows on submit", async () => {
    const user = userEvent.setup();
    render(<PembelianBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.click(screen.getByText(/Simpan/));
    expect(screen.getByText(/Isi minimal 1 bahan/)).toBeInTheDocument();
  });

  it("calls onSave with valid rows on submit", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<PembelianBulkForm onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText(/Nama bahan/), "Wolfis");
    await user.type(screen.getAllByPlaceholderText("0")[0], "5");
    await user.click(screen.getByText(/Simpan/));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    const payload = onSave.mock.calls[0][0];
    expect(Array.isArray(payload)).toBe(true);
    expect(payload[0].nama_bahan).toBe("Wolfis");
    expect(payload[0].jumlah).toBe(5);
    expect(payload[0].satuan).toBe("yard");
    expect(payload[0].status_bayar).toBe("belum");
  });

  it("calls onCancel when Batal clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<PembelianBulkForm onSave={() => {}} onCancel={onCancel} />);
    await user.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("shows grand total when jumlah + harga entered", async () => {
    const user = userEvent.setup();
    render(<PembelianBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText(/Nama bahan/), "Wolfis");
    await user.type(screen.getAllByPlaceholderText("0")[0], "10");
    await user.type(screen.getAllByPlaceholderText("0")[1], "15000");
    await waitFor(() => expect(screen.getByText("Total Keseluruhan")).toBeInTheDocument());
  });

  it("updates jatuh_tempo when tanggal changes", async () => {
    render(<PembelianBulkForm onSave={() => {}} onCancel={() => {}} />);
    const tanggalInput = screen.getAllByDisplayValue(/.+/)[0];
    // Use fireEvent.change (sets full value at once) to avoid intermediate
    // partial-string onChange calls that cause RangeError in addFourMonths
    fireEvent.change(tanggalInput, { target: { value: "2024-01-01" } });
    await waitFor(() => {
      const jtInput = screen.getByDisplayValue("2024-05-01");
      expect(jtInput).toBeInTheDocument();
    });
  });

  it("shows error from onSave exception", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockRejectedValue(new Error("DB error"));
    render(<PembelianBulkForm onSave={onSave} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText(/Nama bahan/), "Wolfis");
    await user.type(screen.getAllByPlaceholderText("0")[0], "5");
    await user.click(screen.getByText(/Simpan/));
    await waitFor(() => expect(screen.getByText("DB error")).toBeInTheDocument());
  });

  it("button text shows count of named rows", async () => {
    const user = userEvent.setup();
    render(<PembelianBulkForm onSave={() => {}} onCancel={() => {}} />);
    await user.type(screen.getByPlaceholderText(/Nama bahan/), "Wolfis");
    expect(screen.getByText(/Simpan 1 Bahan/)).toBeInTheDocument();
  });
});
