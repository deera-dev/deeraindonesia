import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
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
    expect(screen.getByText("stok sekarang 9 pcs")).toBeInTheDocument();
    expect(screen.getByText("⚠ Belum masukin warna")).toBeInTheDocument();
    expect(screen.getByTestId("pending-Midi")).toHaveTextContent("6 pcs");
  });

  it("placeholder kolom warna = nilai asli stok, bukan strip", () => {
    setup();
    expect(screen.getByLabelText("HITAM, ukuran Midi")).toHaveAttribute("placeholder", "2");
    expect(screen.getByLabelText("MERAH, ukuran Midi")).toHaveAttribute("placeholder", "1");
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

  it("info buku potongan: ringkasan ukuran + seharusnya per warna — loc='gudang' (default) pakai byLocation.gudang, BUKAN totalan semua lokasi", () => {
    const buku = {
      rows: {
        K__Midi__HITAM: {
          expected: 10,
          sold: 4,
          dikirim: 0,
          seharusnya: 6,
          byLocation: { gudang: { seharusnya: 3 }, cideng: { seharusnya: 3 } },
        },
        K__Midi__MERAH: {
          expected: 5,
          sold: 0,
          dikirim: 0,
          seharusnya: 5,
          byLocation: { gudang: { seharusnya: 5 } },
        },
      },
      sizes: {
        K__Midi: {
          expected: 15,
          sold: 4,
          dikirim: 0,
          seharusnya: 11,
          byLocation: { gudang: { seharusnya: 8 }, cideng: { seharusnya: 3 } },
        },
      },
      kodes: {},
    };
    setup({ buku });
    expect(screen.getByTestId("buku-Midi")).toHaveTextContent("dipotong 15, terjual 4");
    // Admin: "seharusnya itu kan untuk semua lokasi, agak bingung" — sekarang
    // yang ditampilkan khusus lokasi yang sedang dihitung (gudang), bukan 11
    // (totalan semua lokasi), dan label-nya sebut nama lokasinya.
    expect(screen.getByTestId("buku-Midi")).toHaveTextContent(
      "seharusnya di Gudang masih ada 8 pcs",
    );
    expect(screen.queryByTestId("buku-Midi")).not.toHaveTextContent("(semua lokasi)");
    expect(screen.getByText(/· seharusnya 3/)).toBeInTheDocument();
  });

  it("info buku potongan: dikirim (keep terkirim) ikut ditampilkan terpisah dari terjual", () => {
    const buku = {
      rows: {},
      sizes: {
        K__Midi: {
          expected: 15,
          sold: 4,
          dikirim: 3,
          seharusnya: 8,
          byLocation: { gudang: { seharusnya: 8 } },
        },
      },
      kodes: {},
    };
    setup({ buku });
    expect(screen.getByTestId("buku-Midi")).toHaveTextContent("dipotong 15, terjual 4, dikirim 3");
    expect(screen.getByTestId("buku-Midi")).toHaveTextContent(
      "seharusnya di Gudang masih ada 8 pcs",
    );
  });

  it("loc='semua' -> seharusnya pakai totalan combined (semua lokasi), bukan byLocation", () => {
    const buku = {
      rows: {},
      sizes: {
        K__Midi: {
          expected: 15,
          sold: 4,
          dikirim: 0,
          seharusnya: 11,
          byLocation: { gudang: { seharusnya: 8 }, cideng: { seharusnya: 3 } },
        },
      },
      kodes: {},
    };
    setup({ buku, loc: "semua" });
    expect(screen.getByTestId("buku-Midi")).toHaveTextContent(
      "seharusnya masih ada 11 pcs (semua lokasi)",
    );
  });

  it("loc beda (cideng) -> seharusnya ikut beda dari gudang, bukan angka totalan yang sama", () => {
    const buku = {
      rows: {},
      sizes: {
        K__Midi: {
          expected: 15,
          sold: 4,
          dikirim: 0,
          seharusnya: 11,
          byLocation: { gudang: { seharusnya: 8 }, cideng: { seharusnya: 3 } },
        },
      },
      kodes: {},
    };
    setup({ buku, loc: "cideng" });
    expect(screen.getByTestId("buku-Midi")).toHaveTextContent(
      "seharusnya di Cideng masih ada 3 pcs",
    );
  });

  it("tanpa data buku potongan: tidak ada barisnya", () => {
    setup();
    expect(screen.queryByTestId("buku-Midi")).not.toBeInTheDocument();
  });

  it("produk tanpa warna: tidak ada kolom total maupun sisa", () => {
    const plain = [
      { id: "x", kode: "K", size: "Midi", warna: "_", gudang: 4, cideng: 0, tegalgubug: 0 },
    ];
    setup({ sizeRows: plain });
    expect(screen.queryByLabelText("Total dihitung Midi")).not.toBeInTheDocument();
    expect(screen.queryByTestId("pending-Midi")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Stok, ukuran Midi")).toBeInTheDocument();
  });
});
