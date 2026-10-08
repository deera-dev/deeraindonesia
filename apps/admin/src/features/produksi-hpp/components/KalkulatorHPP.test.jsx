import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KalkulatorHPP from "./KalkulatorHPP";

const config = {
  jahit_gamis: 45000, jahit_midi: 35000, kancing_satuan: 500, plastik: 1800, hangtag: 200,
  tali_hangtag: 100, merk: 200, pin: 2800, kain_keras: 200, poin_denny: 5000, poin_haikal: 5000,
};

// motif: 2 yard rata-rata (harga 35.000); polos: 1 yard (harga 20.000); kancing 4, studio 0
const templates = [
  { kancing_qty: 4, biaya_studio: 0, bahan_items: [
    { jenis: "motif", satuan: "yard", qty_per_baju: 1.5, harga_satuan: 40000 },
    { jenis: "tambahan", satuan: "yard", qty_per_baju: 1, harga_satuan: 20000 },
  ] },
  { kancing_qty: 4, biaya_studio: 0, bahan_items: [
    { jenis: "motif", satuan: "yard", qty_per_baju: 2.5, harga_satuan: 30000 },
  ] },
];
// biaya tetap gamis = 45000 + 4*500 + 1800+200+100+200+2800+200+5000+5000 = 62.300

const fmtRp = (n) => "Rp " + (Number(n) || 0).toLocaleString("id-ID");

function setup(props = {}) {
  render(<KalkulatorHPP fmtRp={fmtRp} fieldFullCls="" labelCls="" config={config} templates={templates} {...props} />);
}
const hasil = () => within(screen.getByTestId("kalkulator-hasil"));

describe("KalkulatorHPP — harga maksimal bahan, multi bahan (Denny 2026-10-08)", () => {
  it("default 2 baris bahan: Motif (dicari) dan Polos (harga rata-rata template)", () => {
    setup();
    expect(screen.getAllByTestId("kalkulator-bahan-row")).toHaveLength(2);
    expect(screen.getByDisplayValue("20000")).toBeInTheDocument(); // harga polos default
    expect(screen.getByText("harga dicari")).toBeInTheDocument();
  });

  it("tanpa target belum menampilkan hasil; tidak ada slider upah lama", () => {
    setup();
    expect(screen.queryByTestId("kalkulator-hasil")).not.toBeInTheDocument();
    expect(screen.queryByText("Upah & Jasa")).not.toBeInTheDocument();
  });

  it("mode HPP target: sisa setelah biaya tetap & polos dibagi pemakaian motif", async () => {
    setup();
    await userEvent.click(screen.getByText("Dari HPP Target"));
    await userEvent.type(screen.getByPlaceholderText(/160000/), "182300");
    // 182.300 − 62.300 − polos(1 yd × 20.000) = 100.000 ÷ 2 yd motif = 50.000
    expect(hasil().getByText(/Rp 50\.000/)).toBeInTheDocument();
    expect(hasil().getByText("− Rp 20.000")).toBeInTheDocument();
  });

  it("mode harga jual memakai margin", async () => {
    setup();
    await userEvent.type(screen.getByPlaceholderText(/285000/), "303833");
    // HPP maks = 303.833 × 0,6 = 182.300 → hasil sama 50.000
    expect(hasil().getByText(/Rp 50\.000/)).toBeInTheDocument();
  });

  it("harga bahan lain bisa diubah manual", async () => {
    setup();
    await userEvent.click(screen.getByText("Dari HPP Target"));
    await userEvent.type(screen.getByPlaceholderText(/160000/), "182300");
    const polos = screen.getByDisplayValue("20000");
    await userEvent.clear(polos);
    await userEvent.type(polos, "40000");
    // 182.300 − 62.300 − 40.000 = 80.000 ÷ 2 = 40.000
    expect(hasil().getByText(/Rp 40\.000/, { selector: "p" })).toBeInTheDocument();
  });

  it("tambah bahan ke-3 dan hapus bahan", async () => {
    setup();
    await userEvent.click(screen.getByText("+ Tambah Bahan"));
    expect(screen.getAllByTestId("kalkulator-bahan-row")).toHaveLength(3);
    await userEvent.click(screen.getAllByLabelText("Hapus bahan")[2]);
    expect(screen.getAllByTestId("kalkulator-bahan-row")).toHaveLength(2);
  });

  it("tanpa bahan yang dicari -> mode Cek Target", async () => {
    setup();
    await userEvent.click(screen.getByText("Dari HPP Target"));
    await userEvent.type(screen.getByPlaceholderText(/160000/), "182300");
    await userEvent.click(screen.getAllByLabelText("Cari harga maksimal")[0]);
    // motif jadi harga diketahui 35.000 × 2 = 70.000; total bahan 90.000, sisa 120.000 → lebih longgar 30.000
    expect(screen.getByText("Cek Target")).toBeInTheDocument();
    expect(hasil().getByText(/Sisa Rp 30\.000/)).toBeInTheDocument();
  });

  it("biaya tetap + bahan lain melebihi target: peringatan", async () => {
    setup();
    await userEvent.click(screen.getByText("Dari HPP Target"));
    await userEvent.type(screen.getByPlaceholderText(/160000/), "70000");
    expect(screen.getByText(/sudah melebihi target/)).toBeInTheDocument();
  });

  it("model Midi memakai upah jahit Midi (batas bahan naik Rp5.000/yard untuk 2 yard)", async () => {
    setup();
    await userEvent.click(screen.getByText("Dari HPP Target"));
    await userEvent.type(screen.getByPlaceholderText(/160000/), "182300");
    await userEvent.click(screen.getByText("Midi"));
    expect(hasil().getByText(/Rp 55\.000/)).toBeInTheDocument();
  });

  it("ganti jenis baris mengembalikan default rata-rata jenis itu; keterangan sumber tampil", async () => {
    setup();
    expect(screen.getByText(/Rata-rata 2 bahan motif: 2 yard/)).toBeInTheDocument();
    await userEvent.click(screen.getAllByText("Polos")[0]);
    expect(screen.getAllByText(/Rata-rata 1 bahan polos: 1 yard/).length).toBeGreaterThan(0);
  });

  it("menjelaskan bahwa rata-rata otomatis mengikuti template", () => {
    setup();
    expect(screen.getByText(/otomatis ikut berubah saat template ditambah atau diubah/)).toBeInTheDocument();
  });

  it("rincian biaya tetap memuat Poin Denny dan Poin Haikal", async () => {
    setup();
    await userEvent.click(screen.getByText("Dari HPP Target"));
    await userEvent.type(screen.getByPlaceholderText(/160000/), "182300");
    expect(screen.getByText("Poin Denny")).toBeInTheDocument();
    expect(screen.getByText("Poin Haikal")).toBeInTheDocument();
  });

  it("tanpa data template: petunjuk isi manual", () => {
    setup({ templates: [] });
    expect(screen.getAllByText(/Belum ada data/).length).toBeGreaterThan(0);
  });

  it("Reset mengembalikan 2 baris default dan mengosongkan target", async () => {
    setup();
    await userEvent.click(screen.getByText("+ Tambah Bahan"));
    await userEvent.type(screen.getByPlaceholderText(/285000/), "300000");
    await userEvent.click(screen.getByText("Reset"));
    expect(screen.getAllByTestId("kalkulator-bahan-row")).toHaveLength(2);
    expect(screen.getByPlaceholderText(/285000/)).toHaveValue(null);
  });
});
