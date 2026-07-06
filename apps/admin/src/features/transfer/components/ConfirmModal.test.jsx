import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfirmModal from "./ConfirmModal";

const transfer = {
  transfer_no: "SJ-20240115-ABC",
  created_at: "2024-01-15T10:00:00Z",
  from_location: "gudang",
  to_location: "cideng",
  items: [
    { kode: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 5 },
    { kode: "D-02-SFN", size: "Gamis", warna: "", qty: 3 },
  ],
};

describe("ConfirmModal", () => {
  it("returns null saat transfer null", () => {
    const { container } = render(
      <ConfirmModal type="approve" transfer={null} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null saat type null", () => {
    const { container } = render(
      <ConfirmModal type={null} transfer={transfer} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null saat type tidak dikenal", () => {
    const { container } = render(
      <ConfirmModal type="unknown" transfer={transfer} onConfirm={vi.fn()} onCancel={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  // type=approve
  it("approve: menampilkan tombol Setuju, info lokasi, total qty", () => {
    render(<ConfirmModal type="approve" transfer={transfer} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Setuju")).toBeInTheDocument();
    expect(screen.getAllByText(/Gudang/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Cideng/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/8 pcs/).length).toBeGreaterThan(0);
  });

  it("approve: memanggil onConfirm tanpa argumen saat Setuju diklik", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal type="approve" transfer={transfer} onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByText("Setuju"));
    expect(onConfirm).toHaveBeenCalledWith();
  });

  // type=reject
  it("reject: menampilkan textarea alasan dan tombol Tolak", () => {
    render(<ConfirmModal type="reject" transfer={transfer} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByPlaceholderText(/alasan penolakan/i)).toBeInTheDocument();
    expect(screen.getByText("Tolak")).toBeInTheDocument();
  });

  it("reject: memanggil onConfirm dengan reason saat Tolak diklik", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal type="reject" transfer={transfer} onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/alasan penolakan/i), "Stok tidak cukup");
    await userEvent.click(screen.getByText("Tolak"));
    expect(onConfirm).toHaveBeenCalledWith({ reason: "Stok tidak cukup" });
  });

  it("reject: memanggil onConfirm dengan reason kosong saat textarea tidak diisi", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal type="reject" transfer={transfer} onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByText("Tolak"));
    expect(onConfirm).toHaveBeenCalledWith({ reason: "" });
  });

  // type=delete
  it("delete: menampilkan transfer_no dan tombol Hapus", () => {
    render(<ConfirmModal type="delete" transfer={transfer} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Hapus")).toBeInTheDocument();
    expect(screen.getAllByText(/SJ-20240115-ABC/).length).toBeGreaterThan(0);
  });

  it("delete: memanggil onConfirm tanpa argumen", async () => {
    const onConfirm = vi.fn();
    render(<ConfirmModal type="delete" transfer={transfer} onConfirm={onConfirm} onCancel={vi.fn()} />);
    await userEvent.click(screen.getByText("Hapus"));
    expect(onConfirm).toHaveBeenCalledWith();
  });

  // type=surat_jalan
  it("surat_jalan: menampilkan tombol Simpan dan daftar item", () => {
    render(<ConfirmModal type="surat_jalan" transfer={transfer} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Simpan")).toBeInTheDocument();
    expect(screen.getAllByText(/Gudang/).length).toBeGreaterThan(0);
  });

  it("surat_jalan: item > 5 tampil '+ N item lainnya'", () => {
    const bigTransfer = {
      ...transfer,
      items: Array.from({ length: 7 }, (_, i) => ({
        kode: `D-0${i}-OSK`, size: "Midi", warna: "", qty: 1,
      })),
    };
    render(<ConfirmModal type="surat_jalan" transfer={bigTransfer} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/\+ 2 item lainnya/)).toBeInTheDocument();
  });

  // Interaksi umum
  it("memanggil onCancel saat klik backdrop", async () => {
    const onCancel = vi.fn();
    const { container } = render(
      <ConfirmModal type="approve" transfer={transfer} onConfirm={vi.fn()} onCancel={onCancel} />
    );
    await userEvent.click(container.querySelector(".absolute.inset-0"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("memanggil onCancel saat klik ✕", async () => {
    const onCancel = vi.fn();
    render(<ConfirmModal type="approve" transfer={transfer} onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByText("✕"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("memanggil onCancel saat klik Batal", async () => {
    const onCancel = vi.fn();
    render(<ConfirmModal type="approve" transfer={transfer} onConfirm={vi.fn()} onCancel={onCancel} />);
    await userEvent.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("loading=true: tombol confirm disabled dan teks 'Memproses...'", () => {
    render(<ConfirmModal type="approve" transfer={transfer} onConfirm={vi.fn()} onCancel={vi.fn()} loading={true} />);
    expect(screen.getByText("Memproses...")).toBeDisabled();
  });

  it("transfer tanpa items: total qty = 0", () => {
    render(<ConfirmModal type="approve" transfer={{ ...transfer, items: [] }} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getAllByText(/0 pcs/).length).toBeGreaterThan(0);
  });

  it("menampilkan no surat jalan di header icon section", () => {
    render(<ConfirmModal type="delete" transfer={transfer} onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(transfer.transfer_no)).toBeInTheDocument();
  });
});
