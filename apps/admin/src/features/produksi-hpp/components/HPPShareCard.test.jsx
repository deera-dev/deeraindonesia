import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HPPShareCard from "./HPPShareCard";

const baseTpl = {
  kode_produk: "D-07-OSK",
  total_hpp: 112300,
  upah_jahit: 35000,
  bordir: 10000,
  biaya_studio: 9500,
  kancing_qty: 5,
  kancing_extra: [],
  bahan_items: [
    { nama_bahan: "Wolfis", qty_per_baju: 2, harga_satuan: 15000, satuan: "yard" },
  ],
  config_snapshot: {
    kancing_satuan: 500,
    plastik: 1800,
    hangtag: 200,
    tali_hangtag: 100,
    merk: 200,
    pin: 2800,
    kain_keras: 200,
    poin_denny: 10000,
    poin_haikal: 10000,
  },
};

describe("HPPShareCard", () => {
  it("renders kode_produk and Total HPP (nilai kanonikal dari DB)", () => {
    render(<HPPShareCard tpl={baseTpl} produk={null} />);
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
    expect(screen.getByText(/112\.300/)).toBeInTheDocument();
  });

  // ── Regresi bug "Poin tidak masuk Total HPP" ────────────────────────────
  it("menampilkan baris Poin Denny dan Poin Haikal di seksi Biaya Lain", () => {
    render(<HPPShareCard tpl={baseTpl} produk={null} />);
    expect(screen.getByText("Poin Denny")).toBeInTheDocument();
    expect(screen.getByText("Poin Haikal")).toBeInTheDocument();
  });

  it("menampilkan seluruh komponen non-bahan (bukan cuma upah/bordir/studio/kancing)", () => {
    render(<HPPShareCard tpl={baseTpl} produk={null} />);
    for (const label of ["Plastik", "Hangtag", "Tali Hangtag", "Merk", "Pin", "Kain Keras"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("Total Biaya Bahan TIDAK lagi ter-inflasi oleh Poin/kemasan (bug lama: biayaLain tidak lengkap)", () => {
    // biayaLain lengkap = 35000+10000+9500+2500(kancing 5x500)+1800+200+100+200+2800+200+10000+10000 = 82300
    // biayaBahan = total_hpp(112300) - biayaLain(82300) = 30000 (murni biaya bahan)
    render(<HPPShareCard tpl={baseTpl} produk={null} />);
    expect(screen.getByText(/30\.000/)).toBeInTheDocument();
  });

  it("Total Biaya Bahan + seluruh Biaya Lain = Total HPP (tidak ada double counting / kehilangan nilai)", () => {
    const { container } = render(<HPPShareCard tpl={baseTpl} produk={null} />);
    const text = container.textContent;
    // Biaya Lain sum = 82300, Total Biaya Bahan = 30000 → 82300 + 30000 = 112300 = total_hpp
    expect(text).toContain("30.000");
    expect(text).toContain("112.300");
  });

  it("memakai config_snapshot yang dibekukan saat disimpan, bukan nilai default hardcode", () => {
    const tplCustom = {
      ...baseTpl,
      config_snapshot: { ...baseTpl.config_snapshot, poin_denny: 15000, poin_haikal: 15000 },
      total_hpp: 122300, // +10000 dari 2x poin naik 5000
    };
    render(<HPPShareCard tpl={tplCustom} produk={null} />);
    expect(screen.getAllByText(/15\.000/).length).toBeGreaterThanOrEqual(2);
  });

  it("fallback ke config default saat config_snapshot null (template lama sebelum field ini ada)", () => {
    const tplNoSnapshot = { ...baseTpl, config_snapshot: null };
    render(<HPPShareCard tpl={tplNoSnapshot} produk={null} />);
    expect(screen.getByText("Poin Denny")).toBeInTheDocument();
    expect(screen.getByText("Poin Haikal")).toBeInTheDocument();
  });

  it("menampilkan daftar bahan", () => {
    render(<HPPShareCard tpl={baseTpl} produk={null} />);
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
  });

  it("menampilkan catatan jika ada", () => {
    render(<HPPShareCard tpl={{ ...baseTpl, catatan: "motif custom" }} produk={null} />);
    expect(screen.getByText("motif custom")).toBeInTheDocument();
  });

  it("menampilkan nama produk jika diberikan", () => {
    render(<HPPShareCard tpl={baseTpl} produk={{ nama: "Gamis Oskelin" }} />);
    expect(screen.getByText("Gamis Oskelin")).toBeInTheDocument();
  });
});
