import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/lib/mediaUpload", () => ({
  uploadMedia: vi.fn().mockResolvedValue({ url: "https://cld/uploaded.jpg" }),
  friendlyMediaErrorMessage: vi.fn((err) => err?.message ?? "Upload gagal."),
}));

// Reuse daftar bahan dari produksi-hpp (permintaan Denny 2026-08). Sejak
// permintaan Denny 2026-09 ("foto bahan harusnya bisa lebih dari 1, karena
// keseringan memang menggunakan lebih dari 1 bahan"), pemilihan bahan
// sekarang lewat BahanPickerModal (search) per BARIS, bukan dropdown
// tunggal — mock modal picker sederhana: render tombol per opsi + Batal.
const mockUseBahanOptions = vi.fn(() => []);
vi.mock("../../produksi-hpp", () => ({
  useBahanOptions: (...args) => mockUseBahanOptions(...args),
  BahanPickerModal: ({ options, onSelect, onClose }) => (
    <div data-testid="bahan-picker-modal">
      {options.map((o) => (
        <button key={`${o._type}-${o.id}`} onClick={() => onSelect(o)}>
          {o._label}
        </button>
      ))}
      <button onClick={onClose}>Batal Pilih</button>
    </div>
  ),
}));

import PlanningForm from "./PlanningForm";
import { uploadMedia } from "@deera/shared/lib/mediaUpload";

const bahanWolfis = {
  id: "b1",
  nama_bahan: "Wolfis",
  kode_bahan: "B-01",
  satuan: "yard",
  _type: "beli",
  _label: "[Beli] Wolfis (B-01)",
};
const bahanKatun = {
  id: "b2",
  nama_bahan: "Katun Rayon",
  kode_bahan: "B-02",
  satuan: "meter",
  _type: "pinjam",
  _label: "[Pinjam] Katun Rayon (B-02)",
};

beforeEach(() => {
  vi.clearAllMocks();
  uploadMedia.mockResolvedValue({ url: "https://cld/uploaded.jpg" });
  mockUseBahanOptions.mockReturnValue([]);
});

function fileList() {
  return [new File(["x"], "foto.jpg", { type: "image/jpeg" })];
}

// Pilih bahan utk baris ke-`rowIndex` (0-based) — hanya baris yang BELUM
// terisi yang menampilkan tombol trigger "Pilih bahan...".
async function pickBahanForRow(user, rowIndex, bahan) {
  const triggers = screen.getAllByText("Pilih bahan...");
  await user.click(triggers[rowIndex]);
  await user.click(screen.getByText(bahan._label));
}

async function fillNamaDanBahan(user, nama, bahan = bahanWolfis) {
  await user.type(screen.getByPlaceholderText(/Gamis OSK Motif Bunga/), nama);
  await pickBahanForRow(user, 0, bahan);
}

