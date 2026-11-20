import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Input } from "./Input";

describe("Input", () => {
  it("label terhubung ke input lewat htmlFor/id", () => {
    render(<Input label="Nama Produk" />);
    const input = screen.getByLabelText("Nama Produk");
    expect(input).toHaveAttribute("type", "text");
  });

  it("error: aria-invalid, pesan error tampil & dipakai bukan hint", () => {
    render(<Input label="HP" error="Wajib diisi" hint="Contoh: 0812..." />);
    const input = screen.getByLabelText("HP");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Wajib diisi")).toBeInTheDocument();
    expect(screen.queryByText("Contoh: 0812...")).not.toBeInTheDocument();
  });

  it("tanpa error: hint tampil, aria-invalid tidak ada", () => {
    render(<Input label="Alamat" hint="Opsional" />);
    expect(screen.getByLabelText("Alamat")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByText("Opsional")).toBeInTheDocument();
  });
});
