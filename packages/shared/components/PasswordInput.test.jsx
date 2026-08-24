import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PasswordInput from "./PasswordInput";

describe("PasswordInput", () => {
  it("default type='password' (tersembunyi)", () => {
    render(<PasswordInput value="rahasia123" onChange={() => {}} />);
    const input = screen.getByDisplayValue("rahasia123");
    expect(input).toHaveAttribute("type", "password");
  });

  it("klik tombol mata mengubah type jadi 'text' (terlihat)", () => {
    render(<PasswordInput value="rahasia123" onChange={() => {}} />);
    const toggle = screen.getByRole("button", { name: "Tampilkan password" });
    fireEvent.click(toggle);

    const input = screen.getByDisplayValue("rahasia123");
    expect(input).toHaveAttribute("type", "text");
  });

  it("klik tombol mata kedua kali mengembalikan type ke 'password'", () => {
    render(<PasswordInput value="rahasia123" onChange={() => {}} />);
    const toggle = screen.getByRole("button", { name: "Tampilkan password" });
    fireEvent.click(toggle);
    fireEvent.click(screen.getByRole("button", { name: "Sembunyikan password" }));

    expect(screen.getByDisplayValue("rahasia123")).toHaveAttribute("type", "password");
  });

  it("meneruskan props lain (value, onChange, required, autoComplete) ke <input>", () => {
    const onChange = vi.fn();
    render(
      <PasswordInput
        value="abc"
        onChange={onChange}
        required
        autoComplete="current-password"
      />,
    );
    const input = screen.getByDisplayValue("abc");
    expect(input).toHaveAttribute("required");
    expect(input).toHaveAttribute("autocomplete", "current-password");

    fireEvent.change(input, { target: { value: "abcd" } });
    expect(onChange).toHaveBeenCalled();
  });

  it("menambahkan className kustom + pr-12 (ruang utk tombol mata) tanpa menghapus className asli", () => {
    render(<PasswordInput value="x" onChange={() => {}} className="border-2 text-lg" />);
    const input = screen.getByDisplayValue("x");
    expect(input.className).toContain("border-2");
    expect(input.className).toContain("text-lg");
    expect(input.className).toContain("pr-12");
  });

  it("input & wrapper selalu w-full (lebar sama dgn field lain di sebelahnya, bug fix 2026-08)", () => {
    const { container } = render(<PasswordInput value="x" onChange={() => {}} />);
    const input = screen.getByDisplayValue("x");
    expect(input.className).toContain("w-full");
    expect(container.querySelector(".relative")).toHaveClass("w-full");
  });

  it("tombol mata punya tabIndex -1 (tidak mengganggu urutan Tab form)", () => {
    render(<PasswordInput value="x" onChange={() => {}} />);
    const toggle = screen.getByRole("button", { name: "Tampilkan password" });
    expect(toggle).toHaveAttribute("tabindex", "-1");
  });

  it("tombol mata type='button' (tidak submit form saat diklik)", () => {
    render(<PasswordInput value="x" onChange={() => {}} />);
    const toggle = screen.getByRole("button", { name: "Tampilkan password" });
    expect(toggle).toHaveAttribute("type", "button");
  });
});
