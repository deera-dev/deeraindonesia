import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("./HPPShareModal", () => ({
  default: ({ onClose }) => <div data-testid="hpp-share-modal"><button onClick={onClose}>close-share</button></div>,
}));

import HPPCard from "./HPPCard";

const baseTpl = {
  id: "t1",
  kode_produk: "D-07-OSK",
  total_hpp: 85000,
  bahan_items: [
    { nama_bahan: "Wolfis", jenis: "motif", qty_per_baju: 2, harga_satuan: 15000, satuan: "yard", subtotal: 30000, untuk_n_baju: 1, warna_qtys: [] },
  ],
};

describe("HPPCard", () => {
  let onEdit, onDelete;
  beforeEach(() => {
    onEdit = vi.fn();
    onDelete = vi.fn();
  });

  it("renders kode_produk", () => {
    render(<HPPCard tpl={baseTpl} produk={{ nama: "Gamis Oskelin" }} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
  });

  it("renders total_hpp formatted", () => {
    render(<HPPCard tpl={baseTpl} produk={{ nama: "Gamis Oskelin" }} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText(/85\.000/)).toBeInTheDocument();
  });

  it("renders produk nama", () => {
    render(<HPPCard tpl={baseTpl} produk={{ nama: "Gamis Oskelin" }} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText("Gamis Oskelin")).toBeInTheDocument();
  });

  it("shows — when produk is null", () => {
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("calls onEdit when Edit clicked", async () => {
    const user = userEvent.setup();
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(baseTpl);
  });

  it("calls onDelete when × clicked", async () => {
    const user = userEvent.setup();
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("×"));
    expect(onDelete).toHaveBeenCalledWith(baseTpl);
  });

  it("shows bahan detail when Detail expanded", async () => {
    const user = userEvent.setup();
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Detail"));
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
  });

  it("toggles to Tutup when expanded", async () => {
    const user = userEvent.setup();
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Detail"));
    expect(screen.getByText("Tutup")).toBeInTheDocument();
  });

  it("shows gelaran label when untuk_n_baju > 1", () => {
    const tplGelaran = { ...baseTpl, bahan_items: [{ ...baseTpl.bahan_items[0], untuk_n_baju: 3 }] };
    render(<HPPCard tpl={tplGelaran} produk={null} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText(/Gelaran: 3/)).toBeInTheDocument();
  });

  it("menampilkan tombol Share", () => {
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText("Share")).toBeInTheDocument();
  });

  it("klik Share membuka HPPShareModal", async () => {
    const user = userEvent.setup();
    render(<HPPCard tpl={baseTpl} produk={{ nama: "Gamis Oskelin" }} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Share"));
    expect(screen.getByTestId("hpp-share-modal")).toBeInTheDocument();
  });

  it("close di dalam HPPShareModal menutup share modal", async () => {
    const user = userEvent.setup();
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Share"));
    expect(screen.getByTestId("hpp-share-modal")).toBeInTheDocument();
    await user.click(screen.getByText("close-share"));
    expect(screen.queryByTestId("hpp-share-modal")).toBeNull();
  });
});
