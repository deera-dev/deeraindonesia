import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  cldUrl: vi.fn((url) => url),
}));

vi.mock("@deera/shared/lib/mediaUpload", () => ({
  uploadMedia: vi.fn().mockResolvedValue({
    url: "https://cloudinary.com/test.jpg",
    originalSizeMB: 1,
    compressedSizeMB: 1,
    compressed: false,
  }),
  friendlyMediaErrorMessage: vi.fn((err) => err?.message ?? "Upload gagal."),
}));

import FotoUpload from "./FotoUpload";
import { uploadMedia } from "@deera/shared/lib/mediaUpload";

beforeEach(() => {
  vi.clearAllMocks();
  uploadMedia.mockResolvedValue({
    url: "https://cloudinary.com/test.jpg",
    originalSizeMB: 1,
    compressedSizeMB: 1,
    compressed: false,
  });
});

describe("FotoUpload", () => {
  it("shows upload button when no value", () => {
    render(<FotoUpload value="" onChange={() => {}} />);
    expect(screen.getByText("Pilih Foto")).toBeInTheDocument();
  });

  it("shows foto tersimpan and hapus button when value present", () => {
    render(<FotoUpload value="https://cloudinary.com/bahan.jpg" onChange={() => {}} />);
    expect(screen.getByText("Foto tersimpan")).toBeInTheDocument();
    expect(screen.getByText("Hapus foto")).toBeInTheDocument();
  });

  it("shows img with src when value present", () => {
    render(<FotoUpload value="https://cloudinary.com/bahan.jpg" onChange={() => {}} />);
    expect(screen.getByAltText("Foto bahan")).toBeInTheDocument();
  });

  it("calls onChange('') when Hapus foto is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FotoUpload value="https://cloudinary.com/bahan.jpg" onChange={onChange} />);
    await user.click(screen.getByText("Hapus foto"));
    expect(onChange).toHaveBeenCalledWith("");
  });

  it("calls uploadMedia (kind: image) and onChange(url) when file selected", async () => {
    const onChange = vi.fn();
    render(<FotoUpload value="" onChange={onChange} />);
    const input = document.querySelector("input[type=file]");
    const file = new File(["content"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(uploadMedia).toHaveBeenCalled());
    expect(uploadMedia.mock.calls[0][0]).toBe(file);
    expect(uploadMedia.mock.calls[0][1]).toMatchObject({ kind: "image" });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://cloudinary.com/test.jpg"));
  });

  it("does nothing when no file selected", () => {
    const onChange = vi.fn();
    render(<FotoUpload value="" onChange={onChange} />);
    const input = document.querySelector("input[type=file]");
    fireEvent.change(input, { target: { files: [] } });
    expect(uploadMedia).not.toHaveBeenCalled();
  });

  it("shows upload progress text while uploading", async () => {
    uploadMedia.mockImplementation(async (_file, opts) => {
      opts?.onStatus?.("uploading", {});
      opts?.onProgress?.(50);
      return new Promise(() => {}); // never resolves
    });
    const onChange = vi.fn();
    render(<FotoUpload value="" onChange={onChange} />);
    const input = document.querySelector("input[type=file]");
    const file = new File(["x"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(document.querySelector("button").textContent).toMatch(/Uploading/));
  });

  it("shows friendly error message when upload fails", async () => {
    uploadMedia.mockRejectedValue(new Error("Ukuran video melebihi batas maksimum"));
    const onChange = vi.fn();
    render(<FotoUpload value="" onChange={onChange} />);
    const input = document.querySelector("input[type=file]");
    const file = new File(["x"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() =>
      expect(screen.getByText("Ukuran video melebihi batas maksimum")).toBeInTheDocument(),
    );
    expect(onChange).not.toHaveBeenCalled();
  });
});
