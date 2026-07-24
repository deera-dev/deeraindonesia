import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: (url) => url,
}));
vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("../../../shared/lib/salesUtils", () => ({
  getTotalStokVariant: vi.fn((product, size, loc) => {
    return product._stok ?? 5;
  }),
  getCombinedStokVariant: vi.fn((product, size) => {
    return product._combinedStok ?? 5;
  }),
}));

import ProductList from "./ProductList";

const p1 = {
  kode: "D-01",
  hpp: 80000,
  image: "img.jpg",
  warna: ["HITAM"],
  variants: [{ size: "Midi", harga: 100000 }],
  stokByWarna: {},
  _stok: 5,
};
const p1NoStok = { ...p1, kode: "D-02", _stok: 0 };
const p1Gabungan = { ...p1, kode: "D-03", _stok: 0, _combinedStok: 6 };

describe("ProductList", () => {
  it("shows loading text when loading=true", () => {
    render(<ProductList products={[]} showPhotos={false} location="gudang" loading={true} onAddItem={vi.fn()} />);
    expect(screen.getByText("Memuat produk...")).toBeInTheDocument();
  });

  it("shows empty message when no products", () => {
    render(<ProductList products={[]} showPhotos={false} location="gudang" loading={false} onAddItem={vi.fn()} />);
    expect(screen.getByText("Produk tidak ditemukan")).toBeInTheDocument();
  });

  it("renders product in teks mode", () => {
    render(<ProductList products={[p1]} showPhotos={false} location="gudang" loading={false} onAddItem={vi.fn()} />);
    expect(screen.getByText("D-01")).toBeInTheDocument();
  });

  it("renders product in foto mode", () => {
    render(<ProductList products={[p1]} showPhotos={true} location="gudang" loading={false} onAddItem={vi.fn()} />);
    expect(screen.getByText("D-01")).toBeInTheDocument();
  });

  it("calls onAddItem when variant button clicked (teks mode)", () => {
    const onAddItem = vi.fn();
    render(<ProductList products={[p1]} showPhotos={false} location="gudang" loading={false} onAddItem={onAddItem} />);
    fireEvent.click(screen.getByText("Midi"));
    expect(onAddItem).toHaveBeenCalledWith(p1, p1.variants[0]);
  });

  it("calls onAddItem in foto mode when stok > 0", () => {
    const onAddItem = vi.fn();
    render(<ProductList products={[p1]} showPhotos={true} location="gudang" loading={false} onAddItem={onAddItem} />);
    // Button shows size label "Midi" in foto mode inside variant button
    const midiBtns = screen.getAllByText("Midi");
    fireEvent.click(midiBtns[0]);
    expect(onAddItem).toHaveBeenCalled();
  });

  it("variant button disabled when stok=0 (teks mode)", () => {
    const onAddItem = vi.fn();
    render(<ProductList products={[p1NoStok]} showPhotos={false} location="gudang" loading={false} onAddItem={onAddItem} />);
    const midiBtns = screen.getAllByRole("button");
    midiBtns.forEach(btn => fireEvent.click(btn));
    expect(onAddItem).not.toHaveBeenCalled();
  });

  it("shows HABIS when stok=0 (teks mode)", () => {
    render(<ProductList products={[p1NoStok]} showPhotos={false} location="gudang" loading={false} onAddItem={vi.fn()} />);
    expect(screen.getByText("HABIS")).toBeInTheDocument();
  });

  it("shows warna count badge when product has warna", () => {
    render(<ProductList products={[p1]} showPhotos={false} location="gudang" loading={false} onAddItem={vi.fn()} />);
    expect(screen.getByText("1 warna")).toBeInTheDocument();
  });

  it("shows image in foto mode", () => {
    render(<ProductList products={[p1]} showPhotos={true} location="gudang" loading={false} onAddItem={vi.fn()} />);
    expect(screen.getByRole("img")).toBeInTheDocument();
  });

  it("hpp is shown in teks mode", () => {
    render(<ProductList products={[p1]} showPhotos={false} location="gudang" loading={false} onAddItem={vi.fn()} />);
    expect(screen.getByText(/80000/)).toBeInTheDocument();
  });

  // ── Mode gabungan ────────────────────────────────────────────────────────
  it("uses combined stok (3 lokasi) instead of stok lokasi aktif when gabungan=true (teks mode)", () => {
    render(
      <ProductList products={[p1Gabungan]} showPhotos={false} location="gudang" loading={false} gabungan={true} onAddItem={vi.fn()} />
    );
    // _stok=0 (lokasi aktif habis) tapi _combinedStok=6 -> tidak HABIS, tombol aktif
    expect(screen.queryByText("HABIS")).not.toBeInTheDocument();
    expect(screen.getByText("6 pcs")).toBeInTheDocument();
  });

  it("uses combined stok instead of stok lokasi aktif when gabungan=true (foto mode)", () => {
    const onAddItem = vi.fn();
    render(
      <ProductList products={[p1Gabungan]} showPhotos={true} location="gudang" loading={false} gabungan={true} onAddItem={onAddItem} />
    );
    const midiBtns = screen.getAllByText("Midi");
    fireEvent.click(midiBtns[0]);
    expect(onAddItem).toHaveBeenCalled();
  });

  it("falls back to stok lokasi aktif when gabungan=false (regression)", () => {
    render(
      <ProductList products={[p1Gabungan]} showPhotos={false} location="gudang" loading={false} gabungan={false} onAddItem={vi.fn()} />
    );
    // gabungan off -> pakai _stok=0 -> HABIS meski _combinedStok=6
    expect(screen.getByText("HABIS")).toBeInTheDocument();
  });
});
