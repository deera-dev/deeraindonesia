import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import DeleteConfirmModal from "./DeleteConfirmModal";

const pengiriman = { pengiriman_no: "KRM-1", nama_penerima: "Budi" };

describe("DeleteConfirmModal", () => {
  it("returns null saat pengiriman null", () => {
    const { container } = render(
      <DeleteConfirmModal pengiriman={null} onConfirm={() => {}} onCancel={() => {}} loading={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("menampilkan nomor & nama penerima", () => {
    render(<DeleteConfirmModal pengiriman={pengiriman} onConfirm={() => {}} onCancel={() => {}} loading={false} />);
    expect(screen.getByText("KRM-1")).toBeInTheDocument();
    expect(screen.getByText("Budi")).toBeInTheDocument();
  });

  it("memanggil onConfirm saat tombol Hapus diklik", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<DeleteConfirmModal pengiriman={pengiriman} onConfirm={onConfirm} onCancel={() => {}} loading={false} />);
    await user.click(screen.getByText("Hapus"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("memanggil onCancel saat tombol Batal atau ✕ atau backdrop diklik", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { container } = render(
      <DeleteConfirmModal pengiriman={pengiriman} onConfirm={() => {}} onCancel={onCancel} loading={false} />,
    );
    await user.click(screen.getByText("Batal"));
    await user.click(screen.getByText("✕"));
    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it("menampilkan 'Menghapus...' & disable tombol saat loading", () => {
    render(<DeleteConfirmModal pengiriman={pengiriman} onConfirm={() => {}} onCancel={() => {}} loading={true} />);
    expect(screen.getByText("Menghapus...")).toBeInTheDocument();
    expect(screen.getByText("Menghapus...")).toBeDisabled();
    expect(screen.getByText("Batal")).toBeDisabled();
  });
});
