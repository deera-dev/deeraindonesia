import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));
vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
  inputCls: "",
  labelCls: "",
}));
const mockUpdateKasbonRiwayatItem = vi.fn().mockResolvedValue({ newJumlah: 1030000, newSisa: 730000, newStatus: "belum" });
vi.mock("../hooks", () => ({ useUpdateKasbonRiwayatItem: vi.fn(() => mockUpdateKasbonRiwayatItem) }));

import RiwayatEditModal from "./RiwayatEditModal";

const kasbon = { id: "kb1", jumlah: 1000000, sisa: 700000, tambahan: [], cicilan: [] };
const entry = { tanggal: "2026-11-03", jumlah: 50000, keterangan: "kopi" };

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateKasbonRiwayatItem.mockResolvedValue({ newJumlah: 1030000, newSisa: 730000, newStatus: "belum" });
});

describe("RiwayatEditModal", () => {
  it("renders title for jenis=tambah", () => {
    render(<RiwayatEditModal kasbon={kasbon} jenis="tambah" index={0} entry={entry} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("Edit Riwayat Tambahan")).toBeInTheDocument();
  });

  it("renders title for jenis=bayar", () => {
    render(<RiwayatEditModal kasbon={kasbon} jenis="bayar" index={0} entry={entry} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("Edit Riwayat Cicilan")).toBeInTheDocument();
  });

  it("prefills tanggal, jumlah, keterangan from entry", () => {
    render(<RiwayatEditModal kasbon={kasbon} jenis="tambah" index={0} entry={entry} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(document.querySelector('input[type="date"]').value).toBe("2026-11-03");
    expect(document.querySelector('input[type="number"]').value).toBe("50000");
    expect(document.querySelector('input[type="text"]').value).toBe("kopi");
  });

  it("shows error when jumlah is 0 on submit", async () => {
    render(<RiwayatEditModal kasbon={kasbon} jenis="tambah" index={0} entry={entry} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.change(document.querySelector('input[type="number"]'), { target: { value: "0" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Jumlah harus lebih dari 0."));
    expect(mockUpdateKasbonRiwayatItem).not.toHaveBeenCalled();
  });

  it("calls updateKasbonRiwayatItem with kasbon/jenis/index + edited fields on submit", async () => {
    const onSave = vi.fn();
    render(<RiwayatEditModal kasbon={kasbon} jenis="tambah" index={0} entry={entry} onClose={vi.fn()} onSave={onSave} />);
    fireEvent.change(document.querySelector('input[type="number"]'), { target: { value: "80000" } });
    fireEvent.change(document.querySelector('input[type="text"]'), { target: { value: "kopi + rokok" } });
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockUpdateKasbonRiwayatItem).toHaveBeenCalled());
    expect(mockUpdateKasbonRiwayatItem).toHaveBeenCalledWith({
      kasbon, jenis: "tambah", index: 0, tanggal: "2026-11-03", jumlah: 80000, keterangan: "kopi + rokok",
    });
    expect(onSave).toHaveBeenCalled();
  });

  it("shows success toast with newSisa on save", async () => {
    render(<RiwayatEditModal kasbon={kasbon} jenis="tambah" index={0} entry={entry} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.success).toHaveBeenCalledWith(expect.stringContaining("Riwayat diperbarui")));
  });

  it("shows error toast when update throws", async () => {
    mockUpdateKasbonRiwayatItem.mockRejectedValueOnce(new Error("sisa negatif"));
    render(<RiwayatEditModal kasbon={kasbon} jenis="bayar" index={0} entry={entry} onClose={vi.fn()} onSave={vi.fn()} />);
    fireEvent.submit(document.querySelector("form"));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Gagal: sisa negatif"));
  });

  it("calls onClose when Batal clicked", () => {
    const onClose = vi.fn();
    render(<RiwayatEditModal kasbon={kasbon} jenis="tambah" index={0} entry={entry} onClose={onClose} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when × or backdrop clicked", () => {
    const onClose = vi.fn();
    render(<RiwayatEditModal kasbon={kasbon} jenis="tambah" index={0} entry={entry} onClose={onClose} onSave={vi.fn()} />);
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });
});
