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

  // Produksi: unknown action -> JSON fallback
  it("produksi action tidak dikenal: menampilkan JSON fallback", () => {
    const item = makeItem({
      action: "aksi-tidak-dikenal",
      category: "produksi",
      snapshot: { kode: "D-99-OSK", data: "raw" },
    });
    render(<HistoryDetailModal item={item} onClose={vi.fn()} />);
    // JSON fallback — komponen tidak crash
    expect(screen.getByText(/D-99-OSK|raw|JSON/i)).toBeInTheDocument();
  });
});
