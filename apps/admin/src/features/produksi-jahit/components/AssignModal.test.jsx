import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AssignModal from "./AssignModal";

const card = { id: "c1", kode_produk: "D-038-KBR", size: "Midi", warna: "ABU", qty: 10 };
const karyawanList = [
  { id: "k1", nama: "Budi" },
  { id: "k2", nama: "Ani" },
];

describe("AssignModal", () => {
  let onAssign, onClose;
  beforeEach(() => {
    onAssign = vi.fn();
    onClose = vi.fn();
  });

  it("menampilkan info kartu dan daftar karyawan", () => {
    render(<AssignModal card={card} karyawanList={karyawanList} onAssign={onAssign} onClose={onClose} assigning={false} />);
    expect(screen.getByText(/D-038-KBR · Midi · ABU · 10 pcs/)).toBeInTheDocument();
    expect(screen.getByText("Budi")).toBeInTheDocument();
    expect(screen.getByText("Ani")).toBeInTheDocument();
  });

  it("tombol submit disabled sampai penjahit dipilih", async () => {
    const user = userEvent.setup();
    render(<AssignModal card={card} karyawanList={karyawanList} onAssign={onAssign} onClose={onClose} assigning={false} />);
    const submitBtn = screen.getByText(/Assign & Pindah/);
    expect(submitBtn).toBeDisabled();

    await user.selectOptions(screen.getByRole("combobox"), "k1");
    expect(submitBtn).not.toBeDisabled();

    await user.click(submitBtn);
    expect(onAssign).toHaveBeenCalledWith({ cardId: "c1", karyawanId: "k1", karyawanNama: "Budi" });
  });

  it("menampilkan pesan kalau belum ada karyawan tim jahit aktif", () => {
    render(<AssignModal card={card} karyawanList={[]} onAssign={onAssign} onClose={onClose} assigning={false} />);
    expect(screen.getByText(/Belum ada karyawan tim Jahit/)).toBeInTheDocument();
  });

  it("memanggil onClose saat tombol Batal diklik", async () => {
    const user = userEvent.setup();
    render(<AssignModal card={card} karyawanList={karyawanList} onAssign={onAssign} onClose={onClose} assigning={false} />);
    await user.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });
});
