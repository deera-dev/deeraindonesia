import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import DeleteConfirm from "./DeleteConfirm";

const sale = { id: "s1", total: 100000 };

describe("DeleteConfirm", () => {
  it("returns null when sale=null", () => {
    const { container } = render(
      <DeleteConfirm sale={null} onClose={vi.fn()} onConfirm={vi.fn()} deleting={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders confirmation text", () => {
    render(<DeleteConfirm sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} deleting={false} />);
    expect(screen.getByText("Hapus Transaksi?")).toBeInTheDocument();
  });

  it("calls onConfirm when Ya Hapus clicked", () => {
    const onConfirm = vi.fn();
    render(<DeleteConfirm sale={sale} onClose={vi.fn()} onConfirm={onConfirm} deleting={false} />);
    fireEvent.click(screen.getByText("Ya, Hapus"));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("calls onClose when Batal clicked", () => {
    const onClose = vi.fn();
    render(<DeleteConfirm sale={sale} onClose={onClose} onConfirm={vi.fn()} deleting={false} />);
    fireEvent.click(screen.getByText("Batal"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows Menghapus when deleting=true", () => {
    render(<DeleteConfirm sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} deleting={true} />);
    expect(screen.getByText("Menghapus...")).toBeInTheDocument();
  });

  it("disables buttons when deleting=true", () => {
    render(<DeleteConfirm sale={sale} onClose={vi.fn()} onConfirm={vi.fn()} deleting={true} />);
    expect(screen.getByText("Menghapus...")).toBeDisabled();
    expect(screen.getByText("Batal")).toBeDisabled();
  });
});
