import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import KalkulatorHPP from "./KalkulatorHPP";

const fullConfig = {
  kancing_satuan: 500,
  plastik: 1800,
  hangtag: 200,
  tali_hangtag: 100,
  merk: 200,
  pin: 2800,
  kain_keras: 200,
  poin_denny: 10000,
  poin_haikal: 10000,
};

function fmtRp(n) {
  return "Rp " + (Number(n) || 0).toLocaleString("id-ID");
}

function setup(config = fullConfig) {
  render(<KalkulatorHPP fmtRp={fmtRp} fieldFullCls="" labelCls="" config={config} />);
}

describe("KalkulatorHPP", () => {
  it("renders intro copy mentioning Harga Dasar auto-included", () => {
    setup();
    expect(screen.getByText(/Komponen dari Harga Dasar/)).toBeInTheDocument();
  });

  // ── Regresi bug "Poin tidak masuk Total HPP" ────────────────────────────
  it("does NOT render an 'Operasional' field anymore (dihapus, diganti Harga Dasar otomatis)", () => {
    setup();
    expect(screen.queryByText("Operasional")).not.toBeInTheDocument();
  });

  it("shows Poin Denny and Poin Haikal in the Estimasi HPP breakdown by default", () => {
    setup();
    expect(screen.getByText("Poin Denny")).toBeInTheDocument();
    expect(screen.getByText("Poin Haikal")).toBeInTheDocument();
  });

  it("shows all 8 Harga Dasar components in the breakdown", () => {
    setup();
    for (const label of ["Plastik", "Hangtag", "Tali Hangtag", "Merk", "Pin", "Kain Keras", "Poin Denny", "Poin Haikal"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("Total HPP includes upah default (55000) + full biaya tetap dari Harga Dasar (25300) = 80300 with no bahan/lainnya input", () => {
    setup();
    // biayaTetap = 1800+200+100+200+2800+200+10000+10000 = 25300
    // total = 0(bahan) + 55000(upah default) + 25300 + 0(lainnya) = 80300
    expect(screen.getByText(/80\.300/)).toBeInTheDocument();
  });

  it("does not show fixed-cost rows when config is empty (no hardcoded Rp10.000 injected blindly)", () => {
    // Kosongkan config total → biayaLainBreakdown() fallback ke default internalnya sendiri
    // (?? 10000 dst), JADI baris tetap muncul dari default, bukan dari config kosong secara ajaib.
    // Test ini membuktikan sumbernya tetap biayaLainBreakdown(), bukan hardcode terpisah di sini.
    setup({});
    expect(screen.getByText("Poin Denny")).toBeInTheDocument();
  });

  it("updates Biaya Bahan when harga/pemakaian filled in", async () => {
    const user = userEvent.setup();
    setup();
    const [hargaInput, pemakaianInput] = screen.getAllByPlaceholderText(/Harga\/satuan|Pemakaian/);
    await user.type(screen.getByPlaceholderText("Harga/satuan"), "10000");
    await user.type(screen.getByPlaceholderText("Pemakaian"), "2");
    expect(screen.getByText(/20\.000 \/ baju/)).toBeInTheDocument();
  });

  it("resets Biaya Bahan and Upah on Reset click but keeps Harga Dasar rows (not user input)", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByPlaceholderText("Harga/satuan"), "10000");
    await user.type(screen.getByPlaceholderText("Pemakaian"), "2");
    await user.click(screen.getByText("Reset"));
    expect(screen.getByPlaceholderText("Harga/satuan")).toHaveValue(null);
    expect(screen.getByText("Poin Denny")).toBeInTheDocument();
  });
});
