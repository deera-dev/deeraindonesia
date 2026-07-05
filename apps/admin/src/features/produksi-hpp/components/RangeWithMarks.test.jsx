import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RangeWithMarks from "./RangeWithMarks";

describe("RangeWithMarks", () => {
  const defaultProps = { value: 30000, onChange: vi.fn(), min: 0, max: 100000, step: 5000 };

  it("renders range input", () => {
    const { container } = render(<RangeWithMarks {...defaultProps} />);
    expect(container.querySelector('input[type="range"]')).toBeInTheDocument();
  });

  it("calls onChange when slider moves", () => {
    const onChange = vi.fn();
    const { container } = render(<RangeWithMarks {...defaultProps} onChange={onChange} />);
    fireEvent.change(container.querySelector('input[type="range"]'), { target: { value: "50000" } });
    expect(onChange).toHaveBeenCalledWith(50000);
  });

  it("shows min and max labels", () => {
    render(<RangeWithMarks {...defaultProps} min={0} max={100000} zeroLabel="Gratis" />);
    expect(screen.getByText("Gratis")).toBeInTheDocument();
    expect(screen.getByText("100rb")).toBeInTheDocument();
  });

  it("shows non-zero min label in rb format", () => {
    render(<RangeWithMarks {...defaultProps} min={5000} />);
    expect(screen.getByText("5rb")).toBeInTheDocument();
  });

  it("renders mark buttons", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RangeWithMarks {...defaultProps} onChange={onChange} marks={[{ value: 20000, label: "20rb" }]} />);
    await user.click(screen.getByText("20rb"));
    expect(onChange).toHaveBeenCalledWith(20000);
  });

  it("shows manual input toggle", async () => {
    const user = userEvent.setup();
    render(<RangeWithMarks {...defaultProps} />);
    const toggleBtn = screen.getByText("Input manual");
    await user.click(toggleBtn);
    // Both range and number input have value 30000 — find the number input specifically
    const numInput = screen.getAllByDisplayValue("30000").find(el => el.type === "number");
    expect(numInput).toBeInTheDocument();
  });

  it("onChange called when typing in manual input", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<RangeWithMarks {...defaultProps} onChange={onChange} />);
    await user.click(screen.getByText("Input manual"));
    const numInput = screen.getAllByDisplayValue("30000").find(el => el.type === "number");
    fireEvent.change(numInput, { target: { value: "45000" } });
    expect(onChange).toHaveBeenCalledWith(45000);
  });
});
