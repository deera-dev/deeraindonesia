import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const mockToast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: mockToast }));

const mockUpdateHargaUpah = vi.fn();
vi.mock("../hooks", () => ({
  useUpdateHargaUpahKirim: () => ({ updateHargaUpah: mockUpdateHargaUpah, saving: false }),
}));

import CmtJahitCard from "./CmtJahitCard";

const GROUP = (o) => ({
  kirimNo: "CMT-1",
  namaVendor: "Vendor A",
  tanggalKirim: "2026-11-19",
  estimasiSelesai: null,
  hargaUpah: 0,
  status: "dikirim",
  rows: [
    { id: "r1", kode_produk: "D-01-OSK", size: "Midi", warna: "HITAM", qty: 10, qty_setor: null },
    { id: "r2", kode_produk: "D-01-OSK", size: "Midi", warna: "PUTIH", qty: 5, qty_setor: null },
  ],
  ...o,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockUpdateHargaUpah.mockResolvedValue(undefined);
});

describe("CmtJahitCard", () => {
  it("status dikirim -> tombol Setor & Batalkan muncul", () => {
    render(
      <CmtJahitCard group={GROUP({})} onSetor={vi.fn()} onBatal={vi.fn()} onSuratJalan={vi.fn()} />,
    );
    expect(screen.getByText("Setor")).toBeInTheDocument();
    expect(screen.getByText("Batalkan")).toBeInTheDocument();
  });

  it("status selain dikirim -> tombol Setor/Batalkan tidak muncul", () => {
    render(
      <CmtJahitCard
        group={GROUP({ status: "setor" })}
        onSetor={vi.fn()}
        onBatal={vi.fn()}
        onSuratJalan={vi.fn()}
      />,
    );
    expect(screen.queryByText("Setor")).toBeNull();
    expect(screen.queryByText("Batalkan")).toBeNull();
  });

  it("tombol Surat Jalan selalu muncul, memanggil onSuratJalan dengan group", () => {
    const onSuratJalan = vi.fn();
    render(
      <CmtJahitCard
        group={GROUP({ status: "selesai" })}
        onSetor={vi.fn()}
        onBatal={vi.fn()}
        onSuratJalan={onSuratJalan}
      />,
    );
    fireEvent.click(screen.getByText("Surat Jalan"));
    expect(onSuratJalan).toHaveBeenCalledWith(GROUP({ status: "selesai" }));
  });

  it("upah 0 -> input kosong-nilai 0, tombol Simpan tidak muncul, tidak ada total modal", () => {
    render(
      <CmtJahitCard group={GROUP({})} onSetor={vi.fn()} onBatal={vi.fn()} onSuratJalan={vi.fn()} />,
    );
    expect(screen.getByLabelText("Upah/pcs")).toHaveValue(0);
    expect(screen.queryByText("Simpan")).toBeNull();
    expect(screen.queryByText(/Perkiraan total modal/)).toBeNull();
  });

  it("ubah input upah -> tombol Simpan muncul & total modal terhitung live", () => {
    render(
      <CmtJahitCard group={GROUP({})} onSetor={vi.fn()} onBatal={vi.fn()} onSuratJalan={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("Upah/pcs"), { target: { value: "7000" } });
    expect(screen.getByText("Simpan")).toBeInTheDocument();
    // total qty = 10 + 5 = 15, x 7000 = 105000
    expect(screen.getByText("105.000")).toBeInTheDocument();
  });

  it("total modal pakai qty_setor kalau sudah disetor (bukan qty kirim)", () => {
    render(
      <CmtJahitCard
        group={GROUP({
          hargaUpah: 7000,
          rows: [
            {
              id: "r1",
              kode_produk: "D-01-OSK",
              size: "Midi",
              warna: "HITAM",
              qty: 10,
              qty_setor: 8,
            },
          ],
        })}
        onSetor={vi.fn()}
        onBatal={vi.fn()}
        onSuratJalan={vi.fn()}
      />,
    );
    // 8 x 7000 = 56000, bukan 10 x 7000
    expect(screen.getByText("56.000")).toBeInTheDocument();
  });

  it("klik Simpan memanggil updateHargaUpah dgn kirimNo & nilai draft", async () => {
    render(
      <CmtJahitCard group={GROUP({})} onSetor={vi.fn()} onBatal={vi.fn()} onSuratJalan={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("Upah/pcs"), { target: { value: "7000" } });
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() =>
      expect(mockUpdateHargaUpah).toHaveBeenCalledWith({ kirimNo: "CMT-1", hargaUpah: "7000" }),
    );
    expect(mockToast.success).toHaveBeenCalled();
  });

  it("gagal simpan upah -> toast.error", async () => {
    mockUpdateHargaUpah.mockRejectedValueOnce(new Error("gagal jaringan"));
    render(
      <CmtJahitCard group={GROUP({})} onSetor={vi.fn()} onBatal={vi.fn()} onSuratJalan={vi.fn()} />,
    );
    fireEvent.change(screen.getByLabelText("Upah/pcs"), { target: { value: "7000" } });
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() =>
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining("gagal jaringan")),
    );
  });

  it("draft resync kalau group.hargaUpah berubah dari luar (mis. setelah refetch)", () => {
    const { rerender } = render(
      <CmtJahitCard
        group={GROUP({ hargaUpah: 0 })}
        onSetor={vi.fn()}
        onBatal={vi.fn()}
        onSuratJalan={vi.fn()}
      />,
    );
    rerender(
      <CmtJahitCard
        group={GROUP({ hargaUpah: 5000 })}
        onSetor={vi.fn()}
        onBatal={vi.fn()}
        onSuratJalan={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("Upah/pcs")).toHaveValue(5000);
    expect(screen.queryByText("Simpan")).toBeNull();
  });
});
