import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Stepper } from "./Stepper";

describe("Stepper", () => {
  it("tombol tambah memanggil onChange(value+1)", () => {
    const onChange = vi.fn();
    render(<Stepper value={2} onChange={onChange} />);
    screen.getByRole("button", { name: "Tambah" }).click();
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("tombol kurangi memanggil onChange(value-1)", () => {
    const onChange = vi.fn();
    render(<Stepper value={2} onChange={onChange} />);
    screen.getByRole("button", { name: "Kurangi" }).click();
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("di batas min -> tombol kurangi disabled, onChange tidak dipanggil", () => {
    const onChange = vi.fn();
    render(<Stepper value={0} onChange={onChange} min={0} />);
    const kurang = screen.getByRole("button", { name: "Kurangi" });
    expect(kurang).toBeDisabled();
    kurang.click();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("label dipakai sbg aria-label grup, default 'Jumlah'", () => {
    const { rerender } = render(<Stepper value={1} onChange={() => {}} label="Jumlah D-07-OSK" />);
    expect(screen.getByRole("group", { name: "Jumlah D-07-OSK" })).toBeInTheDocument();

    rerender(<Stepper value={1} onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Jumlah" })).toBeInTheDocument();
  });
});
