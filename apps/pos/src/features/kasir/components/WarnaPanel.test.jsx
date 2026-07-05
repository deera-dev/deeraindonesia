import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  getMarketLabel: vi.fn(() => "Gudang"),
}));
vi.mock("../../../shared/lib/salesUtils", () => ({
  getStokWarna: vi.fn((product, size, warna, loc) => {
    return product._stokMap?.[warna] ?? 5;
  }),
}));

import WarnaPanel from "./WarnaPanel";

const product = {
  kode: "D-01",
  hpp: 80000,
  warna: ["HITAM", "MERAH"],
  _stokMap: { HITAM: 5, MERAH: 3 },
};
const variant = { size: "Midi", harga: 100000 };
const warnaPanel = { product, variant };

const baseProps = {
  warnaPanel,
  selectedWarna: {},
  location: "gudang",
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  onSelectAll: vi.fn(),
  onReset: vi.fn(),
  onSetWarna: vi.fn(),
};

describe("WarnaPanel", () => {
  it("returns null when warnaPanel=null", () => {
    const { container } = render(<WarnaPanel {...baseProps} warnaPanel={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows product kode and size", () => {
    render(<WarnaPanel {...baseProps} />);
    expect(screen.getByText("D-01")).toBeInTheDocument();
    expect(screen.getByText(/Midi/)).toBeInTheDocument();
  });

  it("shows all warna options", () => {
    render(<WarnaPanel {...baseProps} />);
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("MERAH")).toBeInTheDocument();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<WarnaPanel {...baseProps} onClose={onClose} />);
    // backdrop is the absolutely-positioned div
    const backdrop = document.querySelector(".absolute.inset-0");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when × button clicked", () => {
    const onClose = vi.fn();
    render(<WarnaPanel {...baseProps} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onSelectAll when Seri Penuh clicked", () => {
    const onSelectAll = vi.fn();
    render(<WarnaPanel {...baseProps} onSelectAll={onSelectAll} />);
    fireEvent.click(screen.getByText(/Seri Penuh/));
    expect(onSelectAll).toHaveBeenCalled();
  });

  it("calls onReset when Reset clicked", () => {
    const onReset = vi.fn();
    render(<WarnaPanel {...baseProps} onReset={onReset} />);
    fireEvent.click(screen.getByText("Reset"));
    expect(onReset).toHaveBeenCalled();
  });

  it("calls onSetWarna when warna checkbox button clicked", () => {
    const onSetWarna = vi.fn();
    render(<WarnaPanel {...baseProps} onSetWarna={onSetWarna} />);
    // clicking HITAM checkbox (not selected → sets qty=1)
    fireEvent.click(screen.getAllByRole("button").find(b => b.textContent.includes("HITAM")));
    expect(onSetWarna).toHaveBeenCalledWith("HITAM", 1);
  });

  it("konfirmasi button disabled when nothing selected", () => {
    render(<WarnaPanel {...baseProps} selectedWarna={{}} />);
    expect(screen.getByText("Tambah ke Pesanan")).toBeDisabled();
  });

  it("konfirmasi button enabled when something selected", () => {
    render(<WarnaPanel {...baseProps} selectedWarna={{ HITAM: 2 }} />);
    expect(screen.getByText("Tambah ke Pesanan")).not.toBeDisabled();
  });

  it("calls onConfirm when Tambah ke Pesanan clicked", () => {
    const onConfirm = vi.fn();
    render(<WarnaPanel {...baseProps} selectedWarna={{ HITAM: 1 }} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText("Tambah ke Pesanan"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("shows qty stepper when warna is selected", () => {
    render(<WarnaPanel {...baseProps} selectedWarna={{ HITAM: 2 }} />);
    expect(screen.getByLabelText("Kurangi")).toBeInTheDocument();
    expect(screen.getByLabelText("Tambah")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("shows habis label when stok=0", () => {
    const productNoStok = { ...product, _stokMap: { HITAM: 0, MERAH: 3 } };
    render(<WarnaPanel {...baseProps} warnaPanel={{ product: productNoStok, variant }} />);
    expect(screen.getByText("habis")).toBeInTheDocument();
  });

  it("shows total amount when warna selected", () => {
    render(<WarnaPanel {...baseProps} selectedWarna={{ HITAM: 2, MERAH: 1 }} />);
    // totalRp = 3 * 100000 = 300000
    expect(screen.getByText(/300000/)).toBeInTheDocument();
  });

  it("shows location label", () => {
    render(<WarnaPanel {...baseProps} />);
    expect(screen.getByText(/Gudang/)).toBeInTheDocument();
  });
});
