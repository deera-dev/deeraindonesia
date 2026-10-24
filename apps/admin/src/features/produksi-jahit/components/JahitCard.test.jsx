import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import JahitCard from "./JahitCard";

const baseCard = {
  id: "c1",
  kode_produk: "D-038-KBR",
  nama_produk: "Gamis Kbr",
  size: "Midi",
  warna: "ABU",
  qty: 10,
  status: "belum_assign",
  karyawan_nama: null,
};

describe("JahitCard", () => {
  let onUnassign, onMarkDone, onPrint;
  beforeEach(() => {
    onUnassign = vi.fn();
    onMarkDone = vi.fn();
    onPrint = vi.fn();
  });

  function renderCard(card, extraProps = {}) {
    return render(<JahitCard card={card} onUnassign={onUnassign} onMarkDone={onMarkDone} {...extraProps} />);
  }

  it("menampilkan kode, nama, size, warna, qty", () => {
    renderCard(baseCard);
    expect(screen.getByText("D-038-KBR")).toBeInTheDocument();
    expect(screen.getByText("Gamis Kbr")).toBeInTheDocument();
    expect(screen.getByText("Midi · ABU")).toBeInTheDocument();
    expect(screen.getByText("10 pcs")).toBeInTheDocument();
  });

  it("menampilkan '(tanpa warna)' untuk warna '_'", () => {
    renderCard({ ...baseCard, warna: "_" });
    expect(screen.getByText("Midi · (tanpa warna)")).toBeInTheDocument();
  });

  it("status belum_assign (belum diterima): tidak ada tombol status, cuma info kartu", () => {
    renderCard(baseCard);
    expect(screen.queryByText(/Tandai Selesai/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Batalkan Terima/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Penjahit:/)).not.toBeInTheDocument();
  });

  it("showKode=false: kode & nama produk TIDAK ditampilkan (dipakai saat dikelompokkan JahitColumn)", () => {
    renderCard(baseCard, { showKode: false });
    expect(screen.queryByText("D-038-KBR")).not.toBeInTheDocument();
    expect(screen.queryByText("Gamis Kbr")).not.toBeInTheDocument();
    expect(screen.getByText("Midi · ABU")).toBeInTheDocument();
    expect(screen.getByText("10 pcs")).toBeInTheDocument();
  });

  it("showKode default (true): kode & nama produk tetap tampil", () => {
    renderCard(baseCard);
    expect(screen.getByText("D-038-KBR")).toBeInTheDocument();
  });

  it("status ready_finishing: tampilkan nama penjahit + indikator diterima + tombol tandai selesai & batalkan terima", async () => {
    const user = userEvent.setup();
    const card = { ...baseCard, status: "ready_finishing", karyawan_nama: "Budi" };
    renderCard(card);
    expect(screen.getByText("Budi")).toBeInTheDocument();
    expect(screen.getByText("✓ Sudah diterima")).toBeInTheDocument();

    await user.click(screen.getByText("→ Tandai Selesai"));
    expect(onMarkDone).toHaveBeenCalledWith(card);

    await user.click(screen.getByText("↩ Batalkan Terima"));
    expect(onUnassign).toHaveBeenCalledWith(card);
  });

  it("tanpa onPrint: tombol cetak tidak ditampilkan", () => {
    renderCard(baseCard);
    expect(screen.queryByText(/Cetak Kartu/)).not.toBeInTheDocument();
  });

  it("dengan onPrint: tombol cetak memanggil onPrint dengan kartu ini", async () => {
    const user = userEvent.setup();
    renderCard(baseCard, { onPrint });
    await user.click(screen.getByText(/Cetak Kartu/));
    expect(onPrint).toHaveBeenCalledWith(baseCard);
  });

  it("menampilkan nama tukang potong dari produksi_batch kalau ada", () => {
    renderCard({ ...baseCard, produksi_batch: { tukang_potong_nama: "Dodi" } });
    expect(screen.getByText("Dodi")).toBeInTheDocument();
  });

  it("onReceive: kartu belum diterima punya tombol Terima tanpa scan", async () => {
    const onReceive = vi.fn();
    const user = userEvent.setup();
    renderCard(baseCard, { onReceive });
    await user.click(screen.getByText("✓ Terima tanpa scan"));
    expect(onReceive).toHaveBeenCalledWith(baseCard);
  });

  it("onReceive: kartu ready_finishing tidak menampilkan Terima tanpa scan", () => {
    renderCard({ ...baseCard, status: "ready_finishing", karyawan_nama: "Budi" }, { onReceive: vi.fn() });
    expect(screen.queryByText("✓ Terima tanpa scan")).not.toBeInTheDocument();
  });
});
