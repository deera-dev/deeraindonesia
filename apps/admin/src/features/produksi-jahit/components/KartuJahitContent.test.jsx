import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
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
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
  });

  it("menampilkan jumlah sebagai angka saja, tanpa 'pcs'", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.queryByText(/12\s*pcs/i)).not.toBeInTheDocument();
  });

  it("tidak menampilkan Model (nama produk) — field ini sudah dihapus", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    expect(screen.queryByText("Model :")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamis Wolfis Polos")).not.toBeInTheDocument();
  });

  it("logo DEERA+PRODUCTION ditampilkan sbg satu gambar (svg sudah menyatu, bukan teks terpisah lagi)", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    expect(screen.getByRole("img", { name: "DEERA Production" })).toBeInTheDocument();
    expect(screen.queryByText("PRODUCTION")).not.toBeInTheDocument();
  });

  it("tanggal produksi & tukang potong ('Dipotong oleh') ada di header, bukan di daftar field lagi", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    expect(screen.getByText("23 Okt 2026")).toBeInTheDocument();
    expect(screen.getByText("Dipotong oleh")).toBeInTheDocument();
    expect(screen.getByText("Budi")).toBeInTheDocument();
    expect(screen.queryByText("T.Potong :")).not.toBeInTheDocument();
  });

  it("menampilkan '-' di header kalau tukang potong belum ke-set", () => {
    render(
      <KartuJahitContent
        card={{ ...card, produksi_batch: { tanggal_produksi: "2026-10-23" } }}
        qrDataUrl="x"
      />,
    );
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
    const linesContainer = label.parentElement;
    const emptyLines = linesContainer.querySelectorAll(":scope > div:not(:first-child)");
    expect(emptyLines).toHaveLength(2);
    emptyLines.forEach((line) => expect(line.textContent).toBe(""));
  });

  it("urutan label field: Kode, Jumlah, Ukuran, Warna, Penjahit, Info Tambahan", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const labels = screen.getAllByText(/:$/).map((el) => el.textContent);
    expect(labels).toEqual([
      "Kode :",
      "Jumlah :",
      "Ukuran :",
      "Warna :",
      "Penjahit :",
      "Info Tambahan :",
    ]);
  });

  it("Kode dan Jumlah satu baris; Ukuran & Warna masing-masing satu baris penuh supaya ukuran panjang tidak terpotong", () => {
    render(
      <KartuJahitContent
        card={{ ...card, size: "Super Jumbo" }}
        qrDataUrl="data:image/png;base64,abc"
      />,
    );
    const row = (label) => screen.getByText(label).closest("div")?.parentElement;
    expect(row("Kode :")).toBe(row("Jumlah :"));
    expect(row("Ukuran :")).not.toBe(row("Kode :"));
    expect(row("Ukuran :")).not.toBe(row("Warna :"));
    expect(row("Ukuran :").children).toHaveLength(1);
    expect(row("Warna :").children).toHaveLength(1);
    expect(screen.getByText("Super Jumbo")).toBeInTheDocument();
  });

  it("Note ditampilkan paling bawah, setelah barcode (bukan sebelum lagi)", () => {
    const { container } = render(
      <KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />,
    );
    const barcodeImg = screen.getByAltText(`Barcode kartu ${card.id}`);
    const noteLabel = screen.getByText("Note");
    const all = Array.from(container.querySelectorAll("*"));
    expect(all.indexOf(barcodeImg)).toBeLessThan(all.indexOf(noteLabel));
  });

  it("barcode+note dibungkus wrapper margin-top:auto supaya selalu nempel di bawah kartu", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const barcodeImg = screen.getByAltText(`Barcode kartu ${card.id}`);
    const noteLabel = screen.getByText("Note");
    const wrapper = barcodeImg.closest("div[style*='margin-top']");
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveStyle({ marginTop: "auto" });
    expect(wrapper.contains(noteLabel)).toBe(true);
  });

  it("menampilkan warna '-' utk produk tanpa warna", () => {
    render(<KartuJahitContent card={{ ...card, warna: "_" }} qrDataUrl="x" />);
    expect(screen.getAllByText("-").length).toBeGreaterThan(0);
  });

  it("T.Potong di header mengutamakan card.tukangPotongNama (preview dari modal) drpd produksi_batch", () => {
    render(
      <KartuJahitContent
        card={{ ...card, tukangPotongNama: "Dodi (belum tersimpan)" }}
        qrDataUrl="x"
      />,
    );
    expect(screen.getByText("Dodi (belum tersimpan)")).toBeInTheDocument();
  });

  it("menampilkan barcode besar", () => {
    render(<KartuJahitContent card={card} qrDataUrl="data:image/png;base64,abc" />);
    const img = screen.getByAltText(`Barcode kartu ${card.id}`);
    expect(img).toHaveAttribute("src", "data:image/png;base64,abc");
    expect(img).toHaveStyle({ width: "24mm", height: "24mm" });
  });
});
