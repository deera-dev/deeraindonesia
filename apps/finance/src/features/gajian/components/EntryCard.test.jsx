import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
}));

import EntryCard from "./EntryCard";

describe("EntryCard", () => {
  it("renders nama", () => {
    render(<EntryCard nama="BUDI" amount={100000} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
  });

  it("renders sub when provided", () => {
    render(<EntryCard nama="A" sub="10 pcs" amount={0} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("10 pcs")).toBeInTheDocument();
  });

  it("does not render sub when not provided", () => {
    const { container } = render(
      <EntryCard nama="A" amount={0} onEdit={vi.fn()} onDelete={vi.fn()} />
    );
    expect(container.querySelectorAll("p").length).toBe(1);
  });

  it("renders amount via fmtRp", () => {
    render(<EntryCard nama="A" amount={500000} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Rp500000")).toBeInTheDocument();
  });

  it("calls onEdit when Edit clicked", () => {
    const onEdit = vi.fn();
    render(<EntryCard nama="A" amount={0} onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalled();
  });

  it("calls onDelete when Hapus clicked", () => {
    const onDelete = vi.fn();
    render(<EntryCard nama="A" amount={0} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByText("Hapus"));
    expect(onDelete).toHaveBeenCalled();
  });
});
