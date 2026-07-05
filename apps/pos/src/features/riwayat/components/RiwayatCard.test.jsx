import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import RiwayatCard from "./RiwayatCard";

vi.mock("../utils", () => ({
  getMeta: vi.fn((action) => ({
    label: action === "sale" ? "Penjualan" : action === "retur" ? "Retur" : action,
    badgeCls: "text-green-700 bg-green-50 border-green-200",
  })),
  formatTime: vi.fn(() => "10:30"),
  formatRp: vi.fn((n) => n ? `Rp ${n}` : "–"),
}));

const saleItem = {
  _id: "s1",
  _type: "sale",
  action: "sale",
  changed_at: "2026-07-04T10:30:00Z",
  buyer_name: "BUDI",
  buyer_hp: "081111",
  total: 100000,
  discount: 0,
  location: "gudang",
  items: [{ kode: "D-01", size: "Midi", qty: 2, harga: 50000 }],
  user_name: "Admin",
};

const historyItem = {
  _id: "h1",
  _type: "history",
  action: "tambah",
  changed_at: "2026-07-04T10:00:00Z",
  kode: "D-01",
  nama: "Gamis A",
  category: "produk",
  snapshot: { nama: "Gamis A", bahan: "OSK" },
  before_snapshot: null,
  user_name: "Admin",
};

describe("RiwayatCard — sale", () => {
  it("shows buyer_name for sale item", () => {
    render(<RiwayatCard item={saleItem} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });

  it("shows total amount for sale", () => {
    render(<RiwayatCard item={saleItem} />);
    expect(screen.getByText(/100000/)).toBeInTheDocument();
  });

  it("expands on click to show detail table", () => {
    render(<RiwayatCard item={saleItem} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("D-01")).toBeInTheDocument();
  });

  it("shows buyer_hp in collapsed view", () => {
    render(<RiwayatCard item={saleItem} />);
    expect(screen.getByText(/081111/)).toBeInTheDocument();
  });

  it("shows location in collapsed view", () => {
    render(<RiwayatCard item={saleItem} />);
    expect(screen.getByText(/gudang/i)).toBeInTheDocument();
  });
});

describe("RiwayatCard — history", () => {
  it("shows nama for history item", () => {
    render(<RiwayatCard item={historyItem} />);
    expect(screen.getByText("Gamis A")).toBeInTheDocument();
  });

  it("shows action badge label", () => {
    render(<RiwayatCard item={historyItem} />);
    expect(screen.getByText("tambah")).toBeInTheDocument();
  });

  it("expands on click to show snapshot detail", () => {
    render(<RiwayatCard item={historyItem} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/D-01/)).toBeInTheDocument();
  });
});

describe("RiwayatCard — retur", () => {
  it("shows minus prefix for retur total", () => {
    const returItem = { ...saleItem, action: "retur", _id: "r1" };
    render(<RiwayatCard item={returItem} />);
    expect(screen.getByText(/–/)).toBeInTheDocument();
  });
});

