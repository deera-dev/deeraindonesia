import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import OverflowMenu from "./OverflowMenu";

function makeItems(onEdit, onDelete) {
  return [
    { key: "edit", label: "Edit", onClick: onEdit },
    { key: "hapus", label: "Hapus", onClick: onDelete, destructive: true },
  ];
}

describe("OverflowMenu", () => {
  it("does not show menu items before trigger is clicked", () => {
    render(<OverflowMenu items={makeItems(vi.fn(), vi.fn())} />);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("shows menu items after trigger clicked", async () => {
    const user = userEvent.setup();
    render(<OverflowMenu items={makeItems(vi.fn(), vi.fn())} />);
    await user.click(screen.getByLabelText("Menu lainnya"));
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Hapus")).toBeInTheDocument();
  });

  it("calls item.onClick and closes menu when an item is clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<OverflowMenu items={makeItems(onEdit, vi.fn())} />);
    await user.click(screen.getByLabelText("Menu lainnya"));
    await user.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalled();
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("closes menu when backdrop clicked", async () => {
    const user = userEvent.setup();
    const { container } = render(<OverflowMenu items={makeItems(vi.fn(), vi.fn())} />);
    await user.click(screen.getByLabelText("Menu lainnya"));
    expect(screen.getByText("Edit")).toBeInTheDocument();
    await user.click(container.querySelector(".fixed.inset-0"));
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  it("applies destructive styling class to destructive item", async () => {
    const user = userEvent.setup();
    render(<OverflowMenu items={makeItems(vi.fn(), vi.fn())} />);
    await user.click(screen.getByLabelText("Menu lainnya"));
    expect(screen.getByText("Hapus")).toHaveClass("text-red-400");
  });

  it("does not bubble click to parent when trigger clicked", async () => {
    const user = userEvent.setup();
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <OverflowMenu items={makeItems(vi.fn(), vi.fn())} />
      </div>,
    );
    await user.click(screen.getByLabelText("Menu lainnya"));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
