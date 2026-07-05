import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../../shared/lib/format", () => ({
  labelCls: "label-cls",
}));

import RangeSlider from "./RangeSlider";

describe("RangeSlider", () => {
  it("renders label", () => {
    render(<RangeSlider label="Tarif" value={4000} min={2000} max={8000} onChange={vi.fn()} />);
    expect(screen.getByText("Tarif")).toBeInTheDocument();
  });

  it("renders current value display", () => {
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} onChange={vi.fn()} />);
    expect(screen.getByText("Rp 4.000")).toBeInTheDocument();
  });

  it("renders range input", () => {
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} step={1000} onChange={vi.fn()} />);
    const input = document.querySelector('input[type="range"]');
    expect(input).toBeInTheDocument();
    expect(input.min).toBe("2000");
    expect(input.max).toBe("8000");
  });

  it("calls onChange when range input changes", () => {
    const onChange = vi.fn();
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} onChange={onChange} />);
    const input = document.querySelector('input[type="range"]');
    fireEvent.change(input, { target: { value: "6000" } });
    expect(onChange).toHaveBeenCalledWith(6000);
  });

  it("renders mark chips when marks provided", () => {
    render(
      <RangeSlider label="L" value={4000} min={2000} max={8000} marks={[2000, 4000, 6000]} onChange={vi.fn()} />
    );
    expect(screen.getByText("2k")).toBeInTheDocument();
    expect(screen.getByText("4k")).toBeInTheDocument();
    expect(screen.getByText("6k")).toBeInTheDocument();
  });

  it("calls onChange with mark value when chip clicked", () => {
    const onChange = vi.fn();
    render(
      <RangeSlider label="L" value={4000} min={2000} max={8000} marks={[2000, 6000]} onChange={onChange} />
    );
    fireEvent.click(screen.getByText("6k"));
    expect(onChange).toHaveBeenCalledWith(6000);
  });

  it("shows active style on current value mark", () => {
    render(
      <RangeSlider label="L" value={4000} min={2000} max={8000} marks={[2000, 4000]} onChange={vi.fn()} />
    );
    const activeChip = screen.getByText("4k");
    expect(activeChip.className).toContain("text-[#CAB170]");
  });

  it("does not render marks when marks empty", () => {
    render(<RangeSlider label="L" value={4000} min={2000} max={8000} marks={[]} onChange={vi.fn()} />);
    expect(document.querySelectorAll("button").length).toBe(0);
  });
});
