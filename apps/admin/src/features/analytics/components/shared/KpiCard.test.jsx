import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import KpiCard from "./KpiCard";

describe("KpiCard", () => {
  it("renders label and value", () => {
    render(<KpiCard label="Total Revenue" value="Rp 5,0 jt" />);
    expect(screen.getByText("Total Revenue")).toBeInTheDocument();
    expect(screen.getByText("Rp 5,0 jt")).toBeInTheDocument();
  });

  it("renders sub text when provided", () => {
    render(<KpiCard label="Total Customer" value="12" sub="pelanggan" />);
    expect(screen.getByText("pelanggan")).toBeInTheDocument();
  });

  it("does not render sub when not provided", () => {
    render(<KpiCard label="X" value="0" />);
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });

  it("applies accent class when accent=true", () => {
    render(<KpiCard label="Label" value="99" accent />);
    expect(screen.getByText("99").className).toContain("CAB170");
  });

  it("applies warn class when warn=true", () => {
    render(<KpiCard label="Profit" value="1000000" warn />);
    expect(screen.getByText("1000000").className).toContain("amber");
  });

  it("value stays large (text-2xl/text-3xl) regardless of how long the text is — never shrinks", () => {
    render(<KpiCard label="Average Order Value" value="Rp 123.456.789" />);
    const valueEl = screen.getByText("Rp 123.456.789");
    expect(valueEl.className).toContain("text-2xl");
    expect(valueEl.className).toContain("sm:text-3xl");
    expect(valueEl.className).not.toContain("text-lg");
  });

  it("label is never truncated — no truncate/whitespace-nowrap/overflow-hidden class, allows wrapping", () => {
    render(<KpiCard label="AVERAGE ORDER VALUE" value="Rp 500.000" />);
    const labelEl = screen.getByText("AVERAGE ORDER VALUE");
    expect(labelEl.className).not.toContain("truncate");
    expect(labelEl.className).not.toContain("whitespace-nowrap");
    expect(labelEl.className).not.toContain("overflow-hidden");
    expect(labelEl.className).toContain("break-words");
  });

  it("label uses a tight leading (~1.15) for multiline readability", () => {
    render(<KpiCard label="PRODUK PROFIT TERTINGGI" value="Rp 1,0 jt" />);
    expect(screen.getByText("PRODUK PROFIT TERTINGGI").className).toContain("leading-[1.15]");
  });

  // ── Redesign UX "owner toko non-teknis" (2026-07) — prop `hint` (BARU) ──
  it("renders hint text when provided (penjelasan istilah, BUKAN tooltip)", () => {
    render(<KpiCard label="Margin" value="24%" hint="Persentase keuntungan dari penjualan." />);
    expect(screen.getByText("Persentase keuntungan dari penjualan.")).toBeInTheDocument();
  });

  it("does not render hint when not provided (100% backward compatible)", () => {
    render(<KpiCard label="X" value="0" />);
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });

  it("sub dan hint bisa tampil BERSAMAAN (beda tujuan: sub=konteks, hint=penjelasan istilah)", () => {
    render(
      <KpiCard
        label="Lifetime Value"
        value="Rp 4,0 jt"
        sub="rata-rata, all-time"
        hint="Perkiraan total belanja 1 pelanggan sepanjang waktu."
      />,
    );
    expect(screen.getByText("rata-rata, all-time")).toBeInTheDocument();
    expect(screen.getByText("Perkiraan total belanja 1 pelanggan sepanjang waktu.")).toBeInTheDocument();
  });

  it("hint tidak pernah truncate/ellipsis, boleh membungkus", () => {
    render(
      <KpiCard
        label="Days of Inventory"
        value="45 hari"
        hint="Perkiraan berapa hari stok masih cukup jika penjualan tetap seperti sekarang."
      />,
    );
    const hintEl = screen.getByText("Perkiraan berapa hari stok masih cukup jika penjualan tetap seperti sekarang.");
    expect(hintEl.className).not.toContain("truncate");
    expect(hintEl.className).not.toContain("whitespace-nowrap");
    expect(hintEl.className).toContain("break-words");
  });
});
