import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Kas Masuk" value="Rp 500.000" />);
    expect(screen.getByText("Kas Masuk")).toBeInTheDocument();
    expect(screen.getByText("Rp 500.000")).toBeInTheDocument();
  });

  it("renders sub when provided", () => {
    render(<StatCard label="Kasbon" value="Rp 0" sub="2 karyawan" />);
    expect(screen.getByText("2 karyawan")).toBeInTheDocument();
  });

  it("does not render sub when not provided", () => {
    const { container } = render(<StatCard label="L" value="V" />);
    // no extra sub element rendered
    expect(container.querySelectorAll("p").length).toBe(2);
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<StatCard label="L" value="V" onClick={onClick} />);
    fireEvent.click(screen.getByText("V").closest("div"));
    expect(onClick).toHaveBeenCalled();
  });

  it("adds cursor-pointer class when onClick provided", () => {
    const { container } = render(<StatCard label="L" value="V" onClick={vi.fn()} />);
    expect(container.firstChild.className).toContain("cursor-pointer");
  });

  it("does not add cursor-pointer when no onClick", () => {
    const { container } = render(<StatCard label="L" value="V" />);
    expect(container.firstChild.className).not.toContain("cursor-pointer");
  });
});
