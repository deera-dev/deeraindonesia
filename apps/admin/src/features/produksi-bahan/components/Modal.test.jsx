import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Modal from "./Modal";

describe("Modal", () => {
  it("renders title and children", () => {
    render(<Modal title="Tambah Bahan" onClose={() => {}}><span>Form content</span></Modal>);
    expect(screen.getByText("Tambah Bahan")).toBeInTheDocument();
    expect(screen.getByText("Form content")).toBeInTheDocument();
  });
  it("calls onClose when × is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<Modal title="Test" onClose={onClose}><div /></Modal>);
    await user.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
  it("calls onClose when backdrop is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<Modal title="Test" onClose={onClose}><div /></Modal>);
    const backdrop = container.querySelector(".absolute.inset-0");
    await user.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
