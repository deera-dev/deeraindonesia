import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
}));
vi.mock("./TabHeader", () => ({
  default: ({ title }) => <div><span>{title}</span></div>,
}));
vi.mock("./TotalBar", () => ({
  default: ({ label, value }) => <div data-testid="total-bar">{label}:{value}</div>,
}));
vi.mock("./FinishingForm", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="finishing-form">
      <button onClick={onClose}>Close</button>
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));

const mockDeleteFinishing = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useFinishing: vi.fn(() => ({
    record: {
      id: "f1",
      total_upah: 250000,
      items: [
        { nama_produk: "D-07-OSK", jumlah: 20, kancing_qty: 40 },
      ],
    },
    loading: false,
  })),
  useDeleteFinishing: vi.fn(() => mockDeleteFinishing),
}));

import { useFinishing } from "../hooks";
import TabFinishing from "./TabFinishing";

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteFinishing.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("TabFinishing", () => {
  it("renders Finishing title", () => {
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText("Finishing")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useFinishing.mockReturnValueOnce({ record: null, loading: true });
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows no data state when record is null", () => {
    useFinishing.mockReturnValueOnce({ record: null, loading: false });
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText("Belum ada data finishing.")).toBeInTheDocument();
  });

  it("shows + Input Finishing when no record", () => {
    useFinishing.mockReturnValueOnce({ record: null, loading: false });
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText("+ Input Finishing")).toBeInTheDocument();
  });

  it("renders record data when exists", () => {
    render(<TabFinishing gajianId="g1" />);
    expect(screen.getByText(/D-07-OSK/)).toBeInTheDocument();
  });

  it("opens form on Edit click", () => {
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("finishing-form")).toBeInTheDocument();
  });

  it("calls deleteFinishing on Hapus with confirm", async () => {
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("Hapus"));
    await waitFor(() => expect(mockDeleteFinishing).toHaveBeenCalledWith("f1"));
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("does not delete when confirm=false", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("Hapus"));
    expect(mockDeleteFinishing).not.toHaveBeenCalled();
  });

  it("opens form on + Input Finishing click", () => {
    useFinishing.mockReturnValueOnce({ record: null, loading: false });
    render(<TabFinishing gajianId="g1" />);
    fireEvent.click(screen.getByText("+ Input Finishing"));
    expect(screen.getByTestId("finishing-form")).toBeInTheDocument();
  });
});
