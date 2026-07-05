import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TabHeader from "./TabHeader";

describe("TabHeader", () => {
  it("renders title", () => {
    render(<TabHeader title="Tim Potong" />);
    expect(screen.getByText("Tim Potong")).toBeInTheDocument();
  });

  it("renders + Tambah button when onAdd provided", () => {
    render(<TabHeader title="T" onAdd={vi.fn()} />);
    expect(screen.getByText("+ Tambah")).toBeInTheDocument();
  });

  it("does not render + Tambah when onAdd not provided", () => {
    render(<TabHeader title="T" />);
    expect(screen.queryByText("+ Tambah")).toBeNull();
  });

  it("calls onAdd when + Tambah clicked", () => {
    const onAdd = vi.fn();
    render(<TabHeader title="T" onAdd={onAdd} />);
    fireEvent.click(screen.getByText("+ Tambah"));
    expect(onAdd).toHaveBeenCalled();
  });
});
