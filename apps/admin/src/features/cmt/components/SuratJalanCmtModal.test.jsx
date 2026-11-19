import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SuratJalanCmtModal from "./SuratJalanCmtModal";

const GROUP = {
  kirimNo: "CMT-20261119-478",
  namaVendor: "Pak Gimung",
  tanggalKirim: "2026-11-19",
  estimasiSelesai: "2026-11-26",
  hargaUpah: 0,
  rows: [
    {
      id: "r1",
      kode_produk: "D-084-PRS",
      nama_produk: "Gamis A",
      size: "Midi",
      warna: "PUTIH",
      qty: 13,
      catatan: null,
    },
    {
      id: "r2",
      kode_produk: "D-084-PRS",
      nama_produk: "Gamis A",
      size: "Midi",
      warna: "PINK",
      qty: 11,
      catatan: null,
    },
    {
      id: "r3",
      kode_produk: "D-077-TEN",
      nama_produk: "Gamis B",
      size: "Midi",
      warna: "ABU",
      qty: 10,
      catatan: null,
    },
  ],
};

describe("SuratJalanCmtModal", () => {
  let onClose;
  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn();
    vi.spyOn(window, "print").mockImplementation(() => {});
  });

  it("group null -> tidak render apapun", () => {
    const { container } = render(<SuratJalanCmtModal group={null} onClose={onClose} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("menampilkan nomor kirim, vendor, tanggal, dan breakdown per kode", () => {
    render(<SuratJalanCmtModal group={GROUP} onClose={onClose} />);
    expect(screen.getAllByText("CMT-20261119-478").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Pak Gimung").length).toBeGreaterThan(0);
    expect(screen.getByText("D-084-PRS")).toBeInTheDocument();
    expect(screen.getByText("D-077-TEN")).toBeInTheDocument();
    expect(screen.getByText("PUTIH")).toBeInTheDocument();
    // total keseluruhan = 13+11+10 = 34
    expect(screen.getByText("34")).toBeInTheDocument();
  });

  it("estimasi selesai ditampilkan kalau ada", () => {
    render(<SuratJalanCmtModal group={GROUP} onClose={onClose} />);
    expect(screen.getByText(/Estimasi selesai/)).toBeInTheDocument();
  });

  it("tombol Cetak / Simpan PDF memanggil window.print()", async () => {
    const user = userEvent.setup();
    render(<SuratJalanCmtModal group={GROUP} onClose={onClose} />);
    await user.click(screen.getByText("Cetak / Simpan PDF"));
    expect(window.print).toHaveBeenCalled();
  });

  it("tombol Tutup (header dan footer) memanggil onClose", async () => {
    const user = userEvent.setup();
    render(<SuratJalanCmtModal group={GROUP} onClose={onClose} />);
    await user.click(screen.getByText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });
});
