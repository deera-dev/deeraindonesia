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
vi.mock("./PotongForm", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="potong-form">
      <button onClick={onClose}>Close</button>
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));
const mockDeletePotong = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  usePotong: vi.fn(() => ({
    rows: [
      { id: "p1", karyawan: { nama: "BUDI" }, qty_potongan: 10, tarif_potongan: 4000, jumlah_pola: 2, jumlah_sampel: 1, total_upah: 50000 },
    ],
    loading: false,
  })),
  useDeletePotong: vi.fn(() => mockDeletePotong),
}));

import { usePotong } from "../hooks";
import TabPotong from "./TabPotong";

beforeEach(() => {
  vi.clearAllMocks();
  mockDeletePotong.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("TabPotong", () => {
  it("renders Tim Potong title", () => {
    render(<TabPotong gajianId="g1" karyawanList={[]} />);
    expect(screen.getByText("Tim Potong")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    usePotong.mockReturnValueOnce({ rows: [], loading: true });
    render(<TabPotong gajianId="g1" karyawanList={[]} />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows empty state when no rows", () => {
    usePotong.mockReturnValueOnce({ rows: [], loading: false });
    render(<TabPotong gajianId="g1" karyawanList={[]} />);
    expect(screen.getByText("Belum ada entri.")).toBeInTheDocument();
  });

  it("renders entry cards", () => {
    render(<TabPotong gajianId="g1" karyawanList={[]} />);
    expect(screen.getByTestId("entry-BUDI")).toBeInTheDocument();
  });

  it("shows total bar when rows > 0", () => {
    render(<TabPotong gajianId="g1" karyawanList={[]} />);
    expect(screen.getByTestId("total-bar")).toBeInTheDocument();
  });

  it("opens PotongForm on + Tambah", () => {
    render(<TabPotong gajianId="g1" karyawanList={[]} />);
    fireEvent.click(screen.getByText("+ Tambah"));
    expect(screen.getByTestId("potong-form")).toBeInTheDocument();
  });

  it("opens edit form on Edit click", () => {
    render(<TabPotong gajianId="g1" karyawanList={[]} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("potong-form")).toBeInTheDocument();
  });

  it("calls deletePotong on Del click with confirm", async () => {
    render(<TabPotong gajianId="g1" karyawanList={[]} />);
    fireEvent.click(screen.getByText("Del"));
    await waitFor(() => expect(mockDeletePotong).toHaveBeenCalledWith("p1"));
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("does not delete when confirm=false", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<TabPotong gajianId="g1" karyawanList={[]} />);
    fireEvent.click(screen.getByText("Del"));
    expect(mockDeletePotong).not.toHaveBeenCalled();
  });
});
