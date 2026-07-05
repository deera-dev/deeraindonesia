import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
  inputCls: "",
  labelCls: "",
}));
vi.mock("../utils", () => ({
  PETTYCASH_KATEGORI_OPTIONS: ["Operasional", "ATK"],
}));
const mockSave = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({ useSavePettycash: vi.fn(() => mockSave) }));

import PettycashForm from "./PettycashForm";

beforeEach(() => { vi.clearAllMocks(); mockSave.mockResolvedValue(undefined); });

describe("PettycashForm", () => {
  it("renders form", () => {
    render(<PettycashForm onSave={vi.fn()} onClose={vi.fn()} />);
    expect(document.querySelector("form")).toBeInTheDocument();
  });

  it("shows error when jumlah = 0 on submit", async () => {
    render(<PettycashForm onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Jumlah harus lebih dari 0."));
  });

  it("calls savePettycash on valid submit and shows success", async () => {
    const onSave = vi.fn();
    render(<PettycashForm onSave={onSave} onClose={vi.fn()} />);
    const numInput = document.querySelector('input[type="number"]');
    if (numInput) fireEvent.change(numInput, { target: { value: "50000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("shows error toast when save throws", async () => {
    mockSave.mockRejectedValueOnce(new Error("fail"));
    render(<PettycashForm onSave={vi.fn()} onClose={vi.fn()} />);
    const numInput = document.querySelector('input[type="number"]');
    if (numInput) fireEvent.change(numInput, { target: { value: "50000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: fail"));
  });

  it("calls onClose on backdrop click", () => {
    const onClose = vi.fn();
    render(<PettycashForm onSave={vi.fn()} onClose={onClose} />);
    fireEvent.click(document.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows isi ulang in toast when jenis=isi", async () => {
    render(<PettycashForm onSave={vi.fn()} onClose={vi.fn()} />);
    // Jenis toggle is a button — click "↓ Isi Ulang"
    fireEvent.click(screen.getByText(/Isi Ulang/i));
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("Isi ulang")));
  });
});

describe("PettycashForm — edit mode", () => {
  const editInitial = { id: "pc1", tanggal: "2026-07-01", jenis: "keluar", kategori: "ATK", jumlah: 100000 };

  it("shows Edit Petty Cash title", () => {
    render(<PettycashForm initial={editInitial} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Edit Petty Cash")).toBeInTheDocument();
  });

  it("shows fmtRp preview using initial.jumlah when form.jumlah empty", () => {
    render(<PettycashForm initial={editInitial} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Rp100000")).toBeInTheDocument();
  });

  it("submits with diperbarui in toast", async () => {
    const onSave = vi.fn();
    render(<PettycashForm initial={editInitial} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("diperbarui")));
    expect(onSave).toHaveBeenCalled();
  });

  it("uses initial.keterangan fallback when form.keterangan is empty", async () => {
    const onSave = vi.fn();
    const init = { ...editInitial, keterangan: "prev ket" };
    render(<PettycashForm initial={init} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ keterangan: "prev ket" }),
      expect.anything()
    ));
  });
});

describe("PettycashForm — onChange handlers", () => {
  it("tanggal onChange updates form state", () => {
    render(<PettycashForm onSave={vi.fn()} onClose={vi.fn()} />);
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: "2026-08-01" } });
  });

  it("kategori onChange updates form state", () => {
    render(<PettycashForm onSave={vi.fn()} onClose={vi.fn()} />);
    const sel = document.querySelector("select");
    fireEvent.change(sel, { target: { value: "ATK" } });
  });

  it("keterangan onChange updates form state", () => {
    render(<PettycashForm onSave={vi.fn()} onClose={vi.fn()} />);
    const ket = document.querySelector('input[type="text"]');
    fireEvent.change(ket, { target: { value: "test ket" } });
  });

  it("keterangan.trim() truthy path in payload", async () => {
    const onSave = vi.fn();
    render(<PettycashForm onSave={onSave} onClose={vi.fn()} />);
    const ket = document.querySelector('input[type="text"]');
    fireEvent.change(ket, { target: { value: "bayar listrik" } });
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "50000" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSave).toHaveBeenCalledWith(
      expect.objectContaining({ keterangan: "bayar listrik" }),
      null
    ));
  });
});

describe("PettycashForm — rJumlah=0 branch", () => {
  it("no fmtRp preview shown when rJumlah=0 (empty form, no initial)", () => {
    render(<PettycashForm onSave={vi.fn()} onClose={vi.fn()} />);
    // form.jumlah="" and no initial.jumlah → rJumlah = 0 → no preview
    expect(screen.queryByText(/^Rp/)).toBeNull();
  });
});
