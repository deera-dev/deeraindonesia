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
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("12 pcs")).toBeInTheDocument();
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
  });

  it("tidak menampilkan Model (nama produk) — field ini sudah dihapus", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    expect(screen.queryByText("Model :")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamis Wolfis Polos")).not.toBeInTheDocument();
  });

  it("mengosongkan Penjahit supaya diisi tangan saat kartu diserahkan", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const label = screen.getByText("Penjahit :");
    expect(label.nextSibling.textContent).toBe("");
  });

  it("mengosongkan Info Tambahan (field baru, diisi tangan)", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const label = screen.getByText("Info Tambahan :");
    expect(label.nextSibling.textContent).toBe("");
  });

  it("urutan field: Penjahit, Kode, T.Potong, Ukuran, Warna, Jumlah, Info Tambahan", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const labels = screen.getAllByText(/:$/).map((el) => el.textContent);
    expect(labels).toEqual([
      "Penjahit :",
      "Kode :",
      "T.Potong :",
      "Ukuran :",
      "Warna :",
      "Jumlah :",
      "Info Tambahan :",
    ]);
  });

  it("menampilkan '-' untuk warna '_' (produk tanpa warna)", () => {
    render(<KartuJahitContent card={{ ...card, warna: "_" }} qrDataUrl="x" />);
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("T.Potong mengutamakan card.tukangPotongNama (preview dari modal) drpd produksi_batch", () => {
    render(
      <KartuJahitContent
        card={{ ...card, tukangPotongNama: "Dodi (belum tersimpan)" }}
        qrDataUrl="x"
      />,
    );
    expect(screen.getByText("Dodi (belum tersimpan)")).toBeInTheDocument();
  });

  it("menampilkan logo text DEERA dan barcode besar di paling bawah", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    expect(screen.getByAltText("DEERA")).toHaveAttribute("src", "/kartu-jahit-logo-text.svg");
    const img = screen.getByAltText(`Barcode kartu ${card.id}`);
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc");
    expect(img).toHaveStyle({ width: "26mm", height: "26mm" });
  });
});
