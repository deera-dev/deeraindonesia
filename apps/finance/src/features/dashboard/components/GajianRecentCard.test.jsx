import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
  fmtTanggalPendek: vi.fn((v) => v || ""),
}));

import GajianRecentCard from "./GajianRecentCard";

const gDraft = {
  id: "g1",
  tanggal_sabtu: "2026-07-04",
  status: "draft",
  total_gaji: 3000000,
  total_potong: 500000,
  total_jahit: 1000000,
};

const gFinal = { ...gDraft, status: "final" };

describe("GajianRecentCard", () => {
  it("renders tanggal_sabtu", () => {
    render(<GajianRecentCard g={gDraft} onClick={vi.fn()} />);
    expect(screen.getByText(/2026-07-04/)).toBeInTheDocument();
  });

  it("renders total_gaji", () => {
    render(<GajianRecentCard g={gDraft} onClick={vi.fn()} />);
    expect(screen.getByText("Rp3000000")).toBeInTheDocument();
  });

  it("renders status badge draft", () => {
    render(<GajianRecentCard g={gDraft} onClick={vi.fn()} />);
    expect(screen.getByText("draft")).toBeInTheDocument();
  });

  it("renders status badge final with emerald color", () => {
    render(<GajianRecentCard g={gFinal} onClick={vi.fn()} />);
    const badge = screen.getByText("final");
    expect(badge.className).toContain("emerald");
  });

  it("renders breakdown tim labels when values > 0", () => {
    render(<GajianRecentCard g={gDraft} onClick={vi.fn()} />);
    expect(screen.getByText(/Potong/)).toBeInTheDocument();
    expect(screen.getByText(/Jahit/)).toBeInTheDocument();
  });

  it("does not render breakdown labels with zero value", () => {
    const g = { ...gDraft, total_potong: 0, total_jahit: 0 };
    render(<GajianRecentCard g={g} onClick={vi.fn()} />);
    expect(screen.queryByText(/Potong/)).toBeNull();
  });

  it("calls onClick when card clicked", () => {
    const onClick = vi.fn();
    render(<GajianRecentCard g={gDraft} onClick={onClick} />);
    fireEvent.click(screen.getByText(/2026-07-04/).closest("div.bg-skin-card"));
    expect(onClick).toHaveBeenCalled();
  });
});
