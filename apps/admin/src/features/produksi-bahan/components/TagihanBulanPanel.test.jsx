import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TagihanBulanPanel from "./TagihanBulanPanel";

// Items with belum status and jatuh_tempo
const pembelianItems = [
  { id: 1, status_bayar: "belum", jatuh_tempo: "2024-03-15", total_harga: 50000, nama_bahan: "Wolfis", motif: null, tanggal: "2024-02-01", jumlah: 5, satuan: "yard" },
  { id: 2, status_bayar: "belum", jatuh_tempo: "2024-04-01", total_harga: 30000, nama_bahan: "Sifon",  motif: "Bunga", tanggal: "2024-02-15", jumlah: 3, satuan: "yard" },
  { id: 3, status_bayar: "lunas", jatuh_tempo: "2024-03-20", total_harga: 20000, nama_bahan: "Katun",  motif: null, tanggal: "2024-02-10", jumlah: 2, satuan: "meter" },
];

describe("TagihanBulanPanel", () => {
  it("returns null when no belum-lunas items with jatuh_tempo", () => {
    const { container } = render(<TagihanBulanPanel items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when all items are lunas", () => {
    const lunas = [{ status_bayar: "lunas", jatuh_tempo: "2024-03-01", total_harga: 5000 }];
    const { container } = render(<TagihanBulanPanel items={lunas} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows grand total of belum-lunas items", () => {
    render(<TagihanBulanPanel items={pembelianItems} />);
    // 50000 + 30000 = 80000
    expect(screen.getByText(/80\.000/)).toBeInTheDocument();
  });

  it("expands when header button clicked", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    // Not expanded initially — group items not visible
    expect(screen.queryByText("Wolfis")).not.toBeInTheDocument();
    // Click to expand
    const btn = screen.getByText(/Tagihan per Bulan/).closest("button");
    await user.click(btn);
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
  });

  it("shows Bagikan ke WhatsApp button when expanded", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    await user.click(screen.getByText(/Tagihan per Bulan/).closest("button"));
    expect(screen.getByText(/Bagikan ke WhatsApp/i)).toBeInTheDocument();
  });

  it("shows ShareTagihanModal when Bagikan clicked", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    await user.click(screen.getByText(/Tagihan per Bulan/).closest("button"));
    await user.click(screen.getByText(/Bagikan ke WhatsApp/i));
    // ShareTagihanModal renders "Bagikan Tagihan" heading
    expect(screen.getByText("Bagikan Tagihan")).toBeInTheDocument();
  });

  it("closes ShareTagihanModal when × clicked", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    await user.click(screen.getByText(/Tagihan per Bulan/).closest("button"));
    await user.click(screen.getByText(/Bagikan ke WhatsApp/i));
    await user.click(screen.getByText("×"));
    expect(screen.queryByText("Bagikan Tagihan")).not.toBeInTheDocument();
  });

  it("shows motif when present", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    await user.click(screen.getByText(/Tagihan per Bulan/).closest("button"));
    expect(screen.getByText(/Bunga/)).toBeInTheDocument();
  });

  it("collapses when header clicked again", async () => {
    const user = userEvent.setup();
    render(<TagihanBulanPanel items={pembelianItems} />);
    const btn = screen.getByText(/Tagihan per Bulan/).closest("button");
    await user.click(btn); // expand
    await user.click(btn); // collapse); // collapse
    expect(screen.queryByText(/Bunga/)).not.toBeInTheDocument();
  });
});
