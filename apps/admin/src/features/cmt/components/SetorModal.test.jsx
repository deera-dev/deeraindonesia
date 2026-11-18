import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));

const mockSetorKirim = vi.fn();
vi.mock("../hooks", () => ({
  useSetorKirimCmtJahit: () => ({ setorKirim: mockSetorKirim, submitting: false }),
}));

import SetorModal from "./SetorModal";

const GROUP = {
  kirimNo: "CMT-1",
  namaVendor: "Vendor A",
  rows: [
    { id: "r1", kode_produk: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 10, status: "dikirim" },
    { id: "r2", kode_produk: "D-01-OSK", size: "Gamis", warna: "MERAH", qty: 5, status: "dikirim" },
    { id: "r3", kode_produk: "D-01-OSK", size: "Midi", warna: "PUTIH", qty: 3, status: "selesai" },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockSetorKirim.mockResolvedValue(undefined);
});

describe("SetorModal", () => {
  it("hanya menampilkan baris berstatus dikirim utk dikoreksi, qty default = qty kirim", () => {
    render(<SetorModal group={GROUP} onClose={vi.fn()} />);
    expect(screen.getByTestId("setor-qty-r1")).toHaveValue(10);
    expect(screen.getByTestId("setor-qty-r2")).toHaveValue(5);
    expect(screen.queryByTestId("setor-qty-r3")).toBeNull();
  });

  it("submit mengirim itemsSetor dgn qty yg sudah dikoreksi", async () => {
    const onClose = vi.fn();
    render(<SetorModal group={GROUP} onClose={onClose} />);
    fireEvent.change(screen.getByTestId("setor-qty-r1"), { target: { value: "9" } });
    fireEvent.click(screen.getByText("Konfirmasi Setor"));

    await vi.waitFor(() => expect(mockSetorKirim).toHaveBeenCalled());
    const args = mockSetorKirim.mock.calls[0][0];
    expect(args.kirimNo).toBe("CMT-1");
    expect(args.itemsSetor).toEqual([
      { id: "r1", qtySetor: 9 },
      { id: "r2", qtySetor: 5 },
    ]);
    expect(mockToast.success).toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it("gagal submit -> toast.error", async () => {
    mockSetorKirim.mockRejectedValueOnce(new Error("gagal jaringan"));
    render(<SetorModal group={GROUP} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Konfirmasi Setor"));
    await vi.waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("gagal jaringan")),
    );
  });

  it("klik Batal memanggil onClose", () => {
    const onClose = vi.fn();
    render(<SetorModal group={GROUP} onClose={onClose} />);
    fireEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });
});
