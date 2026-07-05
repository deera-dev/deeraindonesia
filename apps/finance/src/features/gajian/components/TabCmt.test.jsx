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
vi.mock("./CmtForm", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="cmt-form">
      <button onClick={onClose}>Close</button>
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));
const mockDeleteCmt = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useCmt: vi.fn(() => ({
    rows: [
      { id: "c1", nama_vendor: "Vendor A", jumlah_kirim: 100, jumlah_terima: 90, harga_upah: 5000, total_upah: 450000 },
    ],
    loading: false,
  })),
  useDeleteCmt: vi.fn(() => mockDeleteCmt),
}));

import { useCmt } from "../hooks";
import TabCmt from "./TabCmt";

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteCmt.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("TabCmt", () => {
  it("renders CMT Luar title", () => {
    render(<TabCmt gajianId="g1" />);
    expect(screen.getByText("CMT Luar")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useCmt.mockReturnValueOnce({ rows: [], loading: true });
    render(<TabCmt gajianId="g1" />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows empty when no rows", () => {
    useCmt.mockReturnValueOnce({ rows: [], loading: false });
    render(<TabCmt gajianId="g1" />);
    expect(screen.getByText("Belum ada entri.")).toBeInTheDocument();
  });

  it("renders entry card with vendor name", () => {
    render(<TabCmt gajianId="g1" />);
    expect(screen.getByTestId("entry-Vendor A")).toBeInTheDocument();
  });

  it("opens CmtForm on + Tambah", () => {
    render(<TabCmt gajianId="g1" />);
    fireEvent.click(screen.getByText("+ Tambah"));
    expect(screen.getByTestId("cmt-form")).toBeInTheDocument();
  });

  it("calls deleteCmt on Del with confirm", async () => {
    render(<TabCmt gajianId="g1" />);
    fireEvent.click(screen.getByText("Del"));
    await waitFor(() => expect(mockDeleteCmt).toHaveBeenCalledWith("c1"));
    expect(mockToast.success).toHaveBeenCalled();
  });
});
