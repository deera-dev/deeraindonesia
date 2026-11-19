import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LogoutConfirmModal from "./LogoutConfirmModal";

describe("LogoutConfirmModal", () => {
  it("returns null saat open false", () => {
    const { container } = render(
      <LogoutConfirmModal open={false} onConfirm={() => {}} onCancel={() => {}} loading={false} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("menampilkan pesan konfirmasi saat open true", () => {
    render(<LogoutConfirmModal open={true} onConfirm={() => {}} onCancel={() => {}} loading={false} />);
    expect(screen.getByText("Keluar dari Akun?")).toBeInTheDocument();
  });

  it("memanggil onConfirm saat tombol 'Ya, Keluar' diklik", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<LogoutConfirmModal open={true} onConfirm={onConfirm} onCancel={() => {}} loading={false} />);
    await user.click(screen.getByText("Ya, Keluar"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("memanggil onCancel saat tombol Batal atau ✕ atau backdrop diklik", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    const { container } = render(
      <LogoutConfirmModal open={true} onConfirm={() => {}} onCancel={onCancel} loading={false} />,
    );
    await user.click(screen.getByText("Batal"));
    await user.click(screen.getByText("✕"));
    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onCancel).toHaveBeenCalledTimes(3);
  });

  it("menampilkan 'Keluar...' & disable tombol saat loading", () => {
    render(<LogoutConfirmModal open={true} onConfirm={() => {}} onCancel={() => {}} loading={true} />);
    expect(screen.getByText("Keluar...")).toBeInTheDocument();
    expect(screen.getByText("Keluar...")).toBeDisabled();
    expect(screen.getByText("Batal")).toBeDisabled();
  });
});
