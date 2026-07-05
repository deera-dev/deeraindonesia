import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/components/FinanceLayout", () => ({
  default: ({ children, title, headerAction }) => (
    <div><h1>{title}</h1>{headerAction}{children}</div>
  ),
}));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
}));
vi.mock("../../karyawan/hooks", () => ({
  useKaryawanAktif: vi.fn(() => ({ karyawan: [], loading: false })),
}));
vi.mock("../components/KasbonForm", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="kasbon-form">
      <button onClick={onClose}>Close</button>
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));
vi.mock("../components/CicilanModal", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="cicilan-modal">
      <button onClick={onClose}>Close</button>
      <button onClick={onSave}>Save</button>
    </div>
  ),
}));
vi.mock("../components/KasbonCard", () => ({
  default: ({ k, onEdit, onCicilan, onDelete }) => (
    <div data-testid={`card-${k.id}`}>
      <span>{k.karyawan?.nama}</span>
      <button onClick={() => onEdit(k)}>Edit</button>
      <button onClick={() => onCicilan(k)}>Cicilan</button>
      <button onClick={() => onDelete(k.id)}>Hapus</button>
    </div>
  ),
}));

const mockDeleteKasbon = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useKasbonList: vi.fn(() => ({
    rows: [
      { id: "kb1", karyawan: { nama: "BUDI" }, status: "belum", sisa: 500000, jumlah: 1000000 },
      { id: "kb2", karyawan: { nama: "ANI" }, status: "lunas", sisa: 0, jumlah: 300000 },
    ],
    loading: false,
  })),
  useDeleteKasbon: vi.fn(() => mockDeleteKasbon),
}));

import { useKasbonList } from "../hooks";
import KasbonPage from "./KasbonPage";

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteKasbon.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("KasbonPage", () => {
  it("renders title", () => {
    render(<KasbonPage />);
    expect(screen.getByText("Kasbon")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useKasbonList.mockReturnValueOnce({ rows: [], loading: true });
    render(<KasbonPage />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("renders belum kasbon by default filter", () => {
    render(<KasbonPage />);
    expect(screen.getByTestId("card-kb1")).toBeInTheDocument();
    expect(screen.queryByTestId("card-kb2")).toBeNull();
  });

  it("renders semua kasbon when filter=semua", () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("Semua"));
    expect(screen.getByTestId("card-kb1")).toBeInTheDocument();
    expect(screen.getByTestId("card-kb2")).toBeInTheDocument();
  });

  it("shows total sisa", () => {
    render(<KasbonPage />);
    expect(screen.getByText("Rp500000")).toBeInTheDocument();
  });

  it("opens KasbonForm on + Kasbon Baru click", () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("+ Kasbon Baru"));
    expect(screen.getByTestId("kasbon-form")).toBeInTheDocument();
  });

  it("opens CicilanModal when Cicilan clicked on card", () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("Cicilan"));
    expect(screen.getByTestId("cicilan-modal")).toBeInTheDocument();
  });

  it("opens edit form when Edit clicked", () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("kasbon-form")).toBeInTheDocument();
  });

  it("calls deleteKasbon when Hapus confirmed", async () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("Hapus"));
    await waitFor(() => expect(mockDeleteKasbon).toHaveBeenCalledWith("kb1"));
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("does not delete when confirm=false", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("Hapus"));
    expect(mockDeleteKasbon).not.toHaveBeenCalled();
  });
});

// ── Additional branch/lambda coverage ────────────────────────────────────────
describe("KasbonPage — additional coverage", () => {
  it("shows lunas kasbon when filter=lunas", () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("Lunas"));
    expect(screen.getByTestId("card-kb2")).toBeInTheDocument();
    expect(screen.queryByTestId("card-kb1")).toBeNull();
  });

  it("shows empty state when no filtered results", () => {
    useKasbonList.mockReturnValueOnce({ rows: [], loading: false });
    render(<KasbonPage />);
    expect(screen.getByText("Tidak ada kasbon.")).toBeInTheDocument();
  });

  it("KasbonForm onClose (showForm) closes the form", () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("+ Kasbon Baru"));
    expect(screen.getByTestId("kasbon-form")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("kasbon-form")).toBeNull();
  });

  it("KasbonForm onSave (showForm) closes the form", () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("+ Kasbon Baru"));
    fireEvent.click(screen.getByText("Save"));
    expect(screen.queryByTestId("kasbon-form")).toBeNull();
  });

  it("editTarget KasbonForm onClose closes the edit form", () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("kasbon-form")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("kasbon-form")).toBeNull();
  });

  it("editTarget KasbonForm onSave closes the edit form", () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("Edit"));
    fireEvent.click(screen.getByText("Save"));
    expect(screen.queryByTestId("kasbon-form")).toBeNull();
  });

  it("CicilanModal onClose closes the modal", () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("Cicilan"));
    expect(screen.getByTestId("cicilan-modal")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("cicilan-modal")).toBeNull();
  });

  it("CicilanModal onSave closes the modal", () => {
    render(<KasbonPage />);
    fireEvent.click(screen.getByText("Cicilan"));
    fireEvent.click(screen.getByText("Save"));
    expect(screen.queryByTestId("cicilan-modal")).toBeNull();
  });

  it("shows Belum Lunas count", () => {
    render(<KasbonPage />);
    expect(screen.getByText("1 orang")).toBeInTheDocument();
  });
});

describe("KasbonPage — sisa || 0 branch (sisa=0 for belum row)", () => {
  it("handles belum row with sisa=0 in totalSisa reduce", () => {
    useKasbonList.mockReturnValueOnce({
      rows: [
        { id: "kb3", karyawan: { nama: "CICI" }, status: "belum", sisa: 0, jumlah: 200000 },
      ],
      loading: false,
    });
    render(<KasbonPage />);
    // sisa=0 → 0 || 0 = 0, should render Rp0 total sisa
    expect(screen.getByText("Rp0")).toBeInTheDocument();
  });
});
