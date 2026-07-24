import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/constants", () => ({
  formatHarga: (n) => String(n),
}));
vi.mock("@deera/shared/lib/marketDay", () => ({
  getMarketLabel: vi.fn(() => "Gudang"),
  LOCATIONS: ["gudang", "cideng", "tegalgubug"],
}));
vi.mock("../../../shared/lib/salesUtils", () => ({
  getStokWarna: vi.fn((product, size, warna, loc) => {
    return product._stokMap?.[warna] ?? 5;
  }),
  getStokAllLocations: vi.fn((product, size, warna) => {
    return product._stokAllLoc?.[warna] ?? { gudang: 5, cideng: 0, tegalgubug: 0 };
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

// Produk dengan stok tersebar di beberapa lokasi — dipakai utk test mode gabungan
const productMulti = {
  kode: "D-02",
  hpp: 60000,
  warna: ["HITAM"],
  _stokAllLoc: { HITAM: { gudang: 4, cideng: 2, tegalgubug: 0 } },
};
const warnaPanelMulti = { product: productMulti, variant };

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

  // ── Mode gabungan ────────────────────────────────────────────────────────
  describe("mode gabungan", () => {
    it("does not render per-location steppers when gabungan=false (regression)", () => {
      render(<WarnaPanel {...baseProps} selectedWarna={{ HITAM: 2 }} />);
      expect(screen.queryByText("GD · 5 pcs")).not.toBeInTheDocument();
    });

    it("shows per-location stok when a warna is selected", () => {
      render(
        <WarnaPanel
          {...baseProps}
          warnaPanel={warnaPanelMulti}
          gabungan={true}
          selectedWarna={{ HITAM: 6 }}
          selectedBreakdown={{ HITAM: { gudang: 4, cideng: 2 } }}
        />
      );
      expect(screen.getByText("GD · 4 pcs")).toBeInTheDocument();
      expect(screen.getByText("CD · 2 pcs")).toBeInTheDocument();
      expect(screen.getByText("TG · 0 pcs")).toBeInTheDocument();
    });

    it("clicking checkbox on unselected warna assigns qty 1 to active location", () => {
      const onSetWarnaLoc = vi.fn();
      render(
        <WarnaPanel
          {...baseProps}
          warnaPanel={warnaPanelMulti}
          gabungan={true}
          onSetWarnaLoc={onSetWarnaLoc}
        />
      );
      fireEvent.click(screen.getAllByRole("button").find((b) => b.textContent.includes("HITAM")));
      expect(onSetWarnaLoc).toHaveBeenCalledWith("HITAM", "gudang", 1);
    });

    it("clicking checkbox on selected warna clears all locations", () => {
      const onSetWarnaLoc = vi.fn();
      render(
        <WarnaPanel
          {...baseProps}
          warnaPanel={warnaPanelMulti}
          gabungan={true}
          selectedWarna={{ HITAM: 6 }}
          selectedBreakdown={{ HITAM: { gudang: 4, cideng: 2 } }}
          onSetWarnaLoc={onSetWarnaLoc}
        />
      );
      fireEvent.click(screen.getAllByRole("button").find((b) => b.textContent.includes("HITAM")));
      expect(onSetWarnaLoc).toHaveBeenCalledWith("HITAM", "gudang", 0);
      expect(onSetWarnaLoc).toHaveBeenCalledWith("HITAM", "cideng", 0);
      expect(onSetWarnaLoc).toHaveBeenCalledWith("HITAM", "tegalgubug", 0);
    });

    it("clicking + on a location stepper calls onSetWarnaLoc with incremented qty", () => {
      const onSetWarnaLoc = vi.fn();
      render(
        <WarnaPanel
          {...baseProps}
          warnaPanel={warnaPanelMulti}
          gabungan={true}
          selectedWarna={{ HITAM: 4 }}
          selectedBreakdown={{ HITAM: { gudang: 4, cideng: 0 } }}
          onSetWarnaLoc={onSetWarnaLoc}
        />
      );
      fireEvent.click(screen.getByLabelText("Tambah CD"));
      expect(onSetWarnaLoc).toHaveBeenCalledWith("HITAM", "cideng", 1);
    });

    it("+ button on a location stepper is disabled at that location's own stok cap", () => {
      render(
        <WarnaPanel
          {...baseProps}
          warnaPanel={warnaPanelMulti}
          gabungan={true}
          selectedWarna={{ HITAM: 4 }}
          selectedBreakdown={{ HITAM: { gudang: 4, cideng: 0 } }}
        />
      );
      expect(screen.getByLabelText("Tambah GD")).toBeDisabled();
    });

    it("clicking - on a location stepper calls onSetWarnaLoc with decremented qty", () => {
      const onSetWarnaLoc = vi.fn();
      render(
        <WarnaPanel
          {...baseProps}
          warnaPanel={warnaPanelMulti}
          gabungan={true}
          selectedWarna={{ HITAM: 6 }}
          selectedBreakdown={{ HITAM: { gudang: 4, cideng: 2 } }}
          onSetWarnaLoc={onSetWarnaLoc}
        />
      );
      fireEvent.click(screen.getByLabelText("Kurangi GD"));
      expect(onSetWarnaLoc).toHaveBeenCalledWith("HITAM", "gudang", 3);
    });
  });
});
