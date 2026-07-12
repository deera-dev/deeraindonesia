import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@deera/shared/features/transfers/hooks", () => ({
  usePendingTransferCount: vi.fn(),
}));

import AdminBottomNav from "./AdminBottomNav";
import { usePendingTransferCount } from "@deera/shared/features/transfers/hooks";

function renderNav(pathname = "/") {
  return render(
    <MemoryRouter initialEntries={[pathname]}>
      <AdminBottomNav />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  usePendingTransferCount.mockReturnValue(0);
});

describe("AdminBottomNav", () => {
  it("renders all 7 nav labels", () => {
    renderNav();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Produksi")).toBeInTheDocument();
    expect(screen.getByText("Stok")).toBeInTheDocument();
    expect(screen.getByText("Transfer")).toBeInTheDocument();
    expect(screen.getByText("Buku")).toBeInTheDocument();
    expect(screen.getByText("Analytics")).toBeInTheDocument();
    expect(screen.getByText("Riwayat")).toBeInTheDocument();
  });

  it("does not show badge when pending = 0", () => {
    usePendingTransferCount.mockReturnValue(0);
    renderNav();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows badge with count when pending > 0", () => {
    usePendingTransferCount.mockReturnValue(3);
    renderNav();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("Home link is active at /", () => {
    renderNav("/");
    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink).toHaveClass("text-[#CAB170]");
  });

  it("Home link is not active at /transfer", () => {
    renderNav("/transfer");
    const homeLink = screen.getByRole("link", { name: /home/i });
    expect(homeLink).not.toHaveClass("text-[#CAB170]");
  });

  it("Produksi link is active at /produksi/record", () => {
    renderNav("/produksi/record");
    const produksiLink = screen.getByRole("link", { name: /produksi/i });
    expect(produksiLink).toHaveClass("text-[#CAB170]");
  });

  it("Transfer link is active at /transfer", () => {
    renderNav("/transfer");
    const transferLink = screen.getByRole("link", { name: /transfer/i });
    expect(transferLink).toHaveClass("text-[#CAB170]");
  });

  it("Stok link is active at /stok-opname", () => {
    renderNav("/stok-opname");
    const stokLink = screen.getByRole("link", { name: /stok/i });
    expect(stokLink).toHaveClass("text-[#CAB170]");
  });

  it("Buku link is active at /buku-potongan", () => {
    renderNav("/buku-potongan");
    const bukuLink = screen.getByRole("link", { name: /buku/i });
    expect(bukuLink).toHaveClass("text-[#CAB170]");
  });

  it("Analytics link is active at /analytics", () => {
    renderNav("/analytics");
    const analyticsLink = screen.getByRole("link", { name: /analytics/i });
    expect(analyticsLink).toHaveClass("text-[#CAB170]");
  });

  it("Riwayat link is active at /history", () => {
    renderNav("/history");
    const riwayatLink = screen.getByRole("link", { name: /riwayat/i });
    expect(riwayatLink).toHaveClass("text-[#CAB170]");
  });

  it("all links have correct href", () => {
    renderNav();
    const links = screen.getAllByRole("link");
    const hrefs = links.map(l => l.getAttribute("href"));
    expect(hrefs).toContain("/");
    expect(hrefs).toContain("/produksi");
    expect(hrefs).toContain("/stok-opname");
    expect(hrefs).toContain("/transfer");
    expect(hrefs).toContain("/buku-potongan");
    expect(hrefs).toContain("/analytics");
    expect(hrefs).toContain("/history");
  });

  it("memakai padding safe-area yang benar (bukan class \"safe-area-inset-bottom\" mati, redesign 2026-07)", () => {
    const { container } = renderNav();
    const nav = container.querySelector("nav");
    expect(nav.className).toContain("pb-[env(safe-area-inset-bottom)]");
    expect(nav.className).not.toContain("safe-area-inset-bottom\"");
  });
});
