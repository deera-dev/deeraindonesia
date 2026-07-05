import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PosBottomNav from "./PosBottomNav";

function renderNav(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <PosBottomNav />
    </MemoryRouter>
  );
}

describe("PosBottomNav", () => {
  it("renders all 4 tab labels", () => {
    renderNav();
    expect(screen.getByText("Kasir")).toBeInTheDocument();
    expect(screen.getByText("Laporan")).toBeInTheDocument();
    expect(screen.getByText("Pelanggan")).toBeInTheDocument();
    expect(screen.getByText("Riwayat")).toBeInTheDocument();
  });

  it("renders nav element", () => {
    renderNav();
    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("all tabs are links", () => {
    renderNav();
    expect(screen.getAllByRole("link").length).toBe(4);
  });

  it("Kasir link points to /", () => {
    renderNav();
    const link = screen.getByText("Kasir").closest("a");
    expect(link).toHaveAttribute("href", "/");
  });

  it("Laporan link points to /laporan", () => {
    renderNav();
    const link = screen.getByText("Laporan").closest("a");
    expect(link).toHaveAttribute("href", "/laporan");
  });

  it("Pelanggan link points to /pelanggan", () => {
    renderNav();
    const link = screen.getByText("Pelanggan").closest("a");
    expect(link).toHaveAttribute("href", "/pelanggan");
  });

  it("Riwayat link points to /riwayat", () => {
    renderNav();
    const link = screen.getByText("Riwayat").closest("a");
    expect(link).toHaveAttribute("href", "/riwayat");
  });
});
