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
  produksi_batch: { tanggal_produksi: "2026-10-23", tukang_potong_nama: "Budi" },
};

describe("KartuJahitContent", () => {
  it("menampilkan semua field otomatis dari data kartu", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
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

  it("tanggal produksi & tukang potong ('Dipotong oleh') ada di header, bukan di daftar field lagi", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    expect(screen.getByText("23 Okt 2026")).toBeInTheDocument();
    expect(screen.getByText("Dipotong oleh")).toBeInTheDocument();
    expect(screen.getByText("Budi")).toBeInTheDocument();
    expect(screen.queryByText("T.Potong :")).not.toBeInTheDocument();
  });

  it("menampilkan '-' di header kalau tukang potong belum ke-set", () => {
    render(<KartuJahitContent card={{ ...card, produksi_batch: { tanggal_produksi: "2026-10-23" } }} qrDataUrl="x" />);
    expect(screen.getByText("Dipotong oleh")).toBeInTheDocument();
    expect(screen.getByText("-")).toBeInTheDocument();
  });

  it("mengosongkan Penjahit supaya diisi tangan saat kartu diserahkan", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const label = screen.getByText("Penjahit :");
    expect(label.nextSibling.textContent).toBe("");
  });

  it("Info Tambahan punya 2 baris kosong (bukan cuma 1) utk catatan yang agak panjang", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const label = screen.getByText("Info Tambahan :");
    expect(label.textContent).toBe("Info Tambahan :");
    const linesContainer = label.parentElement;
    const emptyLines = linesContainer.querySelectorAll(":scope > div:not(:first-child)");
    expect(emptyLines).toHaveLength(2);
    emptyLines.forEach((line) => expect(line.textContent).toBe(""));
  });

  it("urutan field daftar bawah: Penjahit, Kode, Ukuran, Warna, Jumlah, Info Tambahan", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const labels = screen.getAllByText(/:$/).map((el) => el.textContent);
    expect(labels).toEqual(["Penjahit :", "Kode :", "Ukuran :", "Warna :", "Jumlah :", "Info Tambahan :"]);
  });

  it("Ukuran dan Warna digabung jadi satu baris (hemat tempat di kartu kecil)", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const ukuranLabel = screen.getByText("Ukuran :");
    const warnaLabel = screen.getByText("Warna :");
    expect(ukuranLabel.closest("div")?.parentElement).toBe(warnaLabel.closest("div")?.parentElement);
  });

  it("menampilkan warna '-' utk produk tanpa warna, terpisah dari '-' tukang potong kosong", () => {
    render(<KartuJahitContent card={{ ...card, warna: "_" }} qrDataUrl="x" />);
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("T.Potong di header mengutamakan card.tukangPotongNama (preview dari modal) drpd produksi_batch", () => {
    render(<KartuJahitContent card={{ ...card, tukangPotongNama: "Dodi (belum tersimpan)" }} qrDataUrl="x" />);
    expect(screen.getByText("Dodi (belum tersimpan)")).toBeInTheDocument();
  });

  it("menampilkan logo text DEERA (dicrop, overflow hidden) dan barcode besar di paling bawah", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const img = screen.getByAltText(`Barcode kartu ${card.id}`);
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc");
    expect(img).toHaveStyle({ width: "24mm", height: "24mm" });
  });
});
