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
vi.mock("../../pengaturan/hooks", () => ({
  useFinanceConfig: vi.fn(() => ({ config: { tarif_qc: 1500 } })),
}));
const mockSaveQC = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useProdukList: vi.fn(() => ({ produkList: [{ kode: "D-07-OSK", nama: "Gamis" }] })),
  useSaveQC: vi.fn(() => mockSaveQC),
}));

import QCForm from "./QCForm";

beforeEach(() => { vi.clearAllMocks(); mockSaveQC.mockResolvedValue(undefined); });

describe("QCForm", () => {
  it("renders Tambah QC title", () => {
    render(<QCForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Tambah QC")).toBeInTheDocument();
  });

  it("shows error when no karyawan selected", async () => {
    render(<QCForm gajianId="g1" karyawanList={[]} onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Pilih karyawan."));
  });

  it("calls saveQC on valid submit", async () => {
    const onSave = vi.fn();
    render(<QCForm gajianId="g1" karyawanList={[{ id: "k1", nama: "RINI", tim: "qc" }]} onSave={onSave} onClose={vi.fn()} />);
    const qcSelects = document.querySelectorAll("select");
    const karyawanSelect = [...qcSelects].find((s) => s.innerHTML.includes("RINI"));
    if (karyawanSelect) fireEvent.change(karyawanSelect, { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveQC).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });

  it("shows success toast", async () => {
    render(<QCForm gajianId="g1" karyawanList={[{ id: "k1", nama: "RINI", tim: "qc" }]} onSave={vi.fn()} onClose={vi.fn()} />);
    const karyawanSelect = [...document.querySelectorAll("select")].find((s) => s.innerHTML.includes("RINI"));
    if (karyawanSelect) fireEvent.change(karyawanSelect, { target: { value: "k1" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Entri QC disimpan."));
  });
});
