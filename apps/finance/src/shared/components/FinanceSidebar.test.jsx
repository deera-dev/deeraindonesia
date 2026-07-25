import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FinanceSidebar from "./FinanceSidebar";

function renderSidebar(path = "/") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <FinanceSidebar />
    </MemoryRouter>
  );
}

describe("FinanceSidebar", () => {
  it("renders FINANCE wordmark", () => {
    renderSidebar();
    expect(screen.getByText("FINANCE")).toBeInTheDocument();
  });

  it("renders all 6 nav labels (sama seperti FinanceBottomNav)", () => {
    renderSidebar();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Gajian")).toBeInTheDocument();
    expect(screen.getByText("Kasbon")).toBeInTheDocument();
    expect(screen.getByText("Petty")).toBeInTheDocument();
    expect(screen.getByText("Karyawan")).toBeInTheDocument();
    expect(screen.getByText("Setelan")).toBeInTheDocument();
  });

  it("renders 6 nav links", () => {
    renderSidebar();
    const links = document.querySelectorAll("aside a");
    expect(links.length).toBe(6);
  });

  it("is hidden on mobile, flex on md+ (className check)", () => {
    const { container } = renderSidebar();
    const aside = container.querySelector("aside");
    expect(aside.className).toContain("hidden");
    expect(aside.className).toContain("md:flex");
  });

  it("Gajian link active=true (highlight) when at /gajian/123 (startsWith match)", () => {
    renderSidebar("/gajian/123");
    const link = screen.getByText("Gajian").closest("a");
    expect(link.className).toContain("CAB170");
  });

  it("Dashboard link active=true only at exact /", () => {
    renderSidebar("/gajian");
    const link = screen.getByText("Dashboard").closest("a");
    expect(link.className).not.toContain("bg-skin-gold");
  });
});
