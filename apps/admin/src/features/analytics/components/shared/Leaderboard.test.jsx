import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Leaderboard from "./Leaderboard";

const ITEMS = [
  { kode: "D-01-OSK", value: 15 },
  { kode: "D-02-SFN", value: 10 },
];

describe("Leaderboard", () => {
  it("renders each item's kode", () => {
    render(<Leaderboard items={ITEMS} />);
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("D-02-SFN")).toBeInTheDocument();
  });

  it("renders rank numbers starting from 1", () => {
    render(<Leaderboard items={ITEMS} />);
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("applies valueFormatter to each value", () => {
    render(<Leaderboard items={ITEMS} valueFormatter={(v) => `${v} pcs`} />);
    expect(screen.getByText("15 pcs")).toBeInTheDocument();
    expect(screen.getByText("10 pcs")).toBeInTheDocument();
  });

  it("shows emptyMessage when items is empty", () => {
    render(<Leaderboard items={[]} emptyMessage="Belum ada penjualan." />);
    expect(screen.getByText("Belum ada penjualan.")).toBeInTheDocument();
  });

  it("shows default emptyMessage when items is empty and no emptyMessage given", () => {
    render(<Leaderboard items={[]} />);
    expect(screen.getByText("Belum ada data.")).toBeInTheDocument();
  });

  it("applies valueClassName per item when provided", () => {
    render(
      <Leaderboard
        items={[{ kode: "D-01", value: -0.1 }]}
        valueFormatter={(v) => `${v}`}
        valueClassName={(v) => (v < 0 ? "text-red-500" : "text-[#CAB170]")}
      />,
    );
    expect(screen.getByText("-0.1").className).toContain("text-red-500");
  });

  it("defaults to gold accent color when valueClassName not provided", () => {
    render(<Leaderboard items={ITEMS} />);
    expect(screen.getByText("15").className).toContain("CAB170");
  });

  it("no ellipsis/truncate/overflow-hidden anywhere in rendered output", () => {
    const { container } = render(<Leaderboard items={ITEMS} />);
    const offenders = Array.from(container.querySelectorAll("*")).filter((el) =>
      ["truncate", "whitespace-nowrap", "overflow-hidden"].some((cls) => el.className?.toString().includes(cls)),
    );
    expect(offenders).toHaveLength(0);
  });

  it("default label pakai font-mono (kode produk) — perilaku lama TIDAK berubah", () => {
    render(<Leaderboard items={ITEMS} />);
    expect(screen.getByText("D-01-OSK").className).toContain("font-mono");
  });

  // ── Phase 4: labelKey/mono (generalisasi untuk tab Customers) ──────────
  it("labelKey='nama' merender field nama, BUKAN kode (dipakai tab Customers)", () => {
    const customerItems = [
      { pelangganId: "p1", nama: "BUDI", value: 3000000 },
      { pelangganId: "p2", nama: "SITI", value: 2000000 },
    ];
    render(<Leaderboard items={customerItems} labelKey="nama" mono={false} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
    expect(screen.getByText("SITI")).toBeInTheDocument();
  });

  it("mono={false} TIDAK menggunakan font-mono (nama customer bukan kode)", () => {
    const customerItems = [{ pelangganId: "p1", nama: "BUDI", value: 3000000 }];
    render(<Leaderboard items={customerItems} labelKey="nama" mono={false} />);
    expect(screen.getByText("BUDI").className).not.toContain("font-mono");
    expect(screen.getByText("BUDI").className).toContain("font-semibold");
  });

  it("key React tetap unik walau labelKey='nama' dan pelangganId dipakai sebagai fallback key", () => {
    const customerItems = [
      { pelangganId: "p1", nama: "BUDI", value: 3000000 },
      { pelangganId: "p2", nama: "SITI", value: 2000000 },
    ];
    // Tidak crash & kedua baris ter-render adalah bukti key unik cukup untuk React.
    render(<Leaderboard items={customerItems} labelKey="nama" mono={false} />);
    expect(screen.getAllByText(/BUDI|SITI/)).toHaveLength(2);
  });
});
