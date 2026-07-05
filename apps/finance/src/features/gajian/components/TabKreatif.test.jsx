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
vi.mock("./KreatifForm", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="kreatif-form">
      <button onClick={onClose}>Close</button>
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));
const mockDeleteKreatif = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useKreatif: vi.fn(() => ({
    rows: [
      { id: "kr1", karyawan: { nama: "SARI" }, jumlah_video: 2, jumlah_foto: 5, jumlah_logo: 0, total_upah: 350000 },
    ],
    loading: false,
  })),
  useDeleteKreatif: vi.fn(() => mockDeleteKreatif),
}));

import { useKreatif } from "../hooks";
import TabKreatif from "./TabKreatif";

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteKreatif.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("TabKreatif", () => {
  it("renders Tim Kreatif title", () => {
    render(<TabKreatif gajianId="g1" karyawanList={[]} />);
    expect(screen.getByText("Tim Kreatif")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useKreatif.mockReturnValueOnce({ rows: [], loading: true });
    render(<TabKreatif gajianId="g1" karyawanList={[]} />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows empty when no rows", () => {
    useKreatif.mockReturnValueOnce({ rows: [], loading: false });
    render(<TabKreatif gajianId="g1" karyawanList={[]} />);
    expect(screen.getByText("Belum ada entri.")).toBeInTheDocument();
  });

  it("renders entry card for karyawan", () => {
    render(<TabKreatif gajianId="g1" karyawanList={[]} />);
    expect(screen.getByTestId("entry-SARI")).toBeInTheDocument();
  });

  it("opens KreatifForm on + Tambah", () => {
    render(<TabKreatif gajianId="g1" karyawanList={[]} />);
    fireEvent.click(screen.getByText("+ Tambah"));
    expect(screen.getByTestId("kreatif-form")).toBeInTheDocument();
  });

  it("calls deleteKreatif on Del with confirm", async () => {
    render(<TabKreatif gajianId="g1" karyawanList={[]} />);
    fireEvent.click(screen.getByText("Del"));
    await waitFor(() => expect(mockDeleteKreatif).toHaveBeenCalledWith("kr1"));
    expect(mockToast.success).toHaveBeenCalled();
  });
});
