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
const mockSaveCmt = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({ useSaveCmt: vi.fn(() => mockSaveCmt) }));

import CmtForm from "./CmtForm";

beforeEach(() => { vi.clearAllMocks(); mockSaveCmt.mockResolvedValue(undefined); });

describe("CmtForm", () => {
  it("renders Tambah CMT title", () => {
    render(<CmtForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Tambah CMT")).toBeInTheDocument();
  });

  it("renders Edit CMT title when initial provided", () => {
    render(<CmtForm gajianId="g1" initial={{ id: "c1" }} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Edit CMT")).toBeInTheDocument();
  });

  it("calls saveCmt on form submit", async () => {
    const onSave = vi.fn();
    render(<CmtForm gajianId="g1" onSave={onSave} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockSaveCmt).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalled();
  });

  it("shows success toast after save", async () => {
    render(<CmtForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Entri CMT disimpan."));
  });

  it("shows error toast when save throws", async () => {
    mockSaveCmt.mockRejectedValueOnce(new Error("DB error"));
    render(<CmtForm gajianId="g1" onSave={vi.fn()} onClose={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: DB error"));
  });

  it("calls onClose when × clicked", () => {
    const onClose = vi.fn();
    render(<CmtForm gajianId="g1" onSave={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when Batal clicked", () => {
    const onClose = vi.fn();
    render(<CmtForm gajianId="g1" onSave={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });
});
