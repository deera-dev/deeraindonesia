import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@deera/shared/components/BackToTop", () => ({ default: () => null }));
vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => <div data-testid="bottom-nav" /> }));
vi.mock("../../../shared/components/AdminSidebar", () => ({ default: () => <div data-testid="sidebar" /> }));

const mockUsePasarRestock = vi.fn();
vi.mock("../hooks", () => ({ usePasarRestock: (...a) => mockUsePasarRestock(...a) }));

import PasarRestockPage from "./PasarRestockPage";

// Bentuk data sama persis dengan hasil RPC get_pasar_restock (semua logika di backend).
const detail = (o) => ({
  size: "Midi", warna: "HITAM", marketQty: 1, gudangQty: 10, otherQty: 0, otherMarket: "tegalgubug",
  total: 20, target: 3, butuh: 2, menipis: true, hampirHabis: false, ...o,
});
const RESTOCK = [
  { kode: "D-01-OSK", details: [detail({})], maxButuh: 2, anyHampirHabis: false },
  {
    kode: "D-06-HBS",
    details: [detail({ warna: "BIRU", marketQty: 0, total: 2, target: 2, butuh: 2, hampirHabis: true })],
    maxButuh: 2,
    anyHampirHabis: true,
  },
];
const TIDAK = [{ kode: "D-02-SFN", details: [{ size: "Gamis", warna: "MERAH", marketQty: 5 }], totalMarketQty: 5 }];

function renderPage() {
  return render(
    <MemoryRouter>
      <PasarRestockPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockUsePasarRestock.mockReturnValue({ restockList: RESTOCK, tidakBergerakList: TIDAK, loading: false });
});

describe("PasarRestockPage", () => {
  it("renders judul & market picker", () => {
    renderPage();
    expect(screen.getByText("Persiapan Pasar")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cideng" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tegalgubug" })).toBeInTheDocument();
  });

  it("menampilkan kartu restock apa adanya dari backend", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Cideng" }));
    const section = screen.getByText("Perlu Direstock").closest("section");
    expect(section).toHaveTextContent("D-01-OSK");
    expect(section).toHaveTextContent("Menipis · butuh 2");
    expect(section).toHaveTextContent("Midi · HITAM");
    expect(section).toHaveTextContent("Hampir Habis · bawa 2");
    expect(section).toHaveTextContent("bawa balik ke gudang dulu");
  });

  it("menampilkan kartu tidak bergerak dari backend", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Cideng" }));
    expect(screen.getByText("Tidak Bergerak").closest("section")).toHaveTextContent("D-02-SFN");
  });

  it("ganti market memanggil usePasarRestock dengan pasar baru", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Tegalgubug" }));
    expect(mockUsePasarRestock).toHaveBeenLastCalledWith("tegalgubug");
  });

  it("shows loading state", () => {
    mockUsePasarRestock.mockReturnValue({ restockList: [], tidakBergerakList: [], loading: true });
    renderPage();
    expect(screen.getAllByText("Memuat...").length).toBeGreaterThan(0);
  });

  it("shows empty state kalau backend mengembalikan daftar kosong", () => {
    mockUsePasarRestock.mockReturnValue({ restockList: [], tidakBergerakList: [], loading: false });
    renderPage();
    expect(screen.getByText(/masih aman/)).toBeInTheDocument();
    expect(screen.getByText(/masih bergerak/)).toBeInTheDocument();
  });
});
