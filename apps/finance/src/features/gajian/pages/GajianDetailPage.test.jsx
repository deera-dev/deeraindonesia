import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});
vi.mock("../../karyawan", () => ({
  useKaryawanAktif: vi.fn(() => ({ karyawan: [], loading: false })),
}));
vi.mock("../../../shared/components/FinanceLayout", () => ({
  default: ({ children, title, headerAction }) => (
    <div><h1>{title || "Detail Gajian"}</h1>{headerAction}{children}</div>
  ),
}));
vi.mock("../../../shared/lib/format", () => ({
  fmtTanggalPendek: vi.fn((v) => v || ""),
}));
vi.mock("../utils", () => ({
  TABS: ["Potong", "Jahit", "Finishing", "QC", "Kreatif", "CMT", "Ringkasan"],
}));

// Static mocks for each tab (dynamic vi.mock in a loop is not hoisted correctly)
vi.mock("../components/TabPotong", () => ({
  default: ({ gajianId }) => <div data-testid="TabPotong">TabPotong-{gajianId}</div>,
}));
vi.mock("../components/TabJahit", () => ({
  default: ({ gajianId }) => <div data-testid="TabJahit">TabJahit-{gajianId}</div>,
}));
vi.mock("../components/TabFinishing", () => ({
  default: ({ gajianId }) => <div data-testid="TabFinishing">TabFinishing-{gajianId}</div>,
}));
vi.mock("../components/TabQC", () => ({
  default: ({ gajianId }) => <div data-testid="TabQC">TabQC-{gajianId}</div>,
}));
vi.mock("../components/TabKreatif", () => ({
  default: ({ gajianId }) => <div data-testid="TabKreatif">TabKreatif-{gajianId}</div>,
}));
vi.mock("../components/TabCmt", () => ({
  default: ({ gajianId }) => <div data-testid="TabCmt">TabCmt-{gajianId}</div>,
}));
vi.mock("../components/TabRingkasan", () => ({
  default: ({ gajianId }) => <div data-testid="TabRingkasan">TabRingkasan-{gajianId}</div>,
}));

vi.mock("../hooks", () => ({
  useGajianDetail: vi.fn(() => ({
    gajian: { id: "g1", tanggal_sabtu: "2026-07-04", status: "draft" },
    loading: false,
  })),
}));

import { useGajianDetail } from "../hooks";
import { useNavigate } from "react-router-dom";
import GajianDetailPage from "./GajianDetailPage";

function renderPage(id = "g1") {
  const navigate = vi.fn();
  useNavigate.mockReturnValue(navigate);
  render(
    <MemoryRouter initialEntries={[`/gajian/${id}`]}>
      <Routes>
        <Route path="/gajian/:id" element={<GajianDetailPage />} />
      </Routes>
    </MemoryRouter>
  );
  return { navigate };
}

beforeEach(() => vi.clearAllMocks());

describe("GajianDetailPage", () => {
  it("shows loading when loading=true", () => {
    useGajianDetail.mockReturnValueOnce({ gajian: null, loading: true });
    renderPage();
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows not found when gajian=null and not loading", () => {
    useGajianDetail.mockReturnValueOnce({ gajian: null, loading: false });
    renderPage();
    expect(screen.getByText("Periode tidak ditemukan.")).toBeInTheDocument();
  });

  it("renders tab buttons", () => {
    renderPage();
    expect(screen.getByText("Potong")).toBeInTheDocument();
    expect(screen.getByText("Jahit")).toBeInTheDocument();
    expect(screen.getByText("Ringkasan")).toBeInTheDocument();
  });

  it("renders TabPotong by default", () => {
    renderPage();
    expect(screen.getByTestId("TabPotong")).toBeInTheDocument();
  });

  it("switches to TabJahit when Jahit tab clicked", () => {
    renderPage();
    fireEvent.click(screen.getByText("Jahit"));
    expect(screen.getByTestId("TabJahit")).toBeInTheDocument();
  });

  it("shows status badge", () => {
    renderPage();
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("navigates back to /gajian on ← Kembali click", () => {
    const { navigate } = renderPage();
    fireEvent.click(screen.getByText("← Kembali"));
    expect(navigate).toHaveBeenCalledWith("/gajian");
  });

  it("shows final badge when status=final", () => {
    useGajianDetail.mockReturnValueOnce({
      gajian: { id: "g1", tanggal_sabtu: "2026-07-04", status: "final" },
      loading: false,
    });
    renderPage();
    expect(screen.getByText("final")).toBeInTheDocument();
  });
});
