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
vi.mock("../../pengaturan/hooks", () => ({
  useFinanceConfig: vi.fn(() => ({
    config: { tarif_video: 50000, tarif_foto: 10000, tarif_logo: 20000 },
  })),
}));
const mockSaveKreatif = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({ useSaveKreatif: vi.fn(() => mockSaveKreatif) }));
vi.mock("../utils", () => ({ calcUpahKreatif: vi.fn(() => 150000) }));

import KreatifForm from "./KreatifForm";

beforeEach(() => { vi.clearAllMocks(); mockSaveKreatif.mockResolvedValue(undefined); });

describe("KreatifForm", () => {
  it("renders Tambah Kreatif title", () => {
    render(<KreatifForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Tambah Kreatif")).toBeInTheDocument();
  });

  it("shows error when no karyawan selected", async () => {
    render(<KreatifForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Pilih karyawan."));
  });

  it("calls saveKreatif on valid submit", async () => {
    const onSave = vi.fn();
    render(<KreatifForm gajianId="g1" karyawanList={[]} onSave={onSave} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("karyawan-select"), { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveKreatif).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });

  it("shows error toast when save fails", async () => {
    mockSaveKreatif.mockRejectedValueOnce(new Error("error"));
    render(<KreatifForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByTestId("karyawan-select"), { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: error"));
  });
});
