import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@deera/shared/features/theme/hooks", () => ({
  useTheme: vi.fn(() => ({ isDark: false, toggleTheme: vi.fn() })),
}));
vi.mock("@deera/shared/components/ThemeToggle", () => ({
  default: ({ onToggle }) => <button onClick={onToggle} data-testid="theme-toggle" />,
}));
vi.mock("./FinanceBottomNav", () => ({
  default: () => <nav data-testid="bottom-nav" />,
}));
vi.mock("./FinanceSidebar", () => ({
  default: () => <aside data-testid="sidebar" />,
}));

import FinanceLayout from "./FinanceLayout";

describe("FinanceLayout", () => {
  it("renders FINANCE heading", () => {
    render(<FinanceLayout><p>content</p></FinanceLayout>);
    expect(screen.getByText("FINANCE")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(<FinanceLayout><p data-testid="child">hello</p></FinanceLayout>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("renders title when provided", () => {
    render(<FinanceLayout title="Kas"><p /></FinanceLayout>);
    expect(screen.getByText("Kas")).toBeInTheDocument();
  });

  it("renders subtitle instead of title when both provided", () => {
    render(<FinanceLayout title="Kas" subtitle="Juli 2026"><p /></FinanceLayout>);
    expect(screen.getByText("Juli 2026")).toBeInTheDocument();
  });

  it("renders headerAction when provided", () => {
    render(
      <FinanceLayout headerAction={<button>+ Catat</button>}><p /></FinanceLayout>
    );
    expect(screen.getByText("+ Catat")).toBeInTheDocument();
  });

  it("renders ThemeToggle and BottomNav", () => {
    render(<FinanceLayout><p /></FinanceLayout>);
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("bottom-nav")).toBeInTheDocument();
  });

  it("renders Sidebar (tablet/desktop nav — redesign 2026-07)", () => {
    render(<FinanceLayout><p /></FinanceLayout>);
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
  });

  it("renders BackToTop (redesign 2026-07 — app Finance sebelumnya tidak punya BackToTop sama sekali)", () => {
    render(<FinanceLayout><p /></FinanceLayout>);
    const btns = screen
      .getAllByRole("button", { hidden: true })
      .filter((b) => b.getAttribute("aria-label") === "Kembali ke atas");
    expect(btns).toHaveLength(1);
  });
});
