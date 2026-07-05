import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: vi.fn(() => vi.fn()) };
});
vi.mock("../../../shared/components/FinanceLayout", () => ({
  default: ({ children, title }) => <div><h1>{title}</h1>{children}</div>,
}));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
  fmtTanggalPendek: vi.fn((v) => v || ""),
  getSabtu: vi.fn(() => "2026-07-04"),
  getSenin: vi.fn(() => "2026-06-29"),
}));
vi.mock("../hooks", () => ({
  useDashboardStats: vi.fn(() => ({
    gajianRecent: [],
    pettycashSaldo: 300000,
    pettycashMasuk: 500000,
    pettycashKeluar: 200000,
    kasbonCount: 2,
    totalSisaKasbon: 150000,
    loading: false,
  })),
}));
vi.mock("../components/StatCard", () => ({
  default: ({ label, value, onClick }) => <div onClick={onClick} data-testid={`stat-${label}`}>{value}</div>,
}));
vi.mock("../components/SectionHeader", () => ({
  default: ({ children }) => <p>{children}</p>,
}));
vi.mock("../components/GajianRecentCard", () => ({
  default: ({ g, onClick }) => <div data-testid={`gajian-${g.id}`} onClick={onClick}>{g.tanggal_sabtu}</div>,
}));

import { useDashboardStats } from "../hooks";
import { useNavigate } from "react-router-dom";
import DashboardPage from "./DashboardPage";

function renderPage() {
  const navigate = vi.fn();
  useNavigate.mockReturnValue(navigate);
  render(<MemoryRouter><DashboardPage /></MemoryRouter>);
  return { navigate };
}

describe("DashboardPage", () => {
  it("shows loading state", () => {
    useDashboardStats.mockReturnValueOnce({
      gajianRecent: [], pettycashSaldo: 0, pettycashMasuk: 0, pettycashKeluar: 0,
      kasbonCount: 0, totalSisaKasbon: 0, loading: true,
    });
    renderPage();
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("renders pettycash masuk value", () => {
    renderPage();
    expect(screen.getByTestId("stat-Isi Ulang")).toHaveTextContent("Rp500000");
  });

  it("renders pettycash keluar value", () => {
    renderPage();
    expect(screen.getByTestId("stat-Pengeluaran")).toHaveTextContent("Rp200000");
  });

  it("renders pettycash saldo", () => {
    renderPage();
    expect(screen.getByTestId("stat-Saldo Petty Cash")).toHaveTextContent("Rp300000");
  });

  it("renders kasbon sisa", () => {
    renderPage();
    expect(screen.getByTestId("stat-Total Sisa Kasbon")).toHaveTextContent("Rp150000");
  });

  it("shows empty gajian message when list is empty", () => {
    renderPage();
    expect(screen.getByText("Belum ada data gajian.")).toBeInTheDocument();
  });

  it("renders gajian cards when data available", () => {
    useDashboardStats.mockReturnValueOnce({
      gajianRecent: [{ id: "g1", tanggal_sabtu: "2026-07-04", status: "draft" }],
      pettycashSaldo: 0, pettycashMasuk: 0, pettycashKeluar: 0,
      kasbonCount: 0, totalSisaKasbon: 0, loading: false,
    });
    renderPage();
    expect(screen.getByTestId("gajian-g1")).toBeInTheDocument();
  });

  it("navigates to /pettycash on Isi Ulang click", () => {
    const { navigate } = renderPage();
    fireEvent.click(screen.getByTestId("stat-Isi Ulang"));
    expect(navigate).toHaveBeenCalledWith("/pettycash");
  });

  it("navigates to /pettycash on Pengeluaran click", () => {
    const { navigate } = renderPage();
    fireEvent.click(screen.getByTestId("stat-Pengeluaran"));
    expect(navigate).toHaveBeenCalledWith("/pettycash");
  });

  it("navigates to /pettycash on Saldo Petty Cash click", () => {
    const { navigate } = renderPage();
    fireEvent.click(screen.getByTestId("stat-Saldo Petty Cash"));
    expect(navigate).toHaveBeenCalledWith("/pettycash");
  });

  it("navigates to /kasbon on kasbon click", () => {
    const { navigate } = renderPage();
    fireEvent.click(screen.getByTestId("stat-Total Sisa Kasbon"));
    expect(navigate).toHaveBeenCalledWith("/kasbon");
  });

  it("navigates to /gajian on Gajian Baru click", () => {
    const { navigate } = renderPage();
    fireEvent.click(screen.getByText("+ Gajian Baru"));
    expect(navigate).toHaveBeenCalledWith("/gajian");
  });

  it("navigates to /pettycash on Petty Cash quick action click", () => {
    const { navigate } = renderPage();
    fireEvent.click(screen.getByText("Petty Cash"));
    expect(navigate).toHaveBeenCalledWith("/pettycash");
  });

  it("navigates to /gajian/:id on gajian card click", () => {
    useDashboardStats.mockReturnValueOnce({
      gajianRecent: [{ id: "g1", tanggal_sabtu: "2026-07-04", status: "final" }],
      pettycashSaldo: 0, pettycashMasuk: 0, pettycashKeluar: 0,
      kasbonCount: 0, totalSisaKasbon: 0, loading: false,
    });
    const { navigate } = renderPage();
    fireEvent.click(screen.getByTestId("gajian-g1"));
    expect(navigate).toHaveBeenCalledWith("/gajian/g1");
  });
});
