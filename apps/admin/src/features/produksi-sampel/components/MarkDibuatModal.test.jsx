import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/lib/mediaUpload", () => ({
  uploadMedia: vi.fn().mockResolvedValue({ url: "https://cld/jadi.jpg" }),
  friendlyMediaErrorMessage: vi.fn((err) => err?.message ?? "Upload gagal."),
}));

import MarkDibuatModal from "./MarkDibuatModal";
import { uploadMedia } from "@deera/shared/lib/mediaUpload";

const sampel = { id: "s1", nama: "Gamis Planning A" };

beforeEach(() => {
  vi.clearAllMocks();
  uploadMedia.mockResolvedValue({ url: "https://cld/jadi.jpg" });
});

function fileList() {
  return [new File(["x"], "foto.jpg", { type: "image/jpeg" })];
}

describe("MarkDibuatModal", () => {
  it("render judul & nama sampel", () => {
    render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Tandai Sudah Dibuat", { selector: "h2" })).toBeInTheDocument();
    expect(screen.getByText("Gamis Planning A")).toBeInTheDocument();
  });

  it("tombol submit dinonaktifkan tanpa foto", () => {
    render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText("Tandai Sudah Dibuat", { selector: "button" })).toBeDisabled();
  });

  it("calls onClose saat Batal diklik", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={onClose} />);
    await user.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose saat backdrop diklik", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={onClose} />);
    await user.click(container.querySelector(".fixed.inset-0 .absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("upload foto lalu submit memanggil onSave dengan URL yang sudah selesai", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<MarkDibuatModal sampel={sampel} onSave={onSave} onClose={vi.fn()} />);
    const input = screen.getByText("Foto").closest("label").querySelector("input[type=file]");
    await user.upload(input, fileList());
    await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Tandai Sudah Dibuat", { selector: "button" })).not.toBeDisabled());
    await user.click(screen.getByText("Tandai Sudah Dibuat", { selector: "button" }));
    expect(onSave).toHaveBeenCalledWith(["https://cld/jadi.jpg"]);
  });

  it("hapus foto via tombol × menghilangkan foto dari grid", async () => {
    const user = userEvent.setup();
    const { container } = render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByText("Foto").closest("label").querySelector("input[type=file]");
    await user.upload(input, fileList());
    await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
    expect(container.querySelectorAll('img[alt=""]')).toHaveLength(1);
    // ada 2 tombol "×" di modal ini (tutup modal & hapus foto) — tombol hapus
    // foto ada di dalam grid, cari via querySelector supaya tidak ambigu.
    const removeBtn = container.querySelector(".grid button");
    await user.click(removeBtn);
    expect(container.querySelectorAll('img[alt=""]')).toHaveLength(0);
  });

  describe("foto bisa diklik untuk lihat full size (permintaan Denny 2026-08)", () => {
    it("klik foto yang sudah diupload membuka PhotoLightbox", async () => {
      const user = userEvent.setup();
      const { container } = render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={vi.fn()} />);
      const input = screen.getByText("Foto").closest("label").querySelector("input[type=file]");
      await user.upload(input, fileList());
      await waitFor(() => expect(uploadMedia).toHaveBeenCalled());

      expect(screen.queryByAltText("Foto")).not.toBeInTheDocument();
      const fotoImg = container.querySelector('img[alt=""]');
      await user.click(fotoImg);
      expect(screen.getByAltText("Foto")).toBeInTheDocument();
    });

    it("tombol Tutup menutup lightbox tanpa menutup modal utama", async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      const { container } = render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={onClose} />);
      const input = screen.getByText("Foto").closest("label").querySelector("input[type=file]");
      await user.upload(input, fileList());
      await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
      const fotoImg = container.querySelector('img[alt=""]');
      await user.click(fotoImg);
      expect(screen.getByLabelText("Tutup")).toBeInTheDocument();
      await user.click(screen.getByLabelText("Tutup"));
      expect(screen.queryByLabelText("Tutup")).not.toBeInTheDocument();
      // modal utama (Tandai Sudah Dibuat) tetap terbuka, onClose modal belum terpanggil
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByText("Tandai Sudah Dibuat", { selector: "h2" })).toBeInTheDocument();
    });

    it("bisa navigasi antar foto di lightbox kalau upload lebih dari satu", async () => {
      const user = userEvent.setup();
      const { container } = render(<MarkDibuatModal sampel={sampel} onSave={vi.fn()} onClose={vi.fn()} />);
      const input = screen.getByText("Foto").closest("label").querySelector("input[type=file]");
      await user.upload(input, [
        new File(["x"], "foto1.jpg", { type: "image/jpeg" }),
        new File(["y"], "foto2.jpg", { type: "image/jpeg" }),
      ]);
      await waitFor(() => expect(uploadMedia).toHaveBeenCalledTimes(2));

      const fotoImgs = container.querySelectorAll('img[alt=""]');
      expect(fotoImgs).toHaveLength(2);
      await user.click(fotoImgs[0]);
      expect(screen.getByText("1 / 2")).toBeInTheDocument();
      await user.click(screen.getByLabelText("Berikutnya"));
      expect(screen.getByText("2 / 2")).toBeInTheDocument();
    });
  });
});
