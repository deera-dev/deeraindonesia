import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const toastMock = { success: vi.fn(), error: vi.fn() };
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: toastMock }));

const moveStokLokasiMock = vi.fn();
vi.mock("../hooks", () => ({
  useMoveStokLokasi: () => moveStokLokasiMock,
}));

const { default: PindahStokLokasiModal } = await import("./PindahStokLokasiModal");

function fillForm({ from = "Cideng", to = "Gudang", confirm = "PINDAH", password = "secret123" } = {}) {
  return async () => {
    await userEvent.selectOptions(screen.getByLabelText(/Dari Lokasi/i), from);
    await userEvent.selectOptions(screen.getByLabelText(/Ke Lokasi/i), to);
    if (confirm) await userEvent.type(screen.getByPlaceholderText("PINDAH"), confirm);
    if (password) await userEvent.type(screen.getByPlaceholderText(/Masukkan password/i), password);
  };
}

beforeEach(() => {
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  moveStokLokasiMock.mockReset();
});

describe("PindahStokLokasiModal", () => {
  it("tombol submit disabled sebelum form lengkap", () => {
    render(<PindahStokLokasiModal onClose={vi.fn()} onDone={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Pindahkan Stok/i })).toBeDisabled();
  });

  it("menolak submit kalau lokasi asal = tujuan (tombol tetap disabled + pesan error)", async () => {
    render(<PindahStokLokasiModal onClose={vi.fn()} onDone={vi.fn()} />);
    await userEvent.selectOptions(screen.getByLabelText(/Dari Lokasi/i), "Cideng");
    await userEvent.selectOptions(screen.getByLabelText(/Ke Lokasi/i), "Cideng");
    expect(screen.getByText(/tidak boleh sama/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Pindahkan Stok/i })).toBeDisabled();
  });

  it("submit sukses: memanggil useMoveStokLokasi dgn field yang benar, toast success, onDone dipanggil", async () => {
    moveStokLokasiMock.mockResolvedValue({ success: true, total_pcs: 12 });
    const onDone = vi.fn();
    render(<PindahStokLokasiModal onClose={vi.fn()} onDone={onDone} />);

    await fillForm()();
    await userEvent.click(screen.getByRole("button", { name: /Pindahkan Stok/i }));

    expect(moveStokLokasiMock).toHaveBeenCalledWith({
      fromLocation: "cideng",
      toLocation: "gudang",
      password: "secret123",
    });
    expect(toastMock.success).toHaveBeenCalled();
    expect(onDone).toHaveBeenCalled();
  });

  it("submit gagal (mis. password salah): menampilkan pesan error, onDone TIDAK dipanggil", async () => {
    moveStokLokasiMock.mockRejectedValue(new Error("Password salah."));
    const onDone = vi.fn();
    render(<PindahStokLokasiModal onClose={vi.fn()} onDone={onDone} />);

    await fillForm()();
    await userEvent.click(screen.getByRole("button", { name: /Pindahkan Stok/i }));

    expect(await screen.findByText("Password salah.")).toBeInTheDocument();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("tombol Batal memanggil onClose", async () => {
    const onClose = vi.fn();
    render(<PindahStokLokasiModal onClose={onClose} onDone={vi.fn()} />);
    await userEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });
});
