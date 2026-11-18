import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/components/BackToTop", () => ({ default: () => null }));
vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => null }));
vi.mock("../../../shared/components/AdminSidebar", () => ({ default: () => null }));

vi.mock("./CmtJahitTab", () => ({ default: () => <div data-testid="cmt-jahit-tab" /> }));
vi.mock("./CmtFullTab", () => ({ default: () => <div data-testid="cmt-full-tab" /> }));

import { MemoryRouter } from "react-router-dom";
import CmtPage from "./CmtPage";

function renderPage() {
  return render(
    <MemoryRouter>
      <CmtPage />
    </MemoryRouter>,
  );
}

describe("CmtPage", () => {
  it("default ke tab CMT Jahit", () => {
    renderPage();
    expect(screen.getByTestId("cmt-jahit-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("cmt-full-tab")).toBeNull();
  });

  it("klik tab CMT Full memunculkan CmtFullTab", () => {
    renderPage();
    fireEvent.click(screen.getByText("CMT Full"));
    expect(screen.getByTestId("cmt-full-tab")).toBeInTheDocument();
    expect(screen.queryByTestId("cmt-jahit-tab")).toBeNull();
  });
});
