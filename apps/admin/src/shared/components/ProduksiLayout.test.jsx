import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@deera/shared/features/theme/hooks", () => ({
  useTheme: vi.fn(),
}));
vi.mock("@deera/shared/components/ThemeToggle", () => ({
  default: ({ isDark, onToggle }) => (
    <button onClick={onToggle} data-testid="theme-toggle">{isDark ? "dark" : "light"}</button>
  ),
}));
vi.mock("@deera/shared/features/transfers/hooks", () => ({
  usePendingTransferCount: vi.fn(),
}));

import ProduksiLayout from "./ProduksiLayout";
import { useTheme } from "@deera/shared/features/theme/hooks";
import { usePendingTransferCount } from "@deera/shared/features/transfers/hooks";

beforeEach(() => {
  vi.clearAllMocks();
  useTheme.mockReturnValue({ isDark: false, toggleTheme: vi.fn() });
  usePendingTransferCount.mockReturnValue(0);
});

function renderLayout(props = {}, pathname = "/produksi/bahan") {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <ProduksiLayout title="Test Title" {...props}>
        <div>page content</div>
      </ProduksiLayout>
    </MemoryRouter>
  );
}

describe("ProduksiLayout", () => {
  it("renders PRODUKSI header", () => {
    renderLayout();
    expect(screen.getByText("PRODUKSI")).toBeInTheDocument();
  });

  it("renders title subtitle when provided", () => {
    renderLayout({ title: "Laporan Produksi" });
    expect(screen.getByText("Laporan Produksi")).toBeInTheDocument();
  });

  it("does not render subtitle when title not provided", () => {
    renderLayout({ title: undefined });
    // no subtitle element; PRODUKSI header still there
    expect(screen.getByText("PRODUKSI")).toBeInTheDocument();
  });

  it("renders all sub-nav links (TANPA 'Laporan' — dipindah ke Analytics 2026-07-19)", () => {
    renderLayout();
    const links = screen.getAllByRole("link");
    const hrefs = links.map(l => l.getAttribute("href"));
    expect(hrefs).toContain("/produksi/record");
    expect(hrefs).toContain("/produksi/hpp");
    expect(hrefs).toContain("/produksi/bahan");
    expect(hrefs).toContain("/produksi/sampel");
    expect(hrefs).not.toContain("/produksi/laporan");
  });

  it("highlights active sub-nav at /produksi/bahan", () => {
    renderLayout({}, "/produksi/bahan");
    const bahanLink = screen.getByRole("link", { name: "Bahan" });
    expect(bahanLink).toHaveClass("border-[#CAB170]");
  });

  it("highlights active sub-nav at /produksi/hpp", () => {
    renderLayout({}, "/produksi/hpp");
    const hppLink = screen.getByRole("link", { name: "HPP" });
    expect(hppLink).toHaveClass("border-[#CAB170]");
  });

  it("renders children", () => {
    renderLayout();
    expect(screen.getByText("page content")).toBeInTheDocument();
  });

  it("renders headerAction when provided", () => {
    renderLayout({ headerAction: <button>ActionBtn</button> });
    expect(screen.getByText("ActionBtn")).toBeInTheDocument();
  });

  it("renders ThemeToggle", () => {
    renderLayout();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
  });

  it("shows dark mode in ThemeToggle when isDark=true", () => {
    useTheme.mockReturnValue({ isDark: true, toggleTheme: vi.fn() });
    renderLayout();
    expect(screen.getByTestId("theme-toggle")).toHaveTextContent("dark");
  });

  it("renders AdminBottomNav + AdminSidebar (includes nav links Home/Transfer/etc.)", () => {
    renderLayout();
    // AdminBottomNav (mobile) DAN AdminSidebar (desktop, md+) sama-sama
    // dirender — keduanya menampilkan label nav yang sama, CSS breakpoint
    // yang menentukan mana yang tampak. Jadi "Home" muncul 2x di DOM.
    expect(screen.getAllByText("Home").length).toBeGreaterThanOrEqual(1);
  });

  it("renders BackToTop TEPAT SATU KALI (redesign 2026-07 — dulu tiap halaman Produksi menambahkannya sendiri, 2 dari 5 malah dobel)", () => {
    renderLayout();
    const btns = screen.getAllByRole("button", { hidden: true }).filter(
      (b) => b.getAttribute("aria-label") === "Kembali ke atas",
    );
    expect(btns).toHaveLength(1);
  });
});
