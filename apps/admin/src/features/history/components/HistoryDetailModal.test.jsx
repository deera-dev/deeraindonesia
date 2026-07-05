import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("./HistoryDiffs", () => ({
  ProdukDiff: ({ before, after }) => (
    <div data-testid="produk-diff" data-before={JSON.stringify(before)} data-after={JSON.stringify(after)} />
  ),
  TransferDiff: ({ before, after, action }) => (
    <div data-testid="transfer-diff" data-action={action} />
  ),
  StokDiff: ({ before, after }) => (
    <div data-testid="stok-diff" />
  ),
}));

const { default: HistoryDetailModal } = await import("./HistoryDetailModal");

function makeItem(overrides = {}) {
  return {
    action: "tambah",
    category: "produk",
    kode: "D-01-OSK",
    nama: "Gamis Aisyah",
    changed_at: "2024-01-15T10:30:00Z",
    user_name: "Admin",
    snapshot: { nama: "Gamis Aisyah" },
    before_snapshot: null,
    ...overrides,
  };
}

describe("HistoryDetailModal", () => {
  it("renders nothing saat item null", () => {
    const { container } = render(<HistoryDetailModal item={null} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it("menampilkan kode dan nama produk di header", () => {
    render(<HistoryDetailModal item={makeItem()} onClose={vi.fn()} />);
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("Gamis Aisyah")).toBeInTheDocument();
  });

  it("menampilkan user_name di header", () => {
    render(<HistoryDetailModal item={makeItem()} onClose={vi.fn()} />);
    expect(screen.getByText(/Admin/)).toBeInTheDocument();
  });

  it("memanggil onClose saat klik backdrop", async () => {
    const onClose = vi.fn();
    const { container } = render(<HistoryDetailModal item={makeItem()} onClose={onClose} />);
    const backdrop = container.querySelector(".absolute.inset-0");
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("memanggil onClose saat klik tombol ×", async () => {
    const onClose = vi.fn();
    render(<HistoryDetailModal item={makeItem()} onClose={onClose} />);
    await userEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("memanggil onClose saat klik tombol Tutup", async () => {
    const onClose = vi.fn();
    render(<HistoryDetailModal item={makeItem()} onClose={onClose} />);
    await userEvent.click(screen.getByText(/tutup/i));
    expect(onClose).toHaveBeenCalled();
  });

  it("category=produk -> render ProdukDiff", () => {
    render(<HistoryDetailModal item={makeItem({ category: "produk" })} onClose={vi.fn()} />);
    expect(screen.getByTestId("produk-diff")).toBeInTheDocument();
  });

  it("category=transfer -> render TransferDiff dengan action", () => {
    const item = makeItem({ category: "transfer", action: "transfer-approve" });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    const diff = screen.getByTestId("transfer-diff");
    expect(diff).toBeInTheDocument();
    expect(diff.dataset.action).toBe("transfer-approve");
  });

  it("category=stok -> render StokDiff", () => {
    render(<HistoryDetailModal item={makeItem({ category: "stok", action: "stok-opname" })} onClose={vi.fn()} />);
    expect(screen.getByTestId("stok-diff")).toBeInTheDocument();
  });

  it("item tanpa category (undefined) -> render ProdukDiff", () => {
    render(<HistoryDetailModal item={makeItem({ category: undefined })} onClose={vi.fn()} />);
    expect(screen.getByTestId("produk-diff")).toBeInTheDocument();
  });

  // Pelanggan
  it("action pelanggan-tambah: menampilkan nama, no_hp, alamat dari snapshot", () => {
    const item = makeItem({
      action: "pelanggan-tambah",
      category: "produk",
      kode: undefined,
      snapshot: { nama: "Siti", no_hp: "08123", alamat: "Jl. Merdeka" },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("Siti")).toBeInTheDocument();
    expect(screen.getByText("08123")).toBeInTheDocument();
    expect(screen.getByText("Jl. Merdeka")).toBeInTheDocument();
  });

  it("action pelanggan-edit dengan before: menampilkan DiffRow perubahan", () => {
    const item = makeItem({
      action: "pelanggan-edit",
      category: "produk",
      snapshot: { nama: "Siti Baru", no_hp: "08123", alamat: "Jl. Baru" },
      before_snapshot: { nama: "Siti Lama", no_hp: "08123", alamat: "Jl. Lama" },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("Siti Lama")).toBeInTheDocument();
    expect(screen.getByText("Siti Baru")).toBeInTheDocument();
    expect(screen.getByText("Jl. Lama")).toBeInTheDocument();
    expect(screen.getByText("Jl. Baru")).toBeInTheDocument();
  });

  it("action pelanggan-hapus: menampilkan data snapshot tanpa diff", () => {
    const item = makeItem({
      action: "pelanggan-hapus",
      category: "produk",
      snapshot: { nama: "Siti", no_hp: "081", alamat: "Jl. X" },
      before_snapshot: null,
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("Siti")).toBeInTheDocument();
  });

  it("pelanggan-edit tanpa before -> tampil baris biasa, bukan diff", () => {
    const item = makeItem({
      action: "pelanggan-edit",
      category: "produk",
      snapshot: { nama: "Siti", no_hp: "081", alamat: "Jl. X" },
      before_snapshot: null,
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("Siti")).toBeInTheDocument();
  });

  // Produksi: batch-produksi
  it("produksi batch-produksi: menampilkan batch_no dan total_kain", () => {
    const item = makeItem({
      action: "batch-produksi",
      category: "produksi",
      snapshot: {
        batch_no: "B-001",
        tanggal: "2024-01-15",
        total_kain: 20,
        sizes: [{ size: "Midi", warna: [{ warna: "HITAM", qty: 10 }] }],
      },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("B-001")).toBeInTheDocument();
    expect(screen.getByText(/20 pcs/)).toBeInTheDocument();
  });

  // Produksi: hpp-simpan
  it("produksi hpp-simpan: menampilkan total_hpp dan bahan_items", () => {
    const item = makeItem({
      action: "hpp-simpan",
      category: "produksi",
      snapshot: {
        total_hpp: 85000,
        bahan_items: [{ nama_bahan: "Ceruti", qty_per_baju: 2, satuan: "meter" }],
      },
      before_snapshot: { total_hpp: 75000 },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText(/85\.000/)).toBeInTheDocument();
    expect(screen.getByText(/75\.000/)).toBeInTheDocument();
    expect(screen.getByText(/Ceruti/)).toBeInTheDocument();
  });

  // Produksi: hpp-hapus
  it("produksi hpp-hapus: menampilkan HPP Dihapus dengan nilai", () => {
    const item = makeItem({
      action: "hpp-hapus",
      category: "produksi",
      snapshot: { total_hpp: 60000 },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("HPP Dihapus")).toBeInTheDocument();
    expect(screen.getByText(/60\.000/)).toBeInTheDocument();
  });

  // Produksi: bahan-beli
  it("produksi bahan-beli: menampilkan nama_bahan, qty, supplier", () => {
    const item = makeItem({
      action: "bahan-beli",
      category: "produksi",
      snapshot: { nama_bahan: "Katun", kode_bahan: "KT01", qty: 5, satuan: "roll", total_harga: 250000, nama_supplier: "CV Maju" },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("Katun")).toBeInTheDocument();
    expect(screen.getByText(/5 roll/)).toBeInTheDocument();
    expect(screen.getByText("CV Maju")).toBeInTheDocument();
  });

  // Produksi: bahan-beli bulk
  it("produksi bahan-beli bulk: menampilkan jumlah baris", () => {
    const item = makeItem({
      action: "bahan-beli",
      category: "produksi",
      snapshot: { bulk: 12 },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText(/12 baris \(bulk\)/)).toBeInTheDocument();
  });

  // Produksi: bahan-pinjam
  it("produksi bahan-pinjam: menampilkan nama_pemberi", () => {
    const item = makeItem({
      action: "bahan-pinjam",
      category: "produksi",
      snapshot: { nama_bahan: "Sutra", qty: 3, satuan: "m", nama_pemberi: "Pak Budi" },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("Pak Budi")).toBeInTheDocument();
  });

  // Produksi: bahan-hapus
  it("produksi bahan-hapus: menampilkan sumber dan kode_bahan", () => {
    const item = makeItem({
      action: "bahan-hapus",
      category: "produksi",
      snapshot: { nama_bahan: "Ceruti", kode_bahan: "CR01", qty: 2, satuan: "m", sumber: "pembelian" },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("pembelian")).toBeInTheDocument();
    expect(screen.getByText("CR01")).toBeInTheDocument();
  });

  // Produksi: sampel-buat
  it("produksi sampel-buat: menampilkan nomor dan status", () => {
    const item = makeItem({
      action: "sampel-buat",
      category: "produksi",
      snapshot: { nomor: "S-001", tanggal: "2024-01-15", status: "pending" },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("S-001")).toBeInTheDocument();
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  // Produksi: sampel-approve
  it("produksi sampel-approve: menampilkan 'Approved' dan catatan perubahan", () => {
    const item = makeItem({
      action: "sampel-approve",
      category: "produksi",
      snapshot: { perubahan: "Warna disesuaikan" },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("Approved ✓")).toBeInTheDocument();
    expect(screen.getByText("Warna disesuaikan")).toBeInTheDocument();
  });

  it("produksi sampel-approve tanpa perubahan: tampil 'Sesuai referensi'", () => {
    const item = makeItem({
      action: "sampel-approve",
      category: "produksi",
      snapshot: {},
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText(/Sesuai referensi/)).toBeInTheDocument();
  });

  // Produksi: sampel-reject
  it("produksi sampel-reject: menampilkan 'Ditolak' dan alasan", () => {
    const item = makeItem({
      action: "sampel-reject",
      category: "produksi",
      snapshot: { rejection_note: "Jahitan tidak rapi" },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("Ditolak ✗")).toBeInTheDocument();
    expect(screen.getByText("Jahitan tidak rapi")).toBeInTheDocument();
  });

  // Produksi: sampel-edit
  it("produksi sampel-edit: menampilkan DiffRow perubahan nama/tanggal", () => {
    const item = makeItem({
      action: "sampel-edit",
      category: "produksi",
      snapshot: { nama: "Nama Baru", tanggal: "2024-02-01" },
      before_snapshot: { nama: "Nama Lama", tanggal: "2024-01-01" },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText("Nama Lama")).toBeInTheDocument();
    expect(screen.getByText("Nama Baru")).toBeInTheDocument();
  });

  // Produksi: unknown action -> JSON fallback
  it("produksi action tidak dikenal: menampilkan JSON snapshot", () => {
    const item = makeItem({
      action: "unknown-action",
      category: "produksi",
      snapshot: { foo: "bar" },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    expect(screen.getByText(/foo/)).toBeInTheDocument();
  });
});
