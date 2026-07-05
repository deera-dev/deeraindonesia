import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("../../../shared/lib/salesUtils", () => ({
  effectiveQty: (item) => Array.isArray(item.warna)
    ? item.warna.reduce((s, w) => s + w.qty, 0)
    : item.qty,
}));
vi.mock("./PriceEditor", () => ({
  default: ({ harga, onSave, onCancel }) => (
    <div data-testid="price-editor">
      <button onClick={() => onSave(harga)} data-testid="pe-save">save</button>
      <button onClick={onCancel} data-testid="pe-cancel">cancel</button>
    </div>
  ),
}));

import CartItem from "./CartItem";

const baseProps = {
  isEditingPrice: false,
  onEditPrice: vi.fn(),
  onSavePrice: vi.fn(),
  onCancelPrice: vi.fn(),
  onUpdateQty: vi.fn(),
  onRemove: vi.fn(),
  onEditWarna: vi.fn(),
};

const simpleItem = { key: "D-01-Midi", kode: "D-01", size: "Midi", harga: 100000, qty: 2, warna: null };
const warnaItem = {
  key: "D-01-Midi", kode: "D-01", size: "Midi", harga: 100000, qty: null,
  warna: [{ nama: "HITAM", qty: 2 }, { nama: "MERAH", qty: 1 }],
};

describe("CartItem", () => {
  it("renders kode and size", () => {
    render(<CartItem item={simpleItem} {...baseProps} />);
    expect(screen.getByText(/D-01/)).toBeInTheDocument();
    expect(screen.getByText(/Midi/)).toBeInTheDocument();
  });

  it("renders harga", () => {
    render(<CartItem item={simpleItem} {...baseProps} />);
    expect(screen.getByText(/100000/)).toBeInTheDocument();
  });

  it("calls onEditPrice when tapping price label", () => {
    const onEditPrice = vi.fn();
    render(<CartItem item={simpleItem} {...baseProps} onEditPrice={onEditPrice} />);
    fireEvent.click(screen.getByTitle("Tap untuk ubah harga"));
    expect(onEditPrice).toHaveBeenCalled();
  });

  it("shows PriceEditor when isEditingPrice=true", () => {
    render(<CartItem item={simpleItem} {...baseProps} isEditingPrice={true} />);
    expect(screen.getByTestId("price-editor")).toBeInTheDocument();
  });

  it("simple item: renders stepper buttons", () => {
    render(<CartItem item={simpleItem} {...baseProps} />);
    expect(screen.getByLabelText("Tambah")).toBeInTheDocument();
    expect(screen.getByLabelText("Kurangi")).toBeInTheDocument();
  });

  it("simple item: qty displays correctly", () => {
    render(<CartItem item={simpleItem} {...baseProps} />);
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("simple item: calls onUpdateQty(+1) on tambah click", () => {
    const onUpdateQty = vi.fn();
    render(<CartItem item={simpleItem} {...baseProps} onUpdateQty={onUpdateQty} />);
    fireEvent.click(screen.getByLabelText("Tambah"));
    expect(onUpdateQty).toHaveBeenCalledWith(1);
  });

  it("simple item: calls onUpdateQty(-1) on kurangi click", () => {
    const onUpdateQty = vi.fn();
    render(<CartItem item={simpleItem} {...baseProps} onUpdateQty={onUpdateQty} />);
    fireEvent.click(screen.getByLabelText("Kurangi"));
    expect(onUpdateQty).toHaveBeenCalledWith(-1);
  });

  it("calls onRemove on hapus click", () => {
    const onRemove = vi.fn();
    render(<CartItem item={simpleItem} {...baseProps} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText("Hapus item"));
    expect(onRemove).toHaveBeenCalled();
  });

  it("warna item: renders each warna nama", () => {
    render(<CartItem item={warnaItem} {...baseProps} />);
    expect(screen.getByText(/HITAM/)).toBeInTheDocument();
    expect(screen.getByText(/MERAH/)).toBeInTheDocument();
  });

  it("warna item: shows Ubah Warna button", () => {
    render(<CartItem item={warnaItem} {...baseProps} />);
    expect(screen.getByText("Ubah Warna")).toBeInTheDocument();
  });

  it("warna item: calls onEditWarna on Ubah Warna click", () => {
    const onEditWarna = vi.fn();
    render(<CartItem item={warnaItem} {...baseProps} onEditWarna={onEditWarna} />);
    fireEvent.click(screen.getByText("Ubah Warna"));
    expect(onEditWarna).toHaveBeenCalled();
  });

  it("simple item: no Ubah Warna button", () => {
    render(<CartItem item={simpleItem} {...baseProps} />);
    expect(screen.queryByText("Ubah Warna")).not.toBeInTheDocument();
  });
});
