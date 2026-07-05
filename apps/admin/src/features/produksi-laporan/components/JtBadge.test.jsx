import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import JtBadge from "./JtBadge";

describe("JtBadge", () => {
  it("shows Lunas when status_bayar=lunas", () => {
    render(<JtBadge jatuh_tempo="2024-01-01" status_bayar="lunas" />);
    expect(screen.getByText("Lunas")).toBeInTheDocument();
  });

  it("shows 'Lewat Xh' for overdue (past date)", () => {
    render(<JtBadge jatuh_tempo="2000-01-01" status_bayar="belum" />);
    expect(screen.getByText(/Lewat/)).toBeInTheDocument();
  });

  it("shows 'Xh lagi' in amber for near future (≤30 days)", () => {
    // Use a date 10 days from now
    const d = new Date();
    d.setDate(d.getDate() + 10);
    const dateStr = d.toISOString().split("T")[0];
    render(<JtBadge jatuh_tempo={dateStr} status_bayar="belum" />);
    expect(screen.getByText(/lagi/)).toBeInTheDocument();
    expect(screen.getByText(/lagi/).className).toContain("amber");
  });

  it("shows 'Xh lagi' in muted style for far future (>30 days)", () => {
    render(<JtBadge jatuh_tempo="2099-12-31" status_bayar="belum" />);
    expect(screen.getByText(/lagi/)).toBeInTheDocument();
    // far future uses text-skin-text3 (no amber/red)
    expect(screen.getByText(/lagi/).className).not.toContain("amber");
    expect(screen.getByText(/lagi/).className).not.toContain("red");
  });
});
