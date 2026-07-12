import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import LoadingState from "./LoadingState";

describe("LoadingState", () => {
  it("variant='kpi' renders 4 skeleton kpi cards", () => {
    const { container } = render(<LoadingState variant="kpi" />);
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
    // 4 kartu, masing-masing berisi 2 blok pulse (label + value) = 8
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(8);
  });

  it("variant='list' (default) renders 4 skeleton rows by default", () => {
    const { container } = render(<LoadingState />);
    // 4 baris, masing-masing 2 blok pulse (rank+label, value) = 8, + 1 rank circle per baris = 4 -> total 12
    const rows = container.querySelectorAll(".divide-y > div");
    expect(rows).toHaveLength(4);
  });

  it("variant='list' respects custom rows count", () => {
    const { container } = render(<LoadingState variant="list" rows={2} />);
    const rows = container.querySelectorAll(".divide-y > div");
    expect(rows).toHaveLength(2);
  });

  it("variant='chart' renders a single chart-shaped skeleton block", () => {
    const { container } = render(<LoadingState variant="chart" />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(1);
  });

  it("does not throw for unknown variant, falls back to list", () => {
    const { container } = render(<LoadingState variant="unknown-variant" />);
    expect(container.querySelectorAll(".divide-y > div").length).toBeGreaterThan(0);
  });
});
