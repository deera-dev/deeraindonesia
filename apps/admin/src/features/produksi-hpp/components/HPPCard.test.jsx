import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
  let onEdit, onDelete, onOpenDetail;
  beforeEach(() => {
    onEdit = vi.fn();
    onDelete = vi.fn();
    onOpenDetail = vi.fn();
  });

  it("renders kode_produk", () => {
    render(<HPPCard tpl={baseTpl} produk={{ nama: "Gamis Oskelin" }} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} />);
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
  });

  it("renders total_hpp formatted, prominently", () => {
    render(<HPPCard tpl={baseTpl} produk={{ nama: "Gamis Oskelin" }} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} />);
    expect(screen.getByText(/85\.000/)).toBeInTheDocument();
  });

  it("renders produk nama", () => {
    render(<HPPCard tpl={baseTpl} produk={{ nama: "Gamis Oskelin" }} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} />);
    expect(screen.getByText("Gamis Oskelin")).toBeInTheDocument();
  });

  it("shows — when produk is null", () => {
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} />);
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("calls onOpenDetail when card body clicked", async () => {
    const user = userEvent.setup();
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} />);
    await user.click(screen.getByText("D-07-OSK"));
    expect(onOpenDetail).toHaveBeenCalledWith(baseTpl);
  });

  it("calls onEdit from overflow menu without triggering onOpenDetail", async () => {
    const user = userEvent.setup();
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} />);
    await user.click(screen.getByLabelText(`Menu ${baseTpl.kode_produk}`));
    await user.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(baseTpl);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it("calls onDelete from overflow menu without triggering onOpenDetail", async () => {
    const user = userEvent.setup();
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} />);
    await user.click(screen.getByLabelText(`Menu ${baseTpl.kode_produk}`));
    await user.click(screen.getByText("Hapus"));
    expect(onDelete).toHaveBeenCalledWith(baseTpl);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it("does not show bahan detail inline (moved to detail sheet)", () => {
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} />);
    expect(screen.queryByText("Wolfis")).not.toBeInTheDocument();
  });

  it("shows gelaran badge when untuk_n_baju > 1", () => {
    const tplGelaran = { ...baseTpl, bahan_items: [{ ...baseTpl.bahan_items[0], untuk_n_baju: 3 }] };
    render(<HPPCard tpl={tplGelaran} produk={null} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} />);
    expect(screen.getByText("3 gelaran")).toBeInTheDocument();
  });

  it("menampilkan tombol Bagikan ketika onShare prop diberikan", () => {
    const onShare = vi.fn();
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} onShare={onShare} />);
    expect(screen.getByText("Bagikan")).toBeInTheDocument();
  });

  it("tidak menampilkan tombol Bagikan ketika onShare prop tidak diberikan", () => {
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} />);
    expect(screen.queryByText("Bagikan")).toBeNull();
  });

  it("klik tombol Bagikan memanggil onShare dengan tpl, tidak memicu onOpenDetail", async () => {
    const user = userEvent.setup();
    const onShare = vi.fn();
    render(<HPPCard tpl={baseTpl} produk={null} onEdit={onEdit} onDelete={onDelete} onOpenDetail={onOpenDetail} onShare={onShare} />);
    await user.click(screen.getByText("Bagikan"));
    expect(onShare).toHaveBeenCalledWith(baseTpl);
    expect(onOpenDetail).not.toHaveBeenCalled();
  });
});
