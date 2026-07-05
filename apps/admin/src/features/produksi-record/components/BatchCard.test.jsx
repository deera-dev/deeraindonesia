import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BatchCard from "./BatchCard";

const baseBatch = {
  id: "b1", kode_produk: "D-07-OSK", nama_produk: "Gamis Oskelin",
  batch_no: "PROD-20240101-123", tanggal_produksi: "2024-01-01",
  total_kain: 50, hpp_per_item: 85000,
  sizes: [{ size: "Midi", warna: [{ warna: "HITAM", qty: 30 }, { warna: "MERAH", qty: 20 }] }],
  bahan_dipakai: [{ nama_bahan: "Wolfis", satuan: "yard", jumlah: 100 }],
  catatan: "Test catatan",
};

describe("BatchCard", () => {
  let onEdit, onDelete;
  beforeEach(() => { onEdit = vi.fn(); onDelete = vi.fn(); });

  it("renders kode_produk and nama_produk", () => {
    render(<BatchCard batch={baseBatch} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
    expect(screen.getByText("Gamis Oskelin")).toBeInTheDocument();
  });

  it("shows batch_no and total_kain", () => {
    render(<BatchCard batch={baseBatch} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText(/PROD-20240101-123/)).toBeInTheDocument();
    expect(screen.getByText(/50 potong/)).toBeInTheDocument();
  });

  it("shows hpp_per_item when > 0", () => {
    render(<BatchCard batch={baseBatch} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.getByText(/85\.000/)).toBeInTheDocument();
  });

  it("does not show hpp when hpp_per_item is 0", () => {
    render(<BatchCard batch={{ ...baseBatch, hpp_per_item: 0 }} onEdit={onEdit} onDelete={onDelete} />);
    expect(screen.queryByText(/baju/)).not.toBeInTheDocument();
  });

  it("calls onEdit when Edit clicked", async () => {
    const user = userEvent.setup();
    render(<BatchCard batch={baseBatch} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(baseBatch);
  });

  it("calls onDelete when × clicked", async () => {
    const user = userEvent.setup();
    render(<BatchCard batch={baseBatch} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("×"));
    expect(onDelete).toHaveBeenCalledWith(baseBatch);
  });

  it("expands detail when Detail clicked", async () => {
    const user = userEvent.setup();
    render(<BatchCard batch={baseBatch} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Detail"));
    // bahan_dipakai renders as "{nama_bahan}: {jumlah} {satuan}"
    expect(screen.getByText(/Wolfis/)).toBeInTheDocument();
    // warna renders as "{warna}: {qty} potong"
    expect(screen.getByText(/HITAM/)).toBeInTheDocument();
    expect(screen.getByText("Test catatan")).toBeInTheDocument();
  });

  it("shows Tutup when expanded", async () => {
    const user = userEvent.setup();
    render(<BatchCard batch={baseBatch} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Detail"));
    expect(screen.getByText("Tutup")).toBeInTheDocument();
  });

  it("collapses when Tutup clicked", async () => {
    const user = userEvent.setup();
    render(<BatchCard batch={baseBatch} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Detail"));
    await user.click(screen.getByText("Tutup"));
    expect(screen.queryByText("Test catatan")).not.toBeInTheDocument();
  });

  it("shows tanpa warna label when warna is _", async () => {
    const user = userEvent.setup();
    const batchWithBlankWarna = {
      ...baseBatch,
      sizes: [{ size: "Midi", warna: [{ warna: "_", qty: 10 }] }],
    };
    render(<BatchCard batch={batchWithBlankWarna} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Detail"));
    expect(screen.getByText(/tanpa warna/)).toBeInTheDocument();
  });

  it("shows no bahan section when bahan_dipakai is empty", async () => {
    const user = userEvent.setup();
    render(<BatchCard batch={{ ...baseBatch, bahan_dipakai: [] }} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Detail"));
    expect(screen.queryByText(/Bahan Dipakai/)).not.toBeInTheDocument();
  });

  it("shows no catatan when catatan is empty", async () => {
    const user = userEvent.setup();
    render(<BatchCard batch={{ ...baseBatch, catatan: "" }} onEdit={onEdit} onDelete={onDelete} />);
    await user.click(screen.getByText("Detail"));
    expect(screen.queryByText("Test catatan")).not.toBeInTheDocument();
  });
});
