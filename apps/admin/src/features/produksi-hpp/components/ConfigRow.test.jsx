import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ConfigRow from "./ConfigRow";

const row = {
  key: "kancing_satuan",
  label: "Kancing (per biji)",
  nilai: 500,
  keterangan: "Harga kancing per biji",
  updated_at: "2026-06-03T10:00:00.000Z",
  updated_by: "Admin",
};

describe("ConfigRow", () => {
  it("renders label, keterangan, and formatted nilai", () => {
    render(<ConfigRow row={row} onOpenEdit={vi.fn()} />);
    expect(screen.getByText("Kancing (per biji)")).toBeInTheDocument();
    expect(screen.getByText("Harga kancing per biji")).toBeInTheDocument();
    expect(screen.getByText(/500/)).toBeInTheDocument();
  });

  it("renders updated_at + updated_by meta when present", () => {
    render(<ConfigRow row={row} onOpenEdit={vi.fn()} />);
    expect(screen.getByText(/Admin/)).toBeInTheDocument();
  });

  it("does not render meta line when updated_at missing", () => {
    render(<ConfigRow row={{ ...row, updated_at: null }} onOpenEdit={vi.fn()} />);
    expect(screen.queryByText(/Admin/)).not.toBeInTheDocument();
  });

  it("calls onOpenEdit with row when clicked (read-only row, tap-to-edit)", async () => {
    const user = userEvent.setup();
    const onOpenEdit = vi.fn();
    render(<ConfigRow row={row} onOpenEdit={onOpenEdit} />);
    await user.click(screen.getByText("Kancing (per biji)"));
    expect(onOpenEdit).toHaveBeenCalledWith(row);
  });

  it("does not render an editable <input> on the row itself", () => {
    const { container } = render(<ConfigRow row={row} onOpenEdit={vi.fn()} />);
    expect(container.querySelector("input")).toBeNull();
  });
});
