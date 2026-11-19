import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OrphanStokConfirmModal from "./OrphanStokConfirmModal";

describe("OrphanStokConfirmModal", () => {
  it("returns null saat entries kosong", () => {
    const { container } = render(
      <OrphanStokConfirmModal entries={[]} onConfirm={() => {}} onCancel={() => {}} loading={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null saat entries null", () => {
    const { container } = render(
      <OrphanStokConfirmModal entries={null} onConfirm={() => {}} onCancel={() => {}} loading={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("menampilkan tiap warna + qty-nya, dan total keseluruhan", () => {
    render(
      <OrphanStokConfirmModal
        entries={[["BURGUNDY", 8], ["COKLAT MUDA", 8]]}
        onConfirm={() => {}}
        onCancel={() => {}}
        loading={false}
      />,
    );
    expect(screen.getByText("BURGUNDY")).toBeInTheDocument();
    expect(screen.getByText("COKLAT MUDA")).toBeInTheDocument();
    expect(screen.getByText(/16 pcs/)).toBeInTheDocument();
  });

  it("memanggil onConfirm saat tombol 'Ya, Hapus & Simpan' diklik", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <OrphanStokConfirmModal entries={[["BURGUNDY", 8]]} onConfirm={onConfirm} onCancel={() => {}} loading={false} />,
    );
    await user.click(screen.getByText("Ya, Hapus & Simpan"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("memanggil onCancel saat tombol Batal atau ✕ atau backdrop diklik", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { container } = render(
      <OrphanStokConfirmModal entries={[["BURGUNDY", 8]]} onConfirm={() => {}} onCancel={onCancel} loading={false} />,
    );
    await user.click(screen.getByText("Batal"));
    await user.click(screen.getByText("✕"));
    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it("menampilkan 'Menyimpan...' & disable tombol saat loading", () => {
    render(
      <OrphanStokConfirmModal entries={[["BURGUNDY", 8]]} onConfirm={() => {}} onCancel={() => {}} loading={true} />,
    );
    expect(screen.getByText("Menyimpan...")).toBeInTheDocument();
    expect(screen.getByText("Menyimpan...")).toBeDisabled();
    expect(screen.getByText("Batal")).toBeDisabled();
  });
});
