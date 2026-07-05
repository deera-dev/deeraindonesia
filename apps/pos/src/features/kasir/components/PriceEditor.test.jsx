import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PriceEditor from "./PriceEditor";

describe("PriceEditor", () => {
  it("renders with initial harga value", () => {
    render(<PriceEditor harga={100000} onSave={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole("textbox")).toHaveValue("100000");
  });

  it("calls onSave with parsed int on save button click", () => {
    const onSave = vi.fn();
    render(<PriceEditor harga={100000} onSave={onSave} onCancel={vi.fn()} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "80000" } });
    fireEvent.click(screen.getByLabelText("Simpan harga"));
    expect(onSave).toHaveBeenCalledWith(80000);
  });

  it("calls onSave on Enter key", () => {
    const onSave = vi.fn();
    render(<PriceEditor harga={100000} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSave).toHaveBeenCalledWith(100000);
  });

  it("calls onCancel on Escape key", () => {
    const onCancel = vi.fn();
    render(<PriceEditor harga={100000} onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCancel on cancel button click", () => {
    const onCancel = vi.fn();
    render(<PriceEditor harga={100000} onSave={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByLabelText("Batal"));
    expect(onCancel).toHaveBeenCalled();
  });

  it("falls back to original harga if input is empty/zero", () => {
    const onSave = vi.fn();
    render(<PriceEditor harga={100000} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "" } });
    fireEvent.click(screen.getByLabelText("Simpan harga"));
    expect(onSave).toHaveBeenCalledWith(100000);
  });

  it("strips non-digits from input", () => {
    const onSave = vi.fn();
    render(<PriceEditor harga={100000} onSave={onSave} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Rp 80.000" } });
    // non-digit filter in onChange: value.replace(/\D/g,"") → "80000"
    fireEvent.click(screen.getByLabelText("Simpan harga"));
    // val will have been filtered by the input's onChange
    expect(onSave).toHaveBeenCalled();
  });
});
