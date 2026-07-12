import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import InsightCard from "./InsightCard";

describe("InsightCard", () => {
  it("renders label and primary text", () => {
    render(<InsightCard label="Produk Terlaris" primary="Gamis Anggun Mewah Original" />);
    expect(screen.getByText("Produk Terlaris")).toBeInTheDocument();
    expect(screen.getByText("Gamis Anggun Mewah Original")).toBeInTheDocument();
  });

  it("renders metric when provided", () => {
    render(<InsightCard label="Produk Terlaris" primary="Gamis A" metric="15 pcs terjual" />);
    expect(screen.getByText("15 pcs terjual")).toBeInTheDocument();
  });

  it("does not render metric paragraph when metric is falsy", () => {
    const { container } = render(<InsightCard label="Produk Terlaris" primary="Gamis A" metric={null} />);
    // hanya label + primary yang dirender (2 <p>), tidak ada <p> ketiga untuk metric
    expect(container.querySelectorAll("p")).toHaveLength(2);
  });

  it("applies accent color to metric when accent=true", () => {
    render(<InsightCard label="Pasar Terbaik" primary="Cideng" metric="Rp 700.000 profit" accent />);
    expect(screen.getByText("Rp 700.000 profit").className).toContain("CAB170");
  });

  it("long primary text (product name) has no truncate/nowrap/overflow-hidden class and wraps freely", () => {
    const longName = "Gamis Anggun Mewah Original Edisi Terbatas Warna Eksklusif";
    render(<InsightCard label="Produk Terlaris" primary={longName} metric="10 pcs" />);
    const primaryEl = screen.getByText(longName);
    expect(primaryEl.className).not.toContain("truncate");
    expect(primaryEl.className).not.toContain("whitespace-nowrap");
    expect(primaryEl.className).not.toContain("overflow-hidden");
    expect(primaryEl.className).toContain("break-words");
  });

  it("label uses tight leading for multiline readability", () => {
    render(<InsightCard label="PRODUK PROFIT TERTINGGI" primary="Gamis A" />);
    expect(screen.getByText("PRODUK PROFIT TERTINGGI").className).toContain("leading-[1.15]");
  });
});
