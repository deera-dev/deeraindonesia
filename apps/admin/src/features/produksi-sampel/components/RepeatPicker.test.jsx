import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@deera/shared/lib/cloudinary", () => ({ cldUrl: (u) => u ?? "" }));

import RepeatPicker from "./RepeatPicker";

const options = [
  { id: "a", nama: "Gamis Arkana", kode: "D-07-OSK", image: "f1" },
  { id: "b", nama: "Mukena Rania", kode: "D-82-SFN", image: "f2" },
];

describe("RepeatPicker", () => {
  it("menampilkan opsi dan memanggil onSelect", async () => {
    const onSelect = vi.fn();
    render(<RepeatPicker options={options} onSelect={onSelect} onClose={vi.fn()} />);
    await userEvent.click(screen.getByText("Mukena Rania"));
    expect(onSelect).toHaveBeenCalledWith(options[1]);
  });

  it("pencarian menyaring berdasarkan nama/nomor", async () => {
    render(<RepeatPicker options={options} onSelect={vi.fn()} onClose={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/Cari nama/), "d-07");
    expect(screen.getByText("Gamis Arkana")).toBeInTheDocument();
    expect(screen.queryByText("Mukena Rania")).not.toBeInTheDocument();
  });

  it("kosong -> pesan", () => {
    render(<RepeatPicker options={[]} onSelect={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(/Produk tidak ditemukan/)).toBeInTheDocument();
  });

  it("× memanggil onClose", async () => {
    const onClose = vi.fn();
    render(<RepeatPicker options={options} onSelect={vi.fn()} onClose={onClose} />);
    await userEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });
});
