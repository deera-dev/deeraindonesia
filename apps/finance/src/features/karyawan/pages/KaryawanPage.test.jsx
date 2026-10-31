import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/components/FinanceLayout", () => ({
  default: ({ children, title, headerAction }) => (
    <div>
      <h1>{title}</h1>
      {headerAction}
      {children}
    </div>
  ),
}));
vi.mock("../utils", () => ({
  TIM_OPTIONS: [{ value: "jahit", label: "Tim Jahit" }],
  timLabel: vi.fn((t) => `Tim ${t}`),
}));
vi.mock("../components/KaryawanForm", () => ({
  default: ({ onClose, onSave }) => (
    <div data-testid="form">
      <button onClick={onClose}>Close</button>
      <button onClick={onSave}>SaveForm</button>
    </div>
  ),
}));
vi.mock("../components/KaryawanCard", () => ({
  default: ({ k, onEdit, onToggleAktif }) => (
    <div data-testid={`card-${k.id}`}>
      <span>{k.nama}</span>
      <button onClick={() => onEdit(k)}>Edit</button>
      <button onClick={() => onToggleAktif(k)}>Toggle</button>
    </div>
  ),
}));

const mockToggleAktif = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useKaryawanList: vi.fn(() => ({
    karyawan: [
      { id: "k1", nama: "BUDI", tim: "jahit", aktif: true },
      { id: "k2", nama: "ANI", tim: "jahit", aktif: false },
    ],
    loading: false,
  })),
  useToggleKaryawanAktif: vi.fn(() => mockToggleAktif),
}));

import { useKaryawanList } from "../hooks";
import KaryawanPage from "./KaryawanPage";

beforeEach(() => {
  vi.clearAllMocks();
  mockToggleAktif.mockResolvedValue(undefined);
});

describe("KaryawanPage", () => {
  it("renders title", () => {
    render(<KaryawanPage />);
    expect(screen.getByText("Karyawan")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useKaryawanList.mockReturnValueOnce({ karyawan: [], loading: true });
    render(<KaryawanPage />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("renders only active karyawan by default", () => {
    render(<KaryawanPage />);
    expect(screen.getByTestId("card-k1")).toBeInTheDocument();
    expect(screen.queryByTestId("card-k2")).toBeNull();
  });

  it("shows non-aktif karyawan when toggle clicked", () => {
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("+ Non-aktif"));
    expect(screen.getByTestId("card-k2")).toBeInTheDocument();
  });

  it("shows empty message when no karyawan", () => {
    useKaryawanList.mockReturnValueOnce({ karyawan: [], loading: false });
    render(<KaryawanPage />);
    expect(screen.getByText("Tidak ada karyawan.")).toBeInTheDocument();
  });

  it("opens form on + Tambah click", () => {
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("+ Tambah"));
    expect(screen.getByTestId("form")).toBeInTheDocument();
  });

  it("opens edit form when Edit clicked on card", () => {
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("form")).toBeInTheDocument();
  });

  it("closes form when Close called in form", () => {
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("+ Tambah"));
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("form")).toBeNull();
  });

  it("calls toggleAktif and shows success on Toggle", async () => {
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("Toggle"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalled());
  });

  it("shows error toast when toggleAktif throws", async () => {
    mockToggleAktif.mockRejectedValueOnce(new Error("fail"));
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("Toggle"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal update: fail"));
  });
});

describe("KaryawanPage — extra branches", () => {
  it("filters by tim when tim filter button clicked", () => {
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("Tim Jahit"));
    expect(screen.getByTestId("card-k1")).toBeInTheDocument();
  });

  it("shows karyawan with null tim under 'lainnya' group", () => {
    useKaryawanList.mockReturnValueOnce({
      karyawan: [{ id: "k3", nama: "CACA", tim: undefined, aktif: true }],
      loading: false,
    });
    render(<KaryawanPage />);
    expect(screen.getByText(/lainnya/i)).toBeInTheDocument();
  });

  it("shows 'Karyawan diaktifkan.' toast when toggling non-aktif karyawan", async () => {
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("+ Non-aktif"));
    const toggleButtons = screen.getAllByText("Toggle");
    fireEvent.click(toggleButtons[1]);
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith("Karyawan diaktifkan."));
  });

  it("closes Tambah form via onSave callback", () => {
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("+ Tambah"));
    expect(screen.getByTestId("form")).toBeInTheDocument();
    fireEvent.click(screen.getByText("SaveForm"));
    expect(screen.queryByTestId("form")).toBeNull();
  });

  it("closes Edit form via onSave callback", () => {
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("form")).toBeInTheDocument();
    fireEvent.click(screen.getByText("SaveForm"));
    expect(screen.queryByTestId("form")).toBeNull();
  });

  it("closes Edit form via onClose callback", () => {
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("Edit"));
    expect(screen.getByTestId("form")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Close"));
    expect(screen.queryByTestId("form")).toBeNull();
  });
});

describe("KaryawanPage — filterTim excludes non-matching", () => {
  it("hides karyawan whose tim does not match active filter", () => {
    useKaryawanList.mockReturnValue({
      karyawan: [
        { id: "k1", nama: "BUDI", tim: "jahit", aktif: true },
        { id: "k4", nama: "DODI", tim: "potong", aktif: true },
      ],
      loading: false,
    });
    render(<KaryawanPage />);
    fireEvent.click(screen.getByText("Tim Jahit"));
    expect(screen.getByTestId("card-k1")).toBeInTheDocument();
    expect(screen.queryByTestId("card-k4")).toBeNull();
  });
});
