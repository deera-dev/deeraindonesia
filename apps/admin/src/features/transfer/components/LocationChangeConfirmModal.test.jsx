import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LocationChangeConfirmModal from "./LocationChangeConfirmModal";

describe("LocationChangeConfirmModal", () => {
  it("menampilkan title & description", () => {
    render(
      <LocationChangeConfirmModal
        title="Ganti Lokasi Asal?"
        description="Lokasi asal akan diganti dari Gudang ke Cideng."
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByText("Ganti Lokasi Asal?")).toBeInTheDocument();
    expect(screen.getByText("Lokasi asal akan diganti dari Gudang ke Cideng.")).toBeInTheDocument();
  });

  it("memanggil onConfirm saat tombol 'Ya, Ganti' diklik", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <LocationChangeConfirmModal title="T" description="D" onConfirm={onConfirm} onCancel={() => {}} />,
    );
    await user.click(screen.getByText("Ya, Ganti"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("memanggil onCancel saat tombol Batal atau ✕ atau backdrop diklik", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { container } = render(
      <LocationChangeConfirmModal title="T" description="D" onConfirm={() => {}} onCancel={onCancel} />,
    );
    await user.click(screen.getByText("Batal"));
    await user.click(screen.getByText("✕"));
    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onCancel).toHaveBeenCalledTimes(3);
  });
});
