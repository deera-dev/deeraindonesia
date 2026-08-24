import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/lib/mediaUpload", () => ({
  uploadMedia: vi.fn().mockResolvedValue({ url: "https://cld/uploaded.jpg" }),
  friendlyMediaErrorMessage: vi.fn((err) => err?.message ?? "Upload gagal."),
}));

// Reuse daftar bahan dari produksi-hpp (permintaan Denny 2026-08) — tampil
// sebagai dropdown tunggal & WAJIB diisi (permintaan lanjutan: "pilih bahan
// wajib, bikin dropdown aja"), bukan modal picker multi-select lagi.
const mockUseBahanOptions = vi.fn(() => []);
vi.mock("../../produksi-hpp", () => ({
  useBahanOptions: (...args) => mockUseBahanOptions(...args),
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

async function fillNamaDanBahan(user, nama, bahan = bahanWolfis) {
  await user.type(screen.getByPlaceholderText(/Gamis OSK Motif Bunga/), nama);
  await user.selectOptions(screen.getByRole("combobox"), `${bahan._type}-${bahan.id}`);
}

describe("PlanningForm", () => {
  it("submit dinonaktifkan tanpa nama", () => {
    render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Simpan Planning")).toBeDisabled();
  });

  it("submit tetap dinonaktifkan kalau nama diisi tapi bahan belum dipilih (bahan wajib)", async () => {
    const user = userEvent.setup();
    mockUseBahanOptions.mockReturnValue([bahanWolfis]);
    render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/Gamis OSK Motif Bunga/), "Rencana A");
    expect(screen.getByText("Simpan Planning")).toBeDisabled();
  });

  it("submit aktif setelah nama & bahan diisi", async () => {
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

  it("submit tanpa foto: onSave dipanggil dengan bahanUrl null & modelUrls []", async () => {
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
      [{ nama_bahan: "Wolfis", kode_bahan: "B-01", satuan: "yard" }],
    );
  });

  it("upload foto bahan lalu submit membawa bahanFotoUrl hasil upload", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    mockUseBahanOptions.mockReturnValue([bahanWolfis]);
    render(<PlanningForm onSave={onSave} onCancel={vi.fn()} />);
    await fillNamaDanBahan(user, "Rencana C");

    const bahanInput = screen.getByText("Bahan").closest("label").querySelector("input[type=file]");
    await user.upload(bahanInput, fileList());

    await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Simpan Planning")).not.toBeDisabled());
    await user.click(screen.getByText("Simpan Planning"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ nama: "Rencana C" }),
      "https://cld/uploaded.jpg",
      [],
      [{ nama_bahan: "Wolfis", kode_bahan: "B-01", satuan: "yard" }],
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

  describe("pilih bahan — dropdown wajib (permintaan Denny 2026-08)", () => {
    it("dropdown menampilkan opsi placeholder + semua bahan dari useBahanOptions", () => {
      mockUseBahanOptions.mockReturnValue([bahanWolfis, bahanKatun]);
      render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
      const select = screen.getByRole("combobox");
      expect(select).toHaveDisplayValue("Pilih bahan...");
      expect(screen.getByText("[Beli] Wolfis (B-01)")).toBeInTheDocument();
      expect(screen.getByText("[Pinjam] Katun Rayon (B-02)")).toBeInTheDocument();
    });

    it("dropdown kosong kalau belum ada bahan (hanya placeholder)", () => {
      mockUseBahanOptions.mockReturnValue([]);
      render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
      const select = screen.getByRole("combobox");
      expect(select.querySelectorAll("option")).toHaveLength(1);
    });

    it("memilih bahan dari dropdown mengubah value select", async () => {
      const user = userEvent.setup();
      mockUseBahanOptions.mockReturnValue([bahanWolfis]);
      render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
      const select = screen.getByRole("combobox");
      await user.selectOptions(select, "beli-b1");
      expect(select).toHaveDisplayValue("[Beli] Wolfis (B-01)");
    });

    it("bahan yang dipilih diteruskan sebagai argumen ke-4 onSave (array 1 item)", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      mockUseBahanOptions.mockReturnValue([bahanWolfis, bahanKatun]);
      render(<PlanningForm onSave={onSave} onCancel={vi.fn()} />);
      await fillNamaDanBahan(user, "Rencana D", bahanKatun);
      await user.click(screen.getByText("Simpan Planning"));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ nama: "Rencana D" }),
        null,
        [],
        [{ nama_bahan: "Katun Rayon", kode_bahan: "B-02", satuan: "meter" }],
      );
    });

    it("ganti pilihan bahan sebelum submit memakai pilihan terakhir", async () => {
      const user = userEvent.setup();
      const onSave = vi.fn();
      mockUseBahanOptions.mockReturnValue([bahanWolfis, bahanKatun]);
      render(<PlanningForm onSave={onSave} onCancel={vi.fn()} />);
      await fillNamaDanBahan(user, "Rencana E", bahanWolfis);
      await user.selectOptions(screen.getByRole("combobox"), "pinjam-b2");
      await user.click(screen.getByText("Simpan Planning"));
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ nama: "Rencana E" }),
        null,
        [],
        [{ nama_bahan: "Katun Rayon", kode_bahan: "B-02", satuan: "meter" }],
      );
    });

    it("kembali ke placeholder (kosongkan pilihan) menonaktifkan submit lagi", async () => {
      const user = userEvent.setup();
      mockUseBahanOptions.mockReturnValue([bahanWolfis]);
      render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
      await fillNamaDanBahan(user, "Rencana F");
      expect(screen.getByText("Simpan Planning")).not.toBeDisabled();
      await user.selectOptions(screen.getByRole("combobox"), "");
      expect(screen.getByText("Simpan Planning")).toBeDisabled();
    });
  });
});
