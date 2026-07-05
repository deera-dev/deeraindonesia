import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PelangganForm from "./PelangganForm";

describe("PelangganForm", () => {
  it("renders name input", () => {
    render(<PelangganForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} saving={false} />);
    expect(screen.getByPlaceholderText("IBU SARI")).toBeInTheDocument();
  });

  it("pre-fills existing pelanggan data", () => {
    render(<PelangganForm initial={{ nama: "BUDI", no_hp: "081" }} onSave={vi.fn()} onCancel={vi.fn()} saving={false} />);
    expect(screen.getByDisplayValue("BUDI")).toBeInTheDocument();
    expect(screen.getByDisplayValue("081")).toBeInTheDocument();
  });

  it("calls onSave with nama when submitted", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<PelangganForm initial={null} onSave={onSave} onCancel={vi.fn()} saving={false} />);
    fireEvent.change(screen.getByPlaceholderText("IBU SARI"), { target: { value: "WIDARI" } });
    fireEvent.submit(screen.getByRole("button", { name: /Simpan/i }).closest("form") ?? document.querySelector("form"));
    await waitFor(() => expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ nama: "WIDARI" })));
  });

  it("shows error when nama is empty", async () => {
    render(<PelangganForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} saving={false} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(screen.getByText("Nama wajib diisi")).toBeInTheDocument());
  });

  it("calls onCancel when Batal clicked", () => {
    const onCancel = vi.fn();
    render(<PelangganForm initial={null} onSave={vi.fn()} onCancel={onCancel} saving={false} />);
    fireEvent.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows Menyimpan when saving=true", () => {
    render(<PelangganForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} saving={true} />);
    expect(screen.getByText("Menyimpan...")).toBeInTheDocument();
  });

  it("uppercases name input", () => {
    render(<PelangganForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} saving={false} />);
    const nameInput = screen.getByPlaceholderText("IBU SARI");
    fireEvent.change(nameInput, { target: { value: "budi" } });
    expect(nameInput.value).toBe("BUDI");
  });
});
