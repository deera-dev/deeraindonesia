import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Modal, ModalFooter } from "./Modal";

describe("Modal", () => {
  it("renders title", () => {
    render(<Modal title="Test Modal" onClose={vi.fn()}><p>content</p></Modal>);
    expect(screen.getByText("Test Modal")).toBeInTheDocument();
  });

  it("renders children", () => {
    render(<Modal title="T" onClose={vi.fn()}><p data-testid="child">hello</p></Modal>);
    expect(screen.getByTestId("child")).toBeInTheDocument();
  });

  it("calls onClose when × clicked", () => {
    const onClose = vi.fn();
    render(<Modal title="T" onClose={onClose}><p /></Modal>);
    fireEvent.click(screen.getByText("×"));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when backdrop clicked", () => {
    const onClose = vi.fn();
    render(<Modal title="T" onClose={onClose}><p /></Modal>);
    fireEvent.click(document.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("ModalFooter", () => {
  it("renders Batal button", () => {
    render(
      <form><ModalFooter onCancel={vi.fn()} saving={false} /></form>
    );
    expect(screen.getByText("Batal")).toBeInTheDocument();
  });

  it("renders Simpan button by default", () => {
    render(
      <form><ModalFooter onCancel={vi.fn()} saving={false} /></form>
    );
    expect(screen.getByText("Simpan")).toBeInTheDocument();
  });

  it("renders custom saveLabel", () => {
    render(
      <form><ModalFooter onCancel={vi.fn()} saving={false} saveLabel="Buat" /></form>
    );
    expect(screen.getByText("Buat")).toBeInTheDocument();
  });

  it("shows Menyimpan... when saving=true", () => {
    render(
      <form><ModalFooter onCancel={vi.fn()} saving={true} /></form>
    );
    expect(screen.getByText("Menyimpan...")).toBeInTheDocument();
  });

  it("disables buttons when saving=true", () => {
    render(
      <form><ModalFooter onCancel={vi.fn()} saving={true} /></form>
    );
    expect(screen.getByText("Batal")).toBeDisabled();
    expect(screen.getByText("Menyimpan...")).toBeDisabled();
  });

  it("calls onCancel when Batal clicked", () => {
    const onCancel = vi.fn();
    render(
      <form><ModalFooter onCancel={onCancel} saving={false} /></form>
    );
    fireEvent.click(screen.getByText("Batal"));
    expect(onCancel).toHaveBeenCalled();
  });
});
