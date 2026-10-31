import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ReceiveCardModal from "./ReceiveCardModal";

const card = { id: "c1", kode_produk: "D-038-KBR", size: "Midi", warna: "ABU", qty: 10 };
const karyawanList = [
  { id: "k1", nama: "Budi" },
  { id: "k2", nama: "Ani" },
];

describe("ReceiveCardModal", () => {
  let onConfirm, onClose;
  beforeEach(() => {
    onConfirm = vi.fn();
    onClose = vi.fn();
  });

  it("menampilkan info kartu (rencana qty) dan daftar karyawan, jumlah prefilled dari card.qty", () => {
    render(
      <ReceiveCardModal
        card={card}
        karyawanList={karyawanList}
        onConfirm={onConfirm}
        onClose={onClose}
        receiving={false}
      />,
    );
    expect(screen.getByText(/D-038-KBR · Midi · ABU · rencana 10 pcs/)).toBeInTheDocument();
    expect(screen.getByText("Budi")).toBeInTheDocument();
    expect(screen.getByText("Ani")).toBeInTheDocument();
    expect(screen.getByDisplayValue("10")).toBeInTheDocument();
  });

  it("tombol submit disabled sampai penjahit dipilih", async () => {
    const user = userEvent.setup();
    render(
      <ReceiveCardModal
        card={card}
        karyawanList={karyawanList}
        onConfirm={onConfirm}
        onClose={onClose}
        receiving={false}
      />,
    );
    const submitBtn = screen.getByText(/Konfirmasi Terima/);
    expect(submitBtn).toBeDisabled();
    await user.selectOptions(screen.getByRole("combobox"), "k1");
    expect(submitBtn).not.toBeDisabled();
  });

  it("submit memanggil onConfirm dengan cardId, karyawan, dan jumlah", async () => {
    const user = userEvent.setup();
    render(
      <ReceiveCardModal
        card={card}
        karyawanList={karyawanList}
        onConfirm={onConfirm}
        onClose={onClose}
        receiving={false}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox"), "k1");
    await user.click(screen.getByText(/Konfirmasi Terima/));
    expect(onConfirm).toHaveBeenCalledWith({
      cardId: "c1",
      karyawanId: "k1",
      karyawanNama: "Budi",
      qty: 10,
    });
  });

  it("jumlah bisa dikoreksi, memunculkan peringatan beda dari rencana", async () => {
    const user = userEvent.setup();
    render(
      <ReceiveCardModal
        card={card}
        karyawanList={karyawanList}
        onConfirm={onConfirm}
        onClose={onClose}
        receiving={false}
      />,
    );
    const jumlahInput = screen.getByDisplayValue("10");
    await user.clear(jumlahInput);
    await user.type(jumlahInput, "7");
    expect(screen.getByText(/Beda dari rencana/)).toBeInTheDocument();

    await user.selectOptions(screen.getByRole("combobox"), "k1");
    await user.click(screen.getByText(/Konfirmasi Terima/));
    expect(onConfirm).toHaveBeenCalledWith({
      cardId: "c1",
      karyawanId: "k1",
      karyawanNama: "Budi",
      qty: 7,
    });
  });

  it("jumlah 0 menonaktifkan tombol submit", async () => {
    const user = userEvent.setup();
    render(
      <ReceiveCardModal
        card={card}
        karyawanList={karyawanList}
        onConfirm={onConfirm}
        onClose={onClose}
        receiving={false}
      />,
    );
    await user.selectOptions(screen.getByRole("combobox"), "k1");
    const jumlahInput = screen.getByDisplayValue("10");
    await user.clear(jumlahInput);
    await user.type(jumlahInput, "0");
    expect(screen.getByText(/Konfirmasi Terima/)).toBeDisabled();
  });

  it("tombol Batal memanggil onClose", async () => {
    const user = userEvent.setup();
    render(
      <ReceiveCardModal
        card={card}
        karyawanList={karyawanList}
        onConfirm={onConfirm}
        onClose={onClose}
        receiving={false}
      />,
    );
    await user.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("receiving=true menonaktifkan tombol dan menampilkan 'Menyimpan...'", () => {
    render(
      <ReceiveCardModal
        card={card}
        karyawanList={karyawanList}
        onConfirm={onConfirm}
        onClose={onClose}
        receiving={true}
      />,
    );
    expect(screen.getByText("Menyimpan...")).toBeInTheDocument();
    expect(screen.getByText("Batal")).toBeDisabled();
  });

  it("daftar karyawan kosong menampilkan pesan, bukan select", () => {
    render(
      <ReceiveCardModal
        card={card}
        karyawanList={[]}
        onConfirm={onConfirm}
        onClose={onClose}
        receiving={false}
      />,
    );
    expect(screen.getByText(/Belum ada karyawan tim Jahit yang aktif/)).toBeInTheDocument();
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
  });
});
