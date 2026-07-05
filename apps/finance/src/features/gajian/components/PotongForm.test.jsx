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
vi.mock("./Modal", () => ({
  Modal: ({ title, onClose, children }) => (
    <div data-testid="modal">
      <span>{title}</span>
      <button onClick={onClose}>×</button>
      {children}
    </div>
  ),
  ModalFooter: ({ onCancel, saving, saveLabel = "Simpan" }) => (
    <div>
      <button type="button" onClick={onCancel} disabled={saving}>Batal</button>
      <button type="submit" disabled={saving}>{saving ? "Menyimpan..." : saveLabel}</button>
    </div>
  ),
}));
vi.mock("./TotalBar", () => ({
  default: ({ label, value }) => <div data-testid="total-bar">{value}</div>,
}));
vi.mock("./KaryawanSelect", () => ({
  default: ({ value, onChange }) => (
    <select data-testid="karyawan-select" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Pilih...</option>
      <option value="k1">BUDI</option>
    </select>
  ),
}));
vi.mock("./RangeSlider", () => ({
  default: ({ label, value, onChange }) => (
    <div>
      <span>{label}</span>
      <input type="range" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </div>
  ),
}));
vi.mock("../../pengaturan/hooks", () => ({
  useFinanceConfig: vi.fn(() => ({ config: { tarif_pola: 10000, tarif_sampel: 5000 } })),
}));
const mockSavePotong = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({ useSavePotong: vi.fn(() => mockSavePotong) }));
vi.mock("../utils", () => ({ calcUpahPotong: vi.fn(() => 80000) }));

import PotongForm from "./PotongForm";

beforeEach(() => { vi.clearAllMocks(); mockSavePotong.mockResolvedValue(undefined); });

describe("PotongForm", () => {
  it("renders Tambah Potong title", () => {
    render(<PotongForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Tambah Potong")).toBeInTheDocument();
  });

  it("shows error when no karyawan selected", async () => {
    render(<PotongForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Pilih karyawan."));
  });

  it("calls savePotong on valid submit", async () => {
    const onSave = vi.fn();
    render(<PotongForm gajianId="g1" karyawanList={[]} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("karyawan-select"), { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSavePotong).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });

  it("shows success toast", async () => {
    render(<PotongForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("karyawan-select"), { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Entri Potong disimpan."));
  });

  it("shows error toast on save failure", async () => {
    mockSavePotong.mockRejectedValueOnce(new Error("fail"));
    render(<PotongForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("karyawan-select"), { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: fail"));
  });
});
