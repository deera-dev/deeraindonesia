import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/lib/format", () => ({
  inputCls: "input-cls",
  labelCls: "label-cls",
}));
vi.mock("../utils", () => ({
  TIM_OPTIONS: [
    { value: "jahit", label: "Tim Jahit" },
    { value: "potong", label: "Tim Potong" },
  ],
}));
const mockSaveKaryawan = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useSaveKaryawan: vi.fn(() => mockSaveKaryawan),
}));

import KaryawanForm from "./KaryawanForm";

beforeEach(() => { vi.clearAllMocks(); mockSaveKaryawan.mockResolvedValue(undefined); });

function renderForm(initial = undefined) {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<KaryawanForm initial={initial} onSave={onSave} onClose={onClose} />);
  return { onSave, onClose };
}

describe("KaryawanForm", () => {
  it("renders Tambah Karyawan title when no initial", () => {
    renderForm();
    expect(screen.getByText("Tambah Karyawan")).toBeInTheDocument();
  });

  it("renders Edit Karyawan title when initial provided", () => {
    renderForm({ id: "k1", nama: "BUDI", tim: "jahit", aktif: true });
    expect(screen.getByText("Edit Karyawan")).toBeInTheDocument();
  });

  it("renders Simpan button", () => {
    renderForm();
    expect(screen.getByRole("button", { name: "Simpan" })).toBeInTheDocument();
  });

  it("shows toast error when nama empty on submit", async () => {
    renderForm();
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Nama wajib diisi."));
  });

  it("calls saveKaryawan on valid submit", async () => {
    const { onSave } = renderForm();
    fireEvent.change(screen.getByPlaceholderText("NAMA LENGKAP"), { target: { value: "ANI" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(mockSaveKaryawan).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });

  it("shows success toast after save", async () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText("NAMA LENGKAP"), { target: { value: "ANI" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
  });

  it("shows error toast when save throws", async () => {
    mockSaveKaryawan.mockRejectedValueOnce(new Error("Network error"));
    renderForm();
    fireEvent.change(screen.getByPlaceholderText("NAMA LENGKAP"), { target: { value: "ANI" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal menyimpan: Network error"));
  });

  it("calls onClose when Batal clicked", () => {
    const { onClose } = renderForm();
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when × clicked", () => {
    const { onClose } = renderForm();
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const { onClose } = renderForm();
    fireEvent.click(document.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("toggles aktif state when toggle div clicked", () => {
    renderForm();
    expect(screen.getByText("Aktif")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".rounded-full.flex.items-center"));
    expect(screen.getByText("Tidak Aktif")).toBeInTheDocument();
  });
});

// Additional field + branch coverage
describe("KaryawanForm — field changes and edit mode", () => {
  it("changes tim field", () => {
    renderForm();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "potong" } });
    expect(screen.getByRole("combobox").value).toBe("potong");
  });

  it("changes no_rekening field", () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText("Nomor rekening bank"), { target: { value: "99887766" } });
    expect(screen.getByPlaceholderText("Nomor rekening bank").value).toBe("99887766");
  });

  it("changes nama_bank field", () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText("BCA / BNI / Mandiri / ..."), { target: { value: "BNI" } });
    expect(screen.getByPlaceholderText("BCA / BNI / Mandiri / ...").value).toBe("BNI");
  });

  it("calls saveKaryawan with no_rekening value when field is non-empty", async () => {
    const { onSave } = renderForm();
    fireEvent.change(screen.getByPlaceholderText("NAMA LENGKAP"), { target: { value: "ANI" } });
    fireEvent.change(screen.getByPlaceholderText("Nomor rekening bank"), { target: { value: "12345" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => {
      const call = mockSaveKaryawan.mock.calls[0][0];
      expect(call.no_rekening).toBe("12345");
    });
  });

  it("shows Edit Karyawan toast on valid submit in edit mode", async () => {
    const initial = { id: "k1", nama: "BUDI", tim: "jahit", no_rekening: "", nama_bank: "", aktif: true };
    renderForm(initial);
    fireEvent.change(screen.getByPlaceholderText("NAMA LENGKAP"), { target: { value: "BUDI EDIT" } });
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() =>
      expect(mockToast.success).toHaveBeenCalledWith("BUDI EDIT berhasil diperbarui.")
    );
    expect(mockSaveKaryawan).toHaveBeenCalledWith(
      expect.objectContaining({ nama: "BUDI EDIT" }),
      initial
    );
  });
});
