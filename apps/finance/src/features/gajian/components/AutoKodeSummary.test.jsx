import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { AutoKodeSummary } from "./AutoKodeSummary";

const state = {
  kode: "D-060-ZUR",
  nama: "ZURICH",
  jumlahFinance: 20,
  cardsSum: 20,
  rows: [
    { size: "Midi", warna: "ABU", qtyKartu: 10, qtyDitambahkan: 8 },
    { size: "Midi", warna: "_", qtyKartu: 10, qtyDitambahkan: 10 },
  ],
};

describe("AutoKodeSummary", () => {
  it("menampilkan baris kartu + total tambah Gudang tanpa input", () => {
    render(<AutoKodeSummary state={state} onEdit={vi.fn()} />);
    expect(screen.getByText(/D-060-ZUR — ZURICH/)).toBeInTheDocument();
    expect(screen.getByText("Midi · ABU")).toBeInTheDocument();
    expect(screen.getByText("Midi · (tanpa warna)")).toBeInTheDocument();
    expect(
      screen.getByText(/Kartu 20 pcs = Finance 20 pcs · tambah Gudang 18 pcs/),
    ).toBeInTheDocument();
    expect(document.querySelector("input")).toBeNull();
  });

  it("tombol Ubah memanggil onEdit", () => {
    const onEdit = vi.fn();
    render(<AutoKodeSummary state={state} onEdit={onEdit} />);
    fireEvent.click(screen.getByText("Ubah"));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
