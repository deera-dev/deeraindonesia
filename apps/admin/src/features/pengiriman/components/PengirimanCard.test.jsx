import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PengirimanCard from "./PengirimanCard";

const basePengiriman = {
  id: "pg1",
  pengiriman_no: "KRM-20260824-123",
  tanggal: "2026-08-24",
  nama_penerima: "Budi Santoso",
  no_telp_penerima: "081234567",
  alamat: "Jl. Mawar No. 1, Jakarta",
  jumlah_karung: 5,
  isi_karung: "Gamis dan mukena campur",
  nama_ekspedisi: "JNE",
};

describe("PengirimanCard", () => {
  it("menampilkan nomor pengiriman & tanggal terformat", () => {
    render(<PengirimanCard pengiriman={basePengiriman} onSuratJalan={() => {}} onEdit={() => {}} onDelete={() => {}} />);
    expect(screen.getByText("KRM-20260824-123")).toBeInTheDocument();
    expect(screen.getByText("24 Agustus 2026")).toBeInTheDocument();
  });

  it("menampilkan nama ekspedisi, penerima, no telp, alamat, jumlah karung & isi karung", () => {
    // Jumlah karung ditampilkan UPPERCASE ("5 KARUNG", diedit langsung oleh
    // Denny di PengirimanCard.jsx) — {qty} & " KARUNG" jadi 2 text node
    // terpisah di JSX, jadi dicek lewat container.textContent (regex),
    // bukan getByText exact-string.
    const { container } = render(
      <PengirimanCard pengiriman={basePengiriman} onSuratJalan={() => {}} onEdit={() => {}} onDelete={() => {}} />,
    );
    expect(screen.getByText("JNE")).toBeInTheDocument();
    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("081234567")).toBeInTheDocument();
    expect(screen.getByText("Jl. Mawar No. 1, Jakarta")).toBeInTheDocument();
    expect(container.textContent).toMatch(/5\s*KARUNG/);
    expect(screen.getByText("Gamis dan mukena campur")).toBeInTheDocument();
  });

  it("tidak menampilkan baris No. Telp saat no_telp_penerima kosong", () => {
    render(
      <PengirimanCard
        pengiriman={{ ...basePengiriman, no_telp_penerima: null }}
        onSuratJalan={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.queryByText("No. Telp")).not.toBeInTheDocument();
  });

  it("tidak menampilkan baris Alamat saat alamat kosong", () => {
    render(
      <PengirimanCard
        pengiriman={{ ...basePengiriman, alamat: null }}
        onSuratJalan={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    );
    expect(screen.queryByText("Alamat")).not.toBeInTheDocument();
  });

  it("memanggil onSuratJalan saat tombol 'Surat Jalan' diklik", async () => {
    const user = userEvent.setup();
    const onSuratJalan = vi.fn();
    render(
      <PengirimanCard pengiriman={basePengiriman} onSuratJalan={onSuratJalan} onEdit={() => {}} onDelete={() => {}} />,
    );
    await user.click(screen.getByText("Surat Jalan"));
    expect(onSuratJalan).toHaveBeenCalledWith(basePengiriman);
  });

  it("memanggil onEdit saat tombol 'Edit' diklik", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(
      <PengirimanCard pengiriman={basePengiriman} onSuratJalan={() => {}} onEdit={onEdit} onDelete={() => {}} />,
    );
    await user.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledWith(basePengiriman);
  });

  it("memanggil onDelete saat tombol hapus (🗑) diklik", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    render(
      <PengirimanCard pengiriman={basePengiriman} onSuratJalan={() => {}} onEdit={() => {}} onDelete={onDelete} />,
    );
    await user.click(screen.getByTitle("Hapus pengiriman"));
    expect(onDelete).toHaveBeenCalledWith(basePengiriman);
  });
});
