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
vi.mock("./JahitForm", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="jahit-form">
      <button onClick={onClose}>Close</button>
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));
const mockDeleteJahit = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useJahit: vi.fn(() => ({
    rows: [
      { id: "j1", karyawan: { nama: "ANI" }, kartu_items: [{ jumlah: 5 }], permak_items: [], total_upah: 100000 },
    ],
    loading: false,
  })),
  useDeleteJahit: vi.fn(() => mockDeleteJahit),
}));

import { useJahit } from "../hooks";
import TabJahit from "./TabJahit";

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteJahit.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("TabJahit", () => {
  it("renders Tim Jahit title", () => {
    render(<TabJahit gajianId="g1" karyawanList={[]} />);
    expect(screen.getByText("Tim Jahit")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useJahit.mockReturnValueOnce({ rows: [], loading: true });
    render(<TabJahit gajianId="g1" karyawanList={[]} />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows empty when no rows", () => {
    useJahit.mockReturnValueOnce({ rows: [], loading: false });
    render(<TabJahit gajianId="g1" karyawanList={[]} />);
    expect(screen.getByText("Belum ada entri.")).toBeInTheDocument();
  });

  it("renders entry card", () => {
    render(<TabJahit gajianId="g1" karyawanList={[]} />);
    expect(screen.getByTestId("entry-ANI")).toBeInTheDocument();
  });

  it("opens JahitForm on + Tambah", () => {
    render(<TabJahit gajianId="g1" karyawanList={[]} />);
    fireEvent.click(screen.getByText("+ Tambah"));
    expect(screen.getByTestId("jahit-form")).toBeInTheDocument();
  });

  it("calls deleteJahit on Del with confirm", async () => {
    render(<TabJahit gajianId="g1" karyawanList={[]} />);
    fireEvent.click(screen.getByText("Del"));
    await waitFor(() => expect(mockDeleteJahit).toHaveBeenCalledWith("j1"));
    expect(mockToast.success).toHaveBeenCalled();
  });
});
