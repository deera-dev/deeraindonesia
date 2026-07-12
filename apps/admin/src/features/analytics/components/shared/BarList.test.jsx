import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import BarList from "./BarList";

const ITEMS = [
  { label: "Senin", value: 500000 },
  { label: "Selasa", value: 100000 },
  { label: "Rabu", value: 0 },
];

describe("BarList", () => {
  it("renders each item's label in urutan APA ADANYA (tidak diurutkan ulang berdasarkan value)", () => {
    render(<BarList items={ITEMS} />);
    const labels = screen.getAllByText(/Senin|Selasa|Rabu/).map((el) => el.textContent);
    expect(labels).toEqual(["Senin", "Selasa", "Rabu"]);
  });

  it("applies valueFormatter to each value", () => {
    render(<BarList items={ITEMS} valueFormatter={(v) => `Rp ${v}`} />);
    expect(screen.getByText("Rp 500000")).toBeInTheDocument();
    expect(screen.getByText("Rp 100000")).toBeInTheDocument();
    expect(screen.getByText("Rp 0")).toBeInTheDocument();
  });

  it("shows emptyMessage when items is empty", () => {
    render(<BarList items={[]} emptyMessage="Belum ada performa." />);
    expect(screen.getByText("Belum ada performa.")).toBeInTheDocument();
  });

  it("shows default emptyMessage when items is empty and no emptyMessage given", () => {
    render(<BarList items={[]} />);
    expect(screen.getByText("Belum ada data.")).toBeInTheDocument();
  });

  it("bar item dengan value tertinggi mendapat lebar 100%, sisanya proporsional", () => {
    const { container } = render(<BarList items={ITEMS} />);
    const bars = container.querySelectorAll("[style]");
    // Item pertama (Senin, value tertinggi 500000) -> width 100%
    expect(bars[0].getAttribute("style")).toContain("width: 100%");
    // Item kedua (Selasa, 100000/500000 = 20%)
    expect(bars[1].getAttribute("style")).toContain("width: 20%");
    // Item ketiga (Rabu, value 0) -> width 0%
    expect(bars[2].getAttribute("style")).toContain("width: 0%");
  });

  it("tidak ada rank badge bernomor (BEDA dari Leaderboard — urutan di sini bukan ranking)", () => {
    render(<BarList items={ITEMS} />);
    // Leaderboard menampilkan badge nomor urut "1", "2", dst — BarList tidak.
    expect(screen.queryByText("1")).not.toBeInTheDocument();
  });
});
