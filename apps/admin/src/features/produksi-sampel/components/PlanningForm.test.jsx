import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/lib/mediaUpload", () => ({
  uploadMedia: vi.fn().mockResolvedValue({ url: "https://cld/uploaded.jpg" }),
  friendlyMediaErrorMessage: vi.fn((err) => err?.message ?? "Upload gagal."),
}));

import PlanningForm from "./PlanningForm";
import { uploadMedia } from "@deera/shared/lib/mediaUpload";

beforeEach(() => {
  vi.clearAllMocks();
  uploadMedia.mockResolvedValue({ url: "https://cld/uploaded.jpg" });
});

function fileList() {
  return [new File(["x"], "foto.jpg", { type: "image/jpeg" })];
}

describe("PlanningForm", () => {
  it("submit dinonaktifkan tanpa nama", () => {
    render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Simpan Planning")).toBeDisabled();
  });

  it("submit aktif setelah nama diisi", async () => {
    const user = userEvent.setup();
    render(<PlanningForm onSave={vi.fn()} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/Gamis OSK Motif Bunga/), "Rencana A");
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
    render(<PlanningForm onSave={onSave} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/Gamis OSK Motif Bunga/), "Rencana B");
    await user.click(screen.getByText("Simpan Planning"));
    expect(onSave).toHaveBeenCalledWith(
      { nama: "Rencana B", tanggal: expect.any(String) },
      null,
      [],
    );
  });

  it("upload foto bahan lalu submit membawa bahanFotoUrl hasil upload", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<PlanningForm onSave={onSave} onCancel={vi.fn()} />);
    await user.type(screen.getByPlaceholderText(/Gamis OSK Motif Bunga/), "Rencana C");

    const bahanInput = screen.getByText("Bahan").closest("label").querySelector("input[type=file]");
    await user.upload(bahanInput, fileList());

    await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText("Simpan Planning")).not.toBeDisabled());
    await user.click(screen.getByText("Simpan Planning"));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ nama: "Rencana C" }),
      "https://cld/uploaded.jpg",
      [],
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
});
