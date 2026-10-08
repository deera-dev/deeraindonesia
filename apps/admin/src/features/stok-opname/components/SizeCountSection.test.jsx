import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SizeCountSection from "./SizeCountSection";

const rows = [
  { id: "a", kode: "K", size: "Midi", warna: "HITAM", gudang: 2, cideng: 0, tegalgubug: 0 },
  { id: "b", kode: "K", size: "Midi", warna: "MERAH", gudang: 1, cideng: 0, tegalgubug: 0 },
  { id: "p", kode: "K", size: "Midi", warna: "_", gudang: 6, cideng: 0, tegalgubug: 0 },
];
const base = { kode: "K", size: "Midi", sizeRows: rows, loc: "gudang", entries: {}, totalRaw: "" };

function setup(extra = {}) {
  const onEntry = vi.fn();
  const onTotal = vi.fn();
  render(<SizeCountSection {...base} onEntry={onEntry} onTotal={onTotal} {...extra} />);
  return { onEntry, onTotal };
}

describe("SizeCountSection", () => {
  it("menampilkan nilai sistem tiap warna dan tanda belum masukin warna", () => {
    setup();
    expect(screen.getByText("sistem 9 pcs")).toBeInTheDocument();
    expect(screen.getByText("⚠ Belum masukin warna")).toBeInTheDocument();
    expect(screen.getByTestId("pending-Midi")).toHaveTextContent("6 pcs");
  });

  it("mengisi warna memanggil onEntry; selisih ditampilkan", () => {
    const { onEntry } = setup({ entries: { a: "5" } });
    expect(screen.getByText(/\(\+3\)/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("MERAH, ukuran Midi"), { target: { value: "4" } });
    expect(onEntry).toHaveBeenCalledWith("b", "4");
  });

  it("isi total dulu: sisa dihitung dari total", () => {
    const { onTotal } = setup({ totalRaw: "20" });
    expect(screen.getByTestId("pending-Midi")).toHaveTextContent("17 pcs");
    fireEvent.change(screen.getByLabelText("Total dihitung Midi"), { target: { value: "25" } });
    expect(onTotal).toHaveBeenCalledWith("Midi", "25");
  });

  it("total lebih kecil dari jumlah warna → peringatan", () => {
    setup({ totalRaw: "1" });
    expect(screen.getByText(/lebih besar dari total/)).toBeInTheDocument();
  });

  it("+ Seri lengkap menambah 1 ke setiap warna", () => {
    const { onEntry } = setup({ entries: { a: "3" } });
    fireEvent.click(screen.getByText(/Seri lengkap/));
    expect(onEntry).toHaveBeenCalledWith("a", "4");
    expect(onEntry).toHaveBeenCalledWith("b", "2");
  });

  it("produk tanpa warna: tidak ada kolom total maupun sisa", () => {
    const plain = [{ id: "x", kode: "K", size: "Midi", warna: "_", gudang: 4, cideng: 0, tegalgubug: 0 }];
    setup({ sizeRows: plain });
    expect(screen.queryByLabelText("Total dihitung Midi")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pending-Midi")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Stok, ukuran Midi")).toBeInTheDocument();
  });
});
