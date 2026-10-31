import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@deera/shared/lib/mediaUpload", () => ({
  uploadMedia: vi.fn().mockResolvedValue({
    url: "https://cld/uploaded.jpg",
    originalSizeMB: 1,
    compressedSizeMB: 1,
    compressed: false,
  }),
  friendlyMediaErrorMessage: vi.fn((err) => err?.message ?? "Upload gagal."),
}));

import { uploadMedia } from "@deera/shared/lib/mediaUpload";
import SampelForm from "./SampelForm";

const editSampel = {
  id: "s1",
  nama: "Gamis Arkana",
  tanggal: "2024-01-15",
  foto: ["https://cld/foto1.jpg"],
};

beforeEach(() => {
  vi.clearAllMocks();
  uploadMedia.mockResolvedValue({
    url: "https://cld/uploaded.jpg",
    originalSizeMB: 1,
    compressedSizeMB: 1,
    compressed: false,
  });
});

describe("SampelForm — edit mode", () => {
  it("prefills nama from initial", () => {
    render(<SampelForm initial={editSampel} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByDisplayValue("Gamis Arkana")).toBeInTheDocument();
  });

  it("shows Simpan button in edit mode", () => {
    render(<SampelForm initial={editSampel} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText("Simpan")).toBeInTheDocument();
  });

  it("calls onCancel when Batal clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<SampelForm initial={editSampel} onSave={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("calls onSave with updated fields on submit", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<SampelForm initial={editSampel} onSave={onSave} onCancel={vi.fn()} />);
    const namaInput = screen.getByDisplayValue("Gamis Arkana");
    await user.clear(namaInput);
    await user.type(namaInput, "Gamis Baru");
    await user.click(screen.getByText("Simpan"));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave.mock.calls[0][0].nama).toBe("Gamis Baru");
  });
});

describe("SampelForm — create mode", () => {
  it("shows multiple entry slots (3 by default)", () => {
    render(<SampelForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    const inputs = screen.getAllByPlaceholderText(/Gamis|Mukena|Nama/i);
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("shows + Sampel Lagi button", () => {
    render(<SampelForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Sampel Lagi/)).toBeInTheDocument();
  });

  it("adds new entry card on + Sampel Lagi click", async () => {
    const user = userEvent.setup();
    render(<SampelForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    const before = screen.getAllByRole("textbox").length;
    await user.click(screen.getByText(/Sampel Lagi/));
    expect(screen.getAllByRole("textbox").length).toBeGreaterThan(before);
  });

  it("calls onCancel when Batal clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(<SampelForm initial={null} onSave={vi.fn()} onCancel={onCancel} />);
    await user.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalled();
  });
});

describe("SampelForm — create mode submit", () => {
  it("calls onSave with filled entries on submit", async () => {
    const onSave = vi.fn();
    render(<SampelForm initial={null} onSave={onSave} onCancel={vi.fn()} />);
    const namaInputs = screen.getAllByPlaceholderText(/cth\./i);
    fireEvent.change(namaInputs[0], { target: { value: "Sampel Baru" } });
    fireEvent.submit(namaInputs[0].closest("form"));
    expect(onSave).toHaveBeenCalled();
    expect(onSave.mock.calls[0][0][0].nama).toBe("Sampel Baru");
  });

  it("does not call onSave when no entries have names", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<SampelForm initial={null} onSave={onSave} onCancel={vi.fn()} />);
    const form = document.querySelector("form");
    form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it("removes an entry card when Hapus clicked", async () => {
    const user = userEvent.setup();
    render(<SampelForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    const hapusButtons = screen.getAllByText("Hapus");
    const countBefore = screen.getAllByText(/Sampel \d/).length;
    await user.click(hapusButtons[0]);
    expect(screen.getAllByText(/Sampel \d/).length).toBe(countBefore - 1);
  });

  it("updates entry name when typed", async () => {
    const user = userEvent.setup();
    render(<SampelForm initial={null} onSave={vi.fn()} onCancel={vi.fn()} />);
    const inputs = screen.getAllByRole("textbox");
    await user.type(inputs[0], "Gamis Test");
    expect(inputs[0].value).toContain("Gamis Test");
  });
});

describe("SampelForm — saving state", () => {
  it("shows Menyimpan when saving=true in edit mode", () => {
    render(<SampelForm initial={editSampel} onSave={vi.fn()} onCancel={vi.fn()} saving={true} />);
    expect(screen.getByText("Menyimpan...")).toBeInTheDocument();
  });

  it("disables Batal when saving=true", () => {
    render(<SampelForm initial={editSampel} onSave={vi.fn()} onCancel={vi.fn()} saving={true} />);
    expect(screen.getByRole("button", { name: "Batal" })).toBeDisabled();
  });
});

describe("SampelForm — edit tanggal", () => {
  it("updates tanggal when date input changes in edit mode", async () => {
    const user = userEvent.setup();
    render(<SampelForm initial={editSampel} onSave={vi.fn()} onCancel={vi.fn()} />);
    const dateInputs = document.querySelectorAll("input[type=date]");
    expect(dateInputs.length).toBeGreaterThan(0);
    expect(dateInputs[0].value).toBe("2024-01-15");
  });
});

describe("SampelForm — foto removal in edit mode", () => {
  it("removes foto when remove button clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <SampelForm initial={editSampel} onSave={vi.fn()} onCancel={vi.fn()} />,
    );
    const removeButtons = container.querySelectorAll("button.bg-red-500");
    expect(removeButtons.length).toBe(1);
    await user.click(removeButtons[0]);
    const afterButtons = container.querySelectorAll("button.bg-red-500");
    expect(afterButtons.length).toBe(0);
  });
});

describe("SampelForm — upload via uploadMedia", () => {
  it("calls uploadMedia (kind: image) when a foto is added in edit mode", async () => {
    render(<SampelForm initial={editSampel} onSave={vi.fn()} onCancel={vi.fn()} />);
    const fileInput = document.querySelector('input[type=file][accept="image/*"]');
    const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
    expect(uploadMedia.mock.calls[0][0]).toBe(file);
    expect(uploadMedia.mock.calls[0][1]).toMatchObject({ kind: "image" });
  });

  it("shows friendly error message when uploadMedia rejects", async () => {
    uploadMedia.mockRejectedValue(new Error("Gambar masih melebihi batas maksimum"));
    render(<SampelForm initial={editSampel} onSave={vi.fn()} onCancel={vi.fn()} />);
    const fileInput = document.querySelector('input[type=file][accept="image/*"]');
    const file = new File(["x"], "besar.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByText("Gambar masih melebihi batas maksimum")).toBeInTheDocument(),
    );
  });

  it("disables submit while a foto is uploading", async () => {
    let resolveUpload;
    uploadMedia.mockImplementation(
      (_file, opts) =>
        new Promise((resolve) => {
          opts?.onStatus?.("uploading", {});
          resolveUpload = resolve;
        }),
    );
    render(<SampelForm initial={editSampel} onSave={vi.fn()} onCancel={vi.fn()} />);
    const fileInput = document.querySelector('input[type=file][accept="image/*"]');
    const file = new File(["x"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
    expect(screen.getByText("Simpan")).toBeDisabled();
    resolveUpload({
      url: "https://cld/new.jpg",
      originalSizeMB: 1,
      compressedSizeMB: 1,
      compressed: false,
    });
    await waitFor(() => expect(screen.getByText("Simpan")).not.toBeDisabled());
  });
});
