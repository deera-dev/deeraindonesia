import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FinanceBottomNav from "./FinanceBottomNav";

function renderNav(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FinanceBottomNav />
    </MemoryRouter>
  );
}

describe("FinanceBottomNav", () => {
  it("renders all nav labels (6 items, kas dihapus)", () => {
    renderNav();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Gajian")).toBeInTheDocument();
    expect(screen.queryByText("Kas")).toBeNull();
    expect(screen.getByText("Kasbon")).toBeInTheDocument();
    expect(screen.getByText("Petty")).toBeInTheDocument();
    expect(screen.getByText("Karyawan")).toBeInTheDocument();
    expect(screen.getByText("Setelan")).toBeInTheDocument();
  });

  it("renders 6 nav links (kas sudah dihapus)", () => {
    renderNav();
    const links = document.querySelectorAll("a");
    expect(links.length).toBe(6);
  });

  it("Dashboard link goes to /", () => {
    renderNav();
    const dashLink = screen.getByText("Dashboard").closest("a");
    expect(dashLink.getAttribute("href")).toBe("/");
  });

  it("Gajian link goes to /gajian", () => {
    renderNav();
    const link = screen.getByText("Gajian").closest("a");
    expect(link.getAttribute("href")).toBe("/gajian");
  });

  it("Kasbon link goes to /kasbon", () => {
    renderNav();
    const link = screen.getByText("Kasbon").closest("a");
    expect(link.getAttribute("href")).toBe("/kasbon");
  });

  it("Petty link goes to /pettycash", () => {
    renderNav();
    const link = screen.getByText("Petty").closest("a");
    expect(link.getAttribute("href")).toBe("/pettycash");
  });
});

// Cover active=true branches for all icons + isActive branches
describe("FinanceBottomNav — active icon branches per route", () => {
  it("Gajian icon active=true when at /gajian", () => {
    render(
      <MemoryRouter initialEntries={["/gajian"]}>
        <FinanceBottomNav />
      </MemoryRouter>
    );
    const link = screen.getByText("Gajian").closest("a");
    expect(link.className).toContain("CAB170");
  });

  it("Kasbon icon active=true when at /kasbon", () => {
    render(
      <MemoryRouter initialEntries={["/kasbon"]}>
        <FinanceBottomNav />
      </MemoryRouter>
    );
    const link = screen.getByText("Kasbon").closest("a");
    expect(link.className).toContain("CAB170");
  });

  it("Petty icon active=true when at /pettycash", () => {
    render(
      <MemoryRouter initialEntries={["/pettycash"]}>
        <FinanceBottomNav />
      </MemoryRouter>
    );
    const link = screen.getByText("Petty").closest("a");
    expect(link.className).toContain("CAB170");
  });

  it("Karyawan icon active=true when at /karyawan", () => {
    render(
      <MemoryRouter initialEntries={["/karyawan"]}>
        <FinanceBottomNav />
      </MemoryRouter>
    );
    const link = screen.getByText("Karyawan").closest("a");
    expect(link.className).toContain("CAB170");
  });

  it("Setelan icon active=true when at /pengaturan", () => {
    render(
      <MemoryRouter initialEntries={["/pengaturan"]}>
        <FinanceBottomNav />
      </MemoryRouter>
    );
    const link = screen.getByText("Setelan").closest("a");
    expect(link.className).toContain("CAB170");
  });

  it("Gajian active=true via startsWith when at /gajian/123", () => {
    render(
      <MemoryRouter initialEntries={["/gajian/123"]}>
        <FinanceBottomNav />
      </MemoryRouter>
    );
    const link = screen.getByText("Gajian").closest("a");
    expect(link.className).toContain("CAB170");
  });

  it("Dashboard active=true at / (exact match)", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <FinanceBottomNav />
      </MemoryRouter>
    );
    const link = screen.getByText("Dashboard").closest("a");
    expect(link.className).toContain("CAB170");
  });

  it("memakai padding safe-area yang benar (bukan class \"safe-area-inset-bottom\" mati, redesign 2026-07)", () => {
    const { container } = renderNav();
    const nav = container.querySelector("nav");
    expect(nav.className).toContain("pb-[env(safe-area-inset-bottom)]");
    expect(nav.className).not.toContain("safe-area-inset-bottom\"");
  });
});
