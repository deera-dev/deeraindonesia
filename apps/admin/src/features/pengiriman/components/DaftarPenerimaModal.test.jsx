import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DaftarPenerimaModal from "./DaftarPenerimaModal";

const pelangganListState = { pelanggan: [], loading: false };
vi.mock("../../pelanggan", () => ({
  usePelangganList: () => pelangganListState,
}));

const lengkap1 = {
  id: "p1",
  nama: "Budi Santoso",
  no_hp: "081234567",
  alamat: "Jl. Mawar No. 1",
  ekspedisi_biasa: "JNE",
};
const lengkap2 = {
  id: "p2",
  nama: "Siti Aminah",
  no_hp: "081999999",
  alamat: "Jl. Melati No. 2",
  ekspedisi_biasa: "J&T",
};
const tidakLengkap = { id: "p3", nama: "Tanpa Alamat", no_hp: "0811", alamat: null, ekspedisi_biasa: "JNE" };

beforeEach(() => {
  pelangganListState.pelanggan = [];
  pelangganListState.loading = false;
});

describe("DaftarPenerimaModal", () => {
  it("menampilkan loading saat loading=true", () => {
    pelangganListState.loading = true;
    render(<DaftarPenerimaModal onPick={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Memuat data...")).toBeInTheDocument();
  });

  it("HANYA menampilkan pelanggan dgn data lengkap (nama+no_hp+alamat+ekspedisi_biasa)", () => {
    pelangganListState.pelanggan = [lengkap1, tidakLengkap, lengkap2];
    render(<DaftarPenerimaModal onPick={() => {}} onClose={() => {}} />);

    expect(screen.getByText("Budi Santoso")).toBeInTheDocument();
    expect(screen.getByText("Siti Aminah")).toBeInTheDocument();
    expect(screen.queryByText("Tanpa Alamat")).not.toBeInTheDocument();
  });

  it("menampilkan pesan kosong saat tidak ada penerima lengkap", () => {
    pelangganListState.pelanggan = [tidakLengkap];
    render(<DaftarPenerimaModal onPick={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Belum ada penerima dengan data lengkap/)).toBeInTheDocument();
  });

  it("menampilkan no. HP, ekspedisi, dan alamat tiap penerima", () => {
    pelangganListState.pelanggan = [lengkap1];
    render(<DaftarPenerimaModal onPick={() => {}} onClose={() => {}} />);
    expect(screen.getByText("081234567 · JNE")).toBeInTheDocument();
    expect(screen.getByText("Jl. Mawar No. 1")).toBeInTheDocument();
  });

  it("mencari via nama/no_hp/ekspedisi memfilter daftar", async () => {
    pelangganListState.pelanggan = [lengkap1, lengkap2];
    const user = userEvent.setup();
    render(<DaftarPenerimaModal onPick={() => {}} onClose={() => {}} />);

    await user.type(screen.getByPlaceholderText("Cari nama, no. HP, atau ekspedisi..."), "J&T");

    expect(screen.getByText("Siti Aminah")).toBeInTheDocument();
    expect(screen.queryByText("Budi Santoso")).not.toBeInTheDocument();
  });

  it("klik satu penerima memanggil onPick dengan objek pelanggan itu", async () => {
    pelangganListState.pelanggan = [lengkap1];
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<DaftarPenerimaModal onPick={onPick} onClose={() => {}} />);

    await user.click(screen.getByText("Budi Santoso"));

    expect(onPick).toHaveBeenCalledWith(lengkap1);
  });

  it("memanggil onClose saat ✕ atau backdrop diklik", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    const { container } = render(<DaftarPenerimaModal onPick={() => {}} onClose={onClose} />);

    await user.click(screen.getByText("✕"));
    await user.click(container.querySelector(".absolute.inset-0"));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
