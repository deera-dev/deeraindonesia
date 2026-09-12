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
  let onAssign, onMoveToFinishing, onUnassign, onMoveBackToProgress, onMarkDone;
  beforeEach(() => {
    onAssign = vi.fn();
    onMoveToFinishing = vi.fn();
    onUnassign = vi.fn();
    onMoveBackToProgress = vi.fn();
    onMarkDone = vi.fn();
  });

  function renderCard(card) {
    return render(
      <JahitCard
        card={card}
        onAssign={onAssign}
        onMoveToFinishing={onMoveToFinishing}
        onUnassign={onUnassign}
        onMoveBackToProgress={onMoveBackToProgress}
        onMarkDone={onMarkDone}
      />,
    );
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

  it("status belum_assign: tombol assign memanggil onAssign dengan kartu ini", async () => {
    const user = userEvent.setup();
    renderCard(baseCard);
    await user.click(screen.getByText("+ Assign Penjahit"));
    expect(onAssign).toHaveBeenCalledWith(baseCard);
    expect(screen.queryByText(/Penjahit:/)).not.toBeInTheDocument();
  });

  it("status on_progress: tampilkan nama penjahit + tombol pindah & batalkan", async () => {
    const user = userEvent.setup();
    const card = { ...baseCard, status: "on_progress", karyawan_nama: "Budi" };
    renderCard(card);
    expect(screen.getByText("Budi")).toBeInTheDocument();

    await user.click(screen.getByText("→ Ready Finishing"));
    expect(onMoveToFinishing).toHaveBeenCalledWith(card);

    await user.click(screen.getByText("Batalkan assign"));
    expect(onUnassign).toHaveBeenCalledWith(card);
  });

  it("status ready_finishing: tampilkan indikator selesai + tombol tandai selesai & kembali", async () => {
    const user = userEvent.setup();
    const card = { ...baseCard, status: "ready_finishing", karyawan_nama: "Budi" };
    renderCard(card);
    expect(screen.getByText("✓ Sudah disetor")).toBeInTheDocument();

    await user.click(screen.getByText("→ Tandai Selesai"));
    expect(onMarkDone).toHaveBeenCalledWith(card);

    await user.click(screen.getByText("↩ Kembali ke On Progress"));
    expect(onMoveBackToProgress).toHaveBeenCalledWith(card);
  });
});
