import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});
vi.mock("../../../shared/components/FinanceLayout", () => ({
  default: ({ children, title, headerAction }) => (
    <div><h1>{title}</h1>{headerAction}{children}</div>
  ),
}));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
  fmtTanggalPendek: vi.fn((v) => v || ""),
}));
vi.mock("../components/BuatPeriodeModal", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="buat-modal">
      <button onClick={onClose}>Close</button>
      <button onClick={() => onSave("new-id")}>Save</button>
    </div>
  ),
}));

const mockDeleteGajianPeriode = vi.fn().mockResolvedValue(undefined);
const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../hooks", () => ({
  useGajianList: vi.fn(() => ({
    gajianList: [
      { id: "g1", tanggal_sabtu: "2026-07-04", status: "draft", total_gaji: 5000000, total_request: 4800000, total_potong: 1000000 },
      { id: "g2", tanggal_sabtu: "2026-06-27", status: "final", total_gaji: 6000000, total_request: 5800000, total_potong: 0 },
    ],
    loading: false,
  })),
  useDeleteGajianPeriode: vi.fn(() => mockDeleteGajianPeriode),
}));

import { useGajianList } from "../hooks";
import { useNavigate } from "react-router-dom";
import GajianListPage from "./GajianListPage";

function renderPage() {
  const navigate = vi.fn();
  useNavigate.mockReturnValue(navigate);
  render(<MemoryRouter><GajianListPage /></MemoryRouter>);
  return { navigate };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteGajianPeriode.mockResolvedValue(undefined);
  vi.stubGlobal("confirm", vi.fn(() => true));
});

describe("GajianListPage", () => {
  it("renders Gajian title", () => {
    renderPage();
    expect(screen.getByText("Gajian")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useGajianList.mockReturnValueOnce({ gajianList: [], loading: true });
    renderPage();
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows empty state with Buat Periode Pertama button", () => {
    useGajianList.mockReturnValueOnce({ gajianList: [], loading: false });
    renderPage();
    expect(screen.getByText("Belum ada periode gajian.")).toBeInTheDocument();
    expect(screen.getByText("Buat Periode Pertama")).toBeInTheDocument();
  });

  it("renders gajian rows", () => {
    renderPage();
    expect(screen.getByText(/2026-07-04/)).toBeInTheDocument();
    expect(screen.getByText(/2026-06-27/)).toBeInTheDocument();
  });

  it("renders status badges", () => {
    renderPage();
    expect(screen.getByText("draft")).toBeInTheDocument();
    expect(screen.getByText("final")).toBeInTheDocument();
  });

  it("navigates to detail on row click", () => {
    const { navigate } = renderPage();
    fireEvent.click(screen.getByText(/2026-07-04/).closest("div[class*='cursor-pointer']"));
    expect(navigate).toHaveBeenCalledWith("/gajian/g1");
  });

  it("opens BuatPeriodeModal on + Periode Baru click", () => {
    renderPage();
    fireEvent.click(screen.getByText("+ Periode Baru"));
    expect(screen.getByTestId("buat-modal")).toBeInTheDocument();
  });

  it("navigates to new gajian detail after creating period", () => {
    const { navigate } = renderPage();
    fireEvent.click(screen.getByText("+ Periode Baru"));
    fireEvent.click(screen.getByText("Save"));
    expect(navigate).toHaveBeenCalledWith("/gajian/new-id");
  });

  it("calls deleteGajianPeriode on Hapus with confirm", async () => {
    renderPage();
    fireEvent.click(screen.getAllByText("Hapus")[0]);
    await waitFor(() => expect(mockDeleteGajianPeriode).toHaveBeenCalledWith("g1"));
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("does not delete when confirm=false", async () => {
    vi.stubGlobal("confirm", vi.fn(() => false));
    renderPage();
    fireEvent.click(screen.getAllByText("Hapus")[0]);
    expect(mockDeleteGajianPeriode).not.toHaveBeenCalled();
  });

  it("shows error toast when delete fails", async () => {
    mockDeleteGajianPeriode.mockRejectedValueOnce(new Error("delete fail"));
    renderPage();
    fireEvent.click(screen.getAllByText("Hapus")[0]);
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: delete fail"));
  });
});
