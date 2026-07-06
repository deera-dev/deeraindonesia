import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BahanPickerModal from "./BahanPickerModal";

const options = [
  { id: "1", nama_bahan: "Wolfis",  _type: "beli",   _label: "[Beli] Wolfis",  kode_bahan: "WLF", harga_satuan: 10000, satuan: "yard" },
  { id: "2", nama_bahan: "Sifon",   _type: "pinjam",  _label: "[Pinjam] Sifon", kode_bahan: null,  harga_satuan: 5000,  satuan: "meter" },
];

describe("BahanPickerModal", () => {
  it("renders modal title", () => {
    render(<BahanPickerModal options={options} onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Pilih Bahan")).toBeInTheDocument();
  });

  it("renders all options (by nama_bahan)", () => {
    render(<BahanPickerModal options={options} onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
    expect(screen.getByText("Sifon")).toBeInTheDocument();
  });

  it("shows Beli/Pinjam type label", () => {
    render(<BahanPickerModal options={options} onSelect={() => {}} onClose={() => {}} />);
    expect(screen.getByText(/Beli/)).toBeInTheDocument();
    expect(screen.getByText(/Pinjam/)).toBeInTheDocument();
  });

  it("filters options by search query (nama_bahan via _label)", async () => {
    const user = userEvent.setup();
    render(<BahanPickerModal options={options} onSelect={() => {}} onClose={() => {}} />);
    await user.type(screen.getByPlaceholderText("Cari nama atau kode..."), "Wolfis");
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
    expect(screen.queryByText("Sifon")).not.toBeInTheDocument();
  });

  it("filters by kode_bahan", async () => {
    const user = userEvent.setup();
    render(<BahanPickerModal options={options} onSelect={() => {}} onClose={() => {}} />);
    await user.type(screen.getByPlaceholderText("Cari nama atau kode..."), "WLF");
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
    expect(screen.queryByText("Sifon")).not.toBeInTheDocument();
  });

  it("shows empty state when no matches", async () => {
    const user = userEvent.setup();
    render(<BahanPickerModal options={options} onSelect={() => {}} onClose={() => {}} />);
    await user.type(screen.getByPlaceholderText("Cari nama atau kode..."), "ZZZNOMATCH");
    expect(screen.getByText("Tidak ditemukan.")).toBeInTheDocument();
  });

  it("calls onSelect when option clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<BahanPickerModal options={options} onSelect={onSelect} onClose={() => {}} />);
    await user.click(screen.getByText("Wolfis"));
    expect(onSelect).toHaveBeenCalledWith(options[0]);
  });

  it("calls onClose on backdrop click", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<BahanPickerModal options={options} onSelect={() => {}} onClose={onClose} />);
    await user.click(container.querySelector(".absolute.insert-0"));
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});
