import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfigEditSheet from "./ConfigEditSheet";

const row = {
  key: "kancing_satuan",
  label: "Kancing (per biji)",
  nilai: 500,
  keterangan: "Harga kancing per biji",
  updated_at: "2026-06-03T10:00:00.000Z",
  updated_by: "Admin",
};

describe("ConfigEditSheet", () => {
  it("renders label as title and prefills current nilai", () => {
    render(<ConfigEditSheet row={row} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    expect(screen.getByText("Kancing (per biji)")).toBeInTheDocument();
    expect(screen.getByDisplayValue("500")).toBeInTheDocument();
  });

  it("renders disclaimer copy about defaults not affecting saved templates", () => {
    render(<ConfigEditSheet row={row} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    expect(screen.getByText(/Tidak mengubah Template yang/)).toBeInTheDocument();
  });

  it("Simpan is disabled until value changes", async () => {
    render(<ConfigEditSheet row={row} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    expect(screen.getByText("Simpan")).toBeDisabled();
  });

  it("Simpan becomes enabled after editing the value", async () => {
    const user = userEvent.setup();
    render(<ConfigEditSheet row={row} onClose={vi.fn()} onSave={vi.fn()} saving={false} />);
    const input = screen.getByDisplayValue("500");
    await user.clear(input);
    await user.type(input, "600");
    expect(screen.getByText("Simpan")).not.toBeDisabled();
  });

  it("calls onSave with row and new numeric value", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<ConfigEditSheet row={row} onClose={vi.fn()} onSave={onSave} saving={false} />);
    const input = screen.getByDisplayValue("500");
    await user.clear(input);
    await user.type(input, "600");
    await user.click(screen.getByText("Simpan"));
    expect(onSave).toHaveBeenCalledWith(row, 600);
  });

  it("calls onClose when Batal clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ConfigEditSheet row={row} onClose={onClose} onSave={vi.fn()} saving={false} />);
    await user.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("disables Simpan while saving=true even if dirty", () => {
    render(<ConfigEditSheet row={{ ...row, nilai: 500 }} onClose={vi.fn()} onSave={vi.fn()} saving={true} />);
    expect(screen.getByText("...")).toBeDisabled();
  });
});
