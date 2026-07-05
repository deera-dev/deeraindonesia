import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/lib/cloudinary", () => ({
  uploadImage: vi.fn().mockResolvedValue({ url: "https://cloudinary.com/test.jpg" }),
  cldUrl: vi.fn((url) => url),
}));

import FotoUpload from "./FotoUpload";
import { uploadImage } from "@deera/shared/lib/cloudinary";

beforeEach(() => {
  vi.clearAllMocks();
  uploadImage.mockResolvedValue({ url: "https://cloudinary.com/test.jpg" });
});

describe("FotoUpload", () => {
  it("shows upload button when no value", () => {
    render(<FotoUpload value="" onChange={() => {}} />);
    expect(screen.getByText("Tambah Foto")).toBeInTheDocument();
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

  it("calls uploadImage and onChange(url) when file selected", async () => {
    const onChange = vi.fn();
    render(<FotoUpload value="" onChange={onChange} />);
    const input = document.querySelector("input[type=file]");
    const file = new File(["content"], "foto.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(uploadImage).toHaveBeenCalled());
    await waitFor(() => expect(onChange).toHaveBeenCalledWith("https://cloudinary.com/test.jpg"));
  });

  it("does nothing when no file selected", () => {
    const onChange = vi.fn();
    render(<FotoUpload value="" onChange={onChange} />);
    const input = document.querySelector("input[type=file]");
    fireEvent.change(input, { target: { files: [] } });
    expect(uploadImage).not.toHaveBeenCalled();
  });

  it("shows upload progress text while uploading", async () => {
    uploadImage.mockImplementation(async ({ onProgress }) => {
      onProgress && onProgress(50);
      return new Promise(() => {}); // never resolves
    });
    const onChange = vi.fn();
    render(<FotoUpload value="" onChange={onChange} />);
    const input = document.querySelector("input[type=file]");
    const file = new File(["x"], "test.jpg", { type: "image/jpeg" });
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/Upload\.\.\./)).toBeInTheDocument());
  });
});
