import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
}));
vi.mock("./TabHeader", () => ({
  default: ({ title, onAdd }) => (
    <div><span>{title}</span>{onAdd && <button onClick={onAdd}>+ Tambah</button>}</div>
  ),
}));
vi.mock("./EntryCard", () => ({
  default: ({ nama, amount, onEdit, onDelete }) => (
    <div data-testid={`entry-${nama}`}>
      <span>{nama}</span>
      <button onClick={onEdit}>Edit</button>
      <button onClick={onDelete}>Del</button>
    </div>
  ),
}));
vi.mock("./TotalBar", () => ({
  default: ({ label, value }) => <div data-testid="total-bar">{label}:{value}</div>,
}));
vi.mock("./QCForm", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="qc-form">
      <button onClick={onClose}>Close</button>
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));
const mockDeleteQC = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useQC: vi.fn(() => ({
    rows: [
      { id: "q1", karyawan: { nama: "RINI" }, nama_produk: "D-07-OSK", jumlah_pcs: 50, total_upah: 75000 },
    ],
    loading: false,
  })),
  useDeleteQC: vi.fn(() => mockDeleteQC),
}));

import { useQC } from "../hooks";
import TabQC from "./TabQC";

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteQC.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("TabQC", () => {
  it("renders Tim QC title", () => {
    render(<TabQC gajianId="g1" karyawanList={[]} />);
    expect(screen.getByText("Tim QC")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useQC.mockReturnValueOnce({ rows: [], loading: true });
    render(<TabQC gajianId="g1" karyawanList={[]} />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("renders entry card", () => {
    render(<TabQC gajianId="g1" karyawanList={[]} />);
    expect(screen.getByTestId("entry-RINI")).toBeInTheDocument();
  });

  it("opens QCForm on + Tambah", () => {
    render(<TabQC gajianId="g1" karyawanList={[]} />);
    fireEvent.click(screen.getByText("+ Tambah"));
    expect(screen.getByTestId("qc-form")).toBeInTheDocument();
  });

  it("calls deleteQC on Del with confirm", async () => {
    render(<TabQC gajianId="g1" karyawanList={[]} />);
    fireEvent.click(screen.getByText("Del"));
    await waitFor(() => expect(mockDeleteQC).toHaveBeenCalledWith("q1"));
    expect(mockToast.success).toHaveBeenCalled();
  });
});
