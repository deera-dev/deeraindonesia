import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockQrDataUrl = vi.fn().mockResolvedValue("data:image/png;base64,fake");
vi.mock("../render", () => ({
  qrDataUrl: (...args) => mockQrDataUrl(...args),
}));

vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUseKaryawanPotong = vi.fn();
vi.mock("../../produksi-record/hooks", () => ({
  useKaryawanPotong: (...args) => mockUseKaryawanPotong(...args),
}));

const mockSetTukangPotong = vi.fn().mockResolvedValue(undefined);
vi.mock("../hooks", () => ({
  useSetTukangPotongForBatch: () => ({ setTukangPotong: mockSetTukangPotong, setting: false }),
}));

import PrintKartuModal from "./PrintKartuModal";
import { toast } from "@deera/shared/features/toast/hooks";

const card = {
  id: "11111111-2222-3333-4444-555555555555",
  batch_id: "b1",
  kode_produk: "D-07-OSK",
  nama_produk: "Gamis Wolfis Polos",
  size: "Midi",
  warna: "HITAM",
  qty: 12,
};

describe("PrintKartuModal", () => {
  let onClose;
  beforeEach(() => {
    vi.clearAllMocks();
    onClose = vi.fn();
    vi.spyOn(window, "print").mockImplementation(() => {});
    mockUseKaryawanPotong.mockReturnValue({ karyawanList: [{ id: "p1", nama: "Dodi" }] });
    mockSetTukangPotong.mockResolvedValue(undefined);
  });

  it("tidak render apapun kalau card null", () => {
    const { container } = render(<PrintKartuModal card={null} onClose={onClose} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("menampilkan kode produk di header dan hint kertas 58x98mm Epson L1250", () => {
    render(<PrintKartuModal card={card} onClose={onClose} />);
    expect(screen.getAllByText("D-07-OSK").length).toBeGreaterThan(0);
    expect(screen.getByText(/58.*98 mm/)).toBeInTheDocument();
    expect(screen.getByText(/Epson L1250/)).toBeInTheDocument();
  });

  it("generate barcode dari URL singkat /j/:id (bukan raw card id) supaya scan orang luar lari ke deera.id", async () => {
    render(<PrintKartuModal card={card} onClose={onClose} />);
    await waitFor(() =>
      expect(mockQrDataUrl).toHaveBeenCalledWith(
        "https://deera.id/j/11111111-2222-3333-4444-555555555555",
        400,
      ),
    );
  });

  it("tombol Print Kartu memanggil window.print()", async () => {
    const user = userEvent.setup();
    render(<PrintKartuModal card={card} onClose={onClose} />);
    await user.click(screen.getByText("Print Kartu"));
    expect(window.print).toHaveBeenCalled();
  });

  it("tombol Tutup memanggil onClose", async () => {
    const user = userEvent.setup();
    render(<PrintKartuModal card={card} onClose={onClose} />);
    await user.click(screen.getByText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });

  describe("T.Potong belum di-set di batch", () => {
    it("tampil picker kalau tukang_potong_id batch masih kosong", () => {
      mockUseKaryawanPotong.mockReturnValue({
        karyawanList: [{ id: "p1", nama: "Dodi" }, { id: "p2", nama: "Rina" }],
      });
      render(<PrintKartuModal card={card} onClose={onClose} />);
      expect(screen.getByText(/Tukang Potong belum di-set/)).toBeInTheDocument();
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("auto-pilih & simpan otomatis kalau cuma ada 1 tukang potong aktif", async () => {
      mockUseKaryawanPotong.mockReturnValue({ karyawanList: [{ id: "p1", nama: "Dodi" }] });
      render(<PrintKartuModal card={card} onClose={onClose} />);
      await waitFor(() =>
        expect(mockSetTukangPotong).toHaveBeenCalledWith({
          batchId: "b1",
          tukangPotongId: "p1",
          tukangPotongNama: "Dodi",
        }),
      );
      expect(screen.getAllByText("Dodi").length).toBeGreaterThan(0);
    });

    it("memilih manual dari dropdown menyimpan ke batch & update preview", async () => {
      mockUseKaryawanPotong.mockReturnValue({
        karyawanList: [{ id: "p1", nama: "Dodi" }, { id: "p2", nama: "Rina" }],
      });
      const user = userEvent.setup();
      render(<PrintKartuModal card={card} onClose={onClose} />);
      await user.selectOptions(screen.getByRole("combobox"), "p2");
      await waitFor(() =>
        expect(mockSetTukangPotong).toHaveBeenCalledWith({
          batchId: "b1",
          tukangPotongId: "p2",
          tukangPotongNama: "Rina",
        }),
      );
      expect(screen.getAllByText("Rina").length).toBeGreaterThan(0);
    });

    it("menampilkan toast error kalau gagal simpan", async () => {
      mockSetTukangPotong.mockRejectedValueOnce(new Error("network fail"));
      mockUseKaryawanPotong.mockReturnValue({
        karyawanList: [{ id: "p1", nama: "Dodi" }, { id: "p2", nama: "Rina" }],
      });
      const user = userEvent.setup();
      render(<PrintKartuModal card={card} onClose={onClose} />);
      await user.selectOptions(screen.getByRole("combobox"), "p2");
      await waitFor(() =>
        expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("network fail")),
      );
    });

    it("tidak auto-pilih kalau tidak ada karyawan tim Potong aktif", () => {
      mockUseKaryawanPotong.mockReturnValue({ karyawanList: [] });
      render(<PrintKartuModal card={card} onClose={onClose} />);
      expect(mockSetTukangPotong).not.toHaveBeenCalled();
      expect(screen.getByText(/Belum ada karyawan tim Potong aktif/)).toBeInTheDocument();
    });
  });

  describe("T.Potong sudah di-set di batch", () => {
    const cardWithPotong = {
      ...card,
      produksi_batch: { tukang_potong_id: "p1", tukang_potong_nama: "Dodi" },
    };

    it("tidak tampil picker, langsung pakai nama tersimpan", () => {
      render(<PrintKartuModal card={cardWithPotong} onClose={onClose} />);
      expect(screen.queryByText(/Tukang Potong belum di-set/)).not.toBeInTheDocument();
      expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
      expect(screen.getAllByText("Dodi").length).toBeGreaterThan(0);
    });

    it("tidak memanggil setTukangPotong lagi (sudah tersimpan)", () => {
      render(<PrintKartuModal card={cardWithPotong} onClose={onClose} />);
      expect(mockSetTukangPotong).not.toHaveBeenCalled();
    });
  });
});
