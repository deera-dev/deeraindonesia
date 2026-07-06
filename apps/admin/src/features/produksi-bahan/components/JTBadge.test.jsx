import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import JTBadge from "./JTBadge";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("JTBadge", () => {
  it("shows 'Lunas' badge when status_bayar=lunas", () => {
    render(<JTBadge status_bayar="lunas" jatuh_tempo="2024-01-01" />);
    expect(screen.getByText("Lunas")).toBeInTheDocument();
  });
  it("returns null when status_bayar is not lunas and jatuh_tempo is null", () => {
    const { container } = render(<JTBadge status_bayar="belum" jatuh_tempo={null} />);
    expect(container.firstChild).toBeNull();
  });
  it("shows 'Lewat Xh' badge when jatuh_tempo is in the past", () => {
    vi.setSystemTime(new Date("2024-05-20T00:00:00.000Z"));
    render(<JTBadge status_bayar="belum" jatuh_tempo="2024-05-10" />);
    expect(screen.getByText(/Lewat/)).toBeInTheDocument();
    expect(screen.getByText(/10h/)).toBeInTheDocument();
  });
  it("shows 'Xh lagi' amber badge when ≤30 days", () => {
    vi.setSystemTime(new Date("2024-05-01T00:00:00.000Z"));
    render(<JTBadge status_bayar="belum" jatuh_tempo="2024-05-15" />);
    const badge = screen.getByText(/14h lagi/);
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("amber");
  });
  it("shows 'Xh lagi' muted badge when >30 days", () => {
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"));
    render(<JTBadge status_bayar="belum" jatuh_tempo="2024-03-01" />);
    const badge = screen.getByText(/h lagi/);
    expect(badge).toBeInTheDocument();
    // muted class (bg-skin-raised)
    expect(badge.className).toContain("bg-skin-raised");
  });
});