describe("PlanningForm", () => {
  it("submit dinonaktifkan tanpa nama", () => {
    render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Simpan Planning")).toBeDisabled();
  });

  it("submit tetap dinonaktifkan kalau nama diisi tapi belum ada bahan dipilih (bahan wajib)", async () => {
    const user = userEvent.setup();
    mockUseBahanOptions.mockReturnValue([bahanWolfis]);
    render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/Gamis OSK Motif Bunga/), "Rencana A");
    expect(screen.getByText("Simpan Planning")).toBeDisabled();
  });

  it("submit aktif setelah nama & minimal 1 bahan dipilih", async () => {
    const user = userEvent.setup();
    mockUseBahanOptions.mockReturnValue([bahanWolfis]);
    render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
    await fillNamaDanBahan(user, "Rencana A");
    expect(screen.getByText("Simpan Planning")).not.toBeDisabled();
  });

  it("calls onCancel saat Batal diklik", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<PlanningForm onSave={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("submit tanpa foto: onSave dipanggil dgn bahanFotoUrl(legacy)=null, modelUrls [], bahanItems 1 item foto=null", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    mockUseBahanOptions.mockReturnValue([bahanWolfis]);
    render(<PlanningForm onSave={onSave} onCancel={vi.fn()} />);
    await fillNamaDanBahan(user, "Rencana B");
    await user.click(screen.getByText("Simpan Planning"));
    expect(onSave).toHaveBeenCalledWith(
      { nama: "Rencana B", tanggal: expect.any(String) },
      null,
      [],
      [{ nama_bahan: "Wolfis", kode_bahan: "B-01", satuan: "yard", foto: null }],
    );
  });

  it("upload foto pada baris bahan lalu submit membawa foto di bahanItems[0].foto", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    mockUseBahanOptions.mockReturnValue([bahanWolfis]);
    render(<PlanningForm onSave={onSave} onCancel={vi.fn()} />);
    await fillNamaDanBahan(user, "Rencana C");

    const fotoInput = screen.getByText("Foto").closest("label").querySelector("input[type=file]");
    await user.upload(fotoInput, fileList());

    await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Simpan Planning")).not.toBeDisabled());
    await user.click(screen.getByText("Simpan Planning"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ nama: "Rencana C" }),
      null,
      [],
      [{ nama_bahan: "Wolfis", kode_bahan: "B-01", satuan: "yard", foto: "https://cld/uploaded.jpg" }],
    );
  });

  it("membatasi model foto maksimal 3 slot", async () => {
    const user = userEvent.setup();
    render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
    for (let i = 0; i < 3; i++) {
      const modelInput = screen.getByText("Model").closest("label").querySelector("input[type=file]");
      await user.upload(modelInput, fileList());
      await waitFor(() => expect(uploadMedia).toHaveBeenCalledTimes(i + 1));
    }
    // Setelah 3 foto, slot tambah ("+ Model") tidak lagi dirender
    expect(screen.queryByText("Model")).not.toBeInTheDocument();
  });

  describe("multi-bahan dgn foto masing-masing (permintaan Denny 2026-09)", () => {
    it("+ Tambah Bahan menambah baris baru dgn trigger 'Pilih bahan...' tambahan", async () => {
      const user = userEvent.setup();
      mockUseBahanOptions.mockReturnValue([bahanWolfis, bahanKatun]);
      render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.getAllByText("Pilih bahan...")).toHaveLength(1);
      await user.click(screen.getByText("+ Tambah Bahan"));
      expect(screen.getAllByText("Pilih bahan...")).toHaveLength(2);
    });

    it("2 baris bahan terisi -> onSave menerima bahanItems 2 item sesuai urutan baris", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      mockUseBahanOptions.mockReturnValue([bahanWolfis, bahanKatun]);
      render(<PlanningForm onSave={onSave} onCancel={vi.fn()} />);
      await user.type(screen.getByPlaceholderText(/Gamis OSK Motif Bunga/), "Rencana Multi");
      await pickBahanForRow(user, 0, bahanWolfis);
      await user.click(screen.getByText("+ Tambah Bahan"));
      await pickBahanForRow(user, 0, bahanKatun); // baris pertama sudah terisi, sisa 1 trigger

      await user.click(screen.getByText("Simpan Planning"));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ nama: "Rencana Multi" }),
        null,
        [],
        [
          { nama_bahan: "Wolfis", kode_bahan: "B-01", satuan: "yard", foto: null },
          { nama_bahan: "Katun Rayon", kode_bahan: "B-02", satuan: "meter", foto: null },
        ],
      );
    });

    it("tombol × menghapus baris bahan (kalau lebih dari 1 baris)", async () => {
      const user = userEvent.setup();
      mockUseBahanOptions.mockReturnValue([bahanWolfis, bahanKatun]);
      render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
      await user.click(screen.getByText("+ Tambah Bahan"));
      expect(screen.getAllByText("Pilih bahan...")).toHaveLength(2);
      const removeBtns = screen.getAllByText("×");
      await user.click(removeBtns[0]);
      expect(screen.getAllByText("Pilih bahan...")).toHaveLength(1);
    });

    it("tombol × TIDAK muncul kalau cuma 1 baris tersisa", () => {
      mockUseBahanOptions.mockReturnValue([bahanWolfis]);
      render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
      expect(screen.queryByText("×")).not.toBeInTheDocument();
    });

    it("mengganti pilihan bahan sebelum submit memakai pilihan terakhir", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      mockUseBahanOptions.mockReturnValue([bahanWolfis, bahanKatun]);
      render(<PlanningForm onSave={onSave} onCancel={vi.fn()} />);
      await fillNamaDanBahan(user, "Rencana E", bahanWolfis);
      // Klik ulang trigger (sekarang berlabel nama bahan terpilih) utk ganti
      await user.click(screen.getByText(bahanWolfis._label));
      await user.click(screen.getByText(bahanKatun._label));
      await user.click(screen.getByText("Simpan Planning"));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ nama: "Rencana E" }),
        null,
        [],
        [{ nama_bahan: "Katun Rayon", kode_bahan: "B-02", satuan: "meter", foto: null }],
      );
    });
  });

  describe("foto preview bisa diklik untuk lihat full size (permintaan Denny 2026-08)", () => {
    it("klik foto bahan yang sudah diupload membuka PhotoLightbox", async () => {
      const user = userEvent.setup();
      const { container } = render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
      const fotoInput = screen.getByText("Foto").closest("label").querySelector("input[type=file]");
      await user.upload(fotoInput, fileList());
      await waitFor(() => expect(uploadMedia).toHaveBeenCalled());

      expect(screen.queryByAltText("Foto")).not.toBeInTheDocument();
      const bahanImg = container.querySelector('img[alt=""]');
      await user.click(bahanImg);
      expect(screen.getByAltText("Foto")).toBeInTheDocument();
    });

    it("tombol Tutup menutup lightbox foto bahan", async () => {
      const user = userEvent.setup();
      const { container } = render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
      const fotoInput = screen.getByText("Foto").closest("label").querySelector("input[type=file]");
      await user.upload(fotoInput, fileList());
      await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
      const bahanImg = container.querySelector('img[alt=""]');
      await user.click(bahanImg);
      expect(screen.getByLabelText("Tutup")).toBeInTheDocument();
      await user.click(screen.getByLabelText("Tutup"));
      expect(screen.queryByLabelText("Tutup")).not.toBeInTheDocument();
    });

    it("klik foto model yang sudah diupload juga membuka PhotoLightbox", async () => {
      const user = userEvent.setup();
      const { container } = render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
      const modelInput = screen.getByText("Model").closest("label").querySelector("input[type=file]");
      await user.upload(modelInput, fileList());
      await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
      const modelImg = container.querySelector('img[alt=""]');
      await user.click(modelImg);
      expect(screen.getByLabelText("Tutup")).toBeInTheDocument();
    });
  });
});
