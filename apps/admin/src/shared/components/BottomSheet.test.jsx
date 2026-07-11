import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BottomSheet from "./BottomSheet";

describe("BottomSheet", () => {
  it("renders title and children", () => {
    render(
      <BottomSheet title="Detail HPP" onClose={vi.fn()}>
        <p>Isi konten</p>
      </BottomSheet>,
    );
    expect(screen.getByText("Detail HPP")).toBeInTheDocument();
    expect(screen.getByText("Isi konten")).toBeInTheDocument();
  });

  it("renders footer when provided", () => {
    render(
      <BottomSheet title="Detail" onClose={vi.fn()} footer={<button>Aksi Utama</button>}>
        <p>Isi</p>
      </BottomSheet>,
    );
    expect(screen.getByText("Aksi Utama")).toBeInTheDocument();
  });

  it("does not render footer wrapper when footer not provided", () => {
    const { container } = render(
      <BottomSheet title="Detail" onClose={vi.fn()}>
        <p>Isi</p>
      </BottomSheet>,
    );
    // hanya 1 border-t (header), tidak ada border-t kedua utk footer
    expect(container.querySelectorAll(".border-t").length).toBe(0);
  });

  it("renders headerExtra next to close button", () => {
    render(
      <BottomSheet title="Detail" onClose={vi.fn()} headerExtra={<span>Extra</span>}>
        <p>Isi</p>
      </BottomSheet>,
    );
    expect(screen.getByText("Extra")).toBeInTheDocument();
  });

  it("calls onClose when close button clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(
      <BottomSheet title="Detail" onClose={onClose}>
        <p>Isi</p>
      </BottomSheet>,
    );
    await user.click(screen.getByLabelText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(
      <BottomSheet title="Detail" onClose={onClose}>
        <p>Isi</p>
      </BottomSheet>,
    );
    await user.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });
});