describe("RiwayatCard — additional branches", () => {
  it("shows Tanpa nama when buyer_name is null", () => {
    const item = { ...saleItem, buyer_name: null };
    render(<RiwayatCard item={item} />);
    expect(screen.getByText("Tanpa nama")).toBeInTheDocument();
  });

  it("shows no hp span when buyer_hp is falsy", () => {
    const item = { ...saleItem, buyer_hp: null };
    render(<RiwayatCard item={item} />);
    // HP span should be absent
    expect(screen.queryByText(/081111/)).not.toBeInTheDocument();
  });

  it("shows discount in sale detail when discount > 0", () => {
    const item = { ...saleItem, discount: 5000 };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Diskon/)).toBeInTheDocument();
  });

  it("shows total in sale detail even without items", () => {
    const item = { ...saleItem, items: [] };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Total/)).toBeInTheDocument();
  });

  it("shows warna name in sale item detail when warna is array", () => {
    const item = {
      ...saleItem,
      items: [{ kode: "D-01", size: "Midi", qty: 1, harga: 50000,
                warna: [{ nama: "HITAM" }, { nama: "MERAH" }] }],
    };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/HITAM\/MERAH/)).toBeInTheDocument();
  });

  it("shows warna as string when warna is a non-underscore string", () => {
    const item = {
      ...saleItem,
      items: [{ kode: "D-01", size: "Midi", qty: 1, harga: 50000, warna: "BIRU" }],
    };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/BIRU/)).toBeInTheDocument();
  });

  it("shows history detail fallback when no snapshot", () => {
    const item = {
      ...historyItem,
      snapshot: null,
      before_snapshot: null,
    };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/Tidak ada detail tersimpan/)).toBeInTheDocument();
  });

  it("shows produk edit diff when before+after provided", () => {
    const item = {
      ...historyItem,
      action: "edit",
      category: "produk",
      snapshot: { nama: "Gamis Baru", bahan: "OSK", hpp: 80000, variants: [], warna: [] },
      before_snapshot: { nama: "Gamis Lama", bahan: "OSK", hpp: 80000, variants: [], warna: [] },
    };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Perubahan")).toBeInTheDocument();
    expect(screen.getByText("Gamis Lama")).toBeInTheDocument();
    expect(screen.getByText("Gamis Baru")).toBeInTheDocument();
  });

  it("shows Tidak ada perubahan when edit action but nothing changed", () => {
    const snap = { nama: "Gamis A", bahan: "OSK", hpp: 80000, variants: [], warna: [] };
    const item = {
      ...historyItem,
      action: "edit",
      category: "produk",
      snapshot: snap,
      before_snapshot: snap,
    };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Perubahan")).toBeInTheDocument();
    expect(screen.getByText(/Tidak ada perubahan/)).toBeInTheDocument();
  });

  it("shows produk tambah snapshot summary", () => {
    const item = {
      ...historyItem,
      action: "tambah",
      category: "produk",
      snapshot: { nama: "Gamis XYZ", bahan: "OSK", hpp: 80000, variants: [{ size: "Midi", harga: 100000 }] },
      before_snapshot: null,
    };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    // kode comes from item.kode ("D-01"); nama appears in expanded detail
    expect(screen.getAllByText(/D-01/).length).toBeGreaterThan(0);
    expect(screen.getByText("Gamis XYZ")).toBeInTheDocument();
  });

  it("shows stok category detail with kode", () => {
    const item = {
      ...historyItem,
      category: "stok",
      snapshot: { kode: "D-01", size: "Midi" },
    };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("D-01")).toBeInTheDocument();
  });

  it("shows transfer category detail with from/to location", () => {
    const item = {
      ...historyItem,
      category: "transfer",
      snapshot: { from_location: "gudang", to_location: "cideng" },
    };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/gudang/)).toBeInTheDocument();
    expect(screen.getByText(/cideng/)).toBeInTheDocument();
  });

  it("shows default fallback for unknown category", () => {
    const item = {
      ...historyItem,
      category: "unknown",
      snapshot: null,
      before_snapshot: null,
    };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    // Falls through to "Tidak ada detail tersimpan" (no snapshot, no before)
    expect(screen.getByText(/Tidak ada detail/)).toBeInTheDocument();
  });

  it("shows pelanggan diff when before+after differ", () => {
    const item = {
      ...historyItem,
      category: "pelanggan",
      action: "edit",
      snapshot: { nama: "DEWI BARU", no_hp: "082", alamat: "Jl Baru" },
      before_snapshot: { nama: "DEWI LAMA", no_hp: "082", alamat: "Jl Lama" },
    };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("DEWI LAMA")).toBeInTheDocument();
    expect(screen.getByText(/DEWI BARU/)).toBeInTheDocument();
  });

  it("shows pelanggan summary when no before_snapshot", () => {
    const item = {
      ...historyItem,
      category: "pelanggan",
      action: "tambah",
      snapshot: { nama: "BUDI", no_hp: "081", alamat: "Jl A" },
      before_snapshot: null,
    };
    render(<RiwayatCard item={item} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("BUDI")).toBeInTheDocument();
    expect(screen.getByText("081")).toBeInTheDocument();
  });

  it("collapses detail when header button clicked twice", () => {
    render(<RiwayatCard item={saleItem} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("D-01")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.queryByText("D-01")).not.toBeInTheDocument();
  });
});

