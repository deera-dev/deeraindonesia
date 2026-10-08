import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KalkulatorHPP from "./KalkulatorHPP";

const config = {
  jahit_gamis: 45000,
  jahit_midi: 35000,
  kancing_satuan: 500,
  plastik: 1800,
  hangtag: 200,
  tali_hangtag: 100,
  merk: 200,
  pin: 2800,
  kain_keras: 200,
  poin_denny: 5000,
  poin_haikal: 5000,
};

// motif rata-rata 2 yard (harga 35.000), polos 1 yard; kancing 4, studio 0
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

describe("KalkulatorHPP — harga maksimal bahan per yard", () => {
  it("tanpa input belum menampilkan hasil", () => {
    setup();
    expect(screen.queryByTestId("kalkulator-hasil")).not.toBeInTheDocument();
  });

  it("tidak ada lagi slider Upah & Jasa maupun input harga/pemakaian bahan lama", () => {
    setup();
    expect(screen.queryByText("Upah & Jasa")).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText("Harga/satuan")).not.toBeInTheDocument();
  });

  it("pemakaian terisi otomatis dari rata-rata template (motif = 2) + keterangan sumber", () => {
    setup();
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();
    expect(screen.getByText(/Rata-rata motif dari 2 bahan/)).toBeInTheDocument();
  });

  it("mode harga jual: (jual × (1 − margin)) − biaya tetap, dibagi pemakaian", async () => {
    setup();
    await userEvent.type(screen.getByPlaceholderText(/285000/), "300000");
    // HPP maks 180.000 (margin 40%), sisa bahan 117.700, ÷2 yard = 58.850
    const hasil = within(screen.getByTestId("kalkulator-hasil"));
    expect(hasil.getByText(/Rp 58\.850/)).toBeInTheDocument();
    expect(hasil.getByText("− Rp 62.300")).toBeInTheDocument();
  });

  it("mode HPP target memakai angka HPP langsung", async () => {
    setup();
    await userEvent.click(screen.getByText("Dari HPP Target"));
    await userEvent.type(screen.getByPlaceholderText(/160000/), "162300");
    // sisa 100.000 ÷ 2 = 50.000
    expect(within(screen.getByTestId("kalkulator-hasil")).getByText(/Rp 50\.000/)).toBeInTheDocument();
  });

  it("pemakaian bisa diubah manual dan ganti jenis ke Polos mengembalikan rata-rata polos", async () => {
    setup();
    await userEvent.click(screen.getByText("Dari HPP Target"));
    await userEvent.type(screen.getByPlaceholderText(/160000/), "162300");
    const pakai = screen.getByDisplayValue("2");
    await userEvent.clear(pakai);
    await userEvent.type(pakai, "4");
    expect(within(screen.getByTestId("kalkulator-hasil")).getByText(/Rp 25\.000/)).toBeInTheDocument();
    await userEvent.click(screen.getByText("Polos"));
    expect(screen.getByDisplayValue("1")).toBeInTheDocument();
    expect(screen.getByText(/Rata-rata polos dari 1 bahan/)).toBeInTheDocument();
  });

  it("model Midi memakai upah jahit Midi (lebih murah Rp10.000 → batas bahan naik)", async () => {
    setup();
    await userEvent.click(screen.getByText("Dari HPP Target"));
    await userEvent.type(screen.getByPlaceholderText(/160000/), "162300");
    await userEvent.click(screen.getByText("Midi"));
    // biaya tetap 52.300 → sisa 110.000 ÷ 2 = 55.000
    expect(within(screen.getByTestId("kalkulator-hasil")).getByText(/Rp 55\.000/)).toBeInTheDocument();
  });

  it("biaya tetap melebihi target: tampilkan peringatan, bukan angka per yard", async () => {
    setup();
    await userEvent.click(screen.getByText("Dari HPP Target"));
    await userEvent.type(screen.getByPlaceholderText(/160000/), "50000");
    expect(screen.getByText(/sudah melebihi target/)).toBeInTheDocument();
  });

  it("rincian biaya tetap memuat Poin Denny dan Poin Haikal", async () => {
    setup();
    await userEvent.click(screen.getByText("Dari HPP Target"));
    await userEvent.type(screen.getByPlaceholderText(/160000/), "162300");
    expect(screen.getByText("Poin Denny")).toBeInTheDocument();
    expect(screen.getByText("Poin Haikal")).toBeInTheDocument();
  });

  it("tanpa data template: pemakaian kosong + petunjuk isi manual", () => {
    setup({ templates: [] });
    expect(screen.getByText(/Belum ada data motif/)).toBeInTheDocument();
  });

  it("Reset mengosongkan input", async () => {
    setup();
    const input = screen.getByPlaceholderText(/285000/);
    await userEvent.type(input, "300000");
    await userEvent.click(screen.getByText("Reset"));
    expect(screen.getByPlaceholderText(/285000/)).toHaveValue(null);
    expect(screen.queryByTestId("kalkulator-hasil")).not.toBeInTheDocument();
  });
});
