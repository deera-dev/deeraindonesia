import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import KartuJahitContent from "./KartuJahitContent";

const card = {
  id: "11111111-2222-3333-4444-555555555555",
  kode_produk: "D-07-OSK",
  nama_produk: "Gamis Wolfis Polos",
  size: "Midi",
  warna: "HITAM",
  qty: 12,
  produksi_batch: { tukang_potong_nama: "Budi" },
};

describe("KartuJahitContent", () => {
  it("menampilkan semua field otomatis dari data kartu", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    expect(screen.getByText("Budi")).toBeInTheDocument();
    expect(screen.getByText("Gamis Wolfis Polos")).toBeInTheDocument();
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("12 pcs")).toBeInTheDocument();
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
  });

  it("mengosongkan T.Jahit supaya diisi tangan saat kartu diserahkan", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const label = screen.getByText("T.Jahit :");
    expect(label.nextSibling.textContent).toBe("");
  });

  it("menampilkan '-' untuk warna '_' (produk tanpa warna)", () => {
    render(<KartuJahitContent card={{ ...card, warna: "_" }} qrDataUrl="x" />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("menampilkan gambar barcode dari qrDataUrl", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const img = screen.getByAltText(`Barcode kartu ${card.id}`);
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc");
  });
});
