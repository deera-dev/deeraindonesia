import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import FilterBar from "./FilterBar";

const today = new Date().toISOString().split("T")[0];
const baseProps = {
  filter: "today",
  customDate: today,
  rangeFrom: today,
  rangeTo: today,
  onFilter: vi.fn(),
  onDateChange: vi.fn(),
  onRangeChange: vi.fn(),
};

describe("FilterBar", () => {
  it("renders filter button with Hari Ini label", () => {
    render(<FilterBar {...baseProps} />);
    expect(screen.getByText("Hari Ini")).toBeInTheDocument();
  });

  it("opens filter menu on click", () => {
    render(<FilterBar {...baseProps} />);
    fireEvent.click(screen.getByText("Hari Ini"));
    expect(screen.getByText("7 Hari")).toBeInTheDocument();
  });

  it("calls onFilter when option selected", () => {
    const onFilter = vi.fn();
    render(<FilterBar {...baseProps} onFilter={onFilter} />);
    fireEvent.click(screen.getByText("Hari Ini"));
    fireEvent.click(screen.getByText("7 Hari"));
    expect(onFilter).toHaveBeenCalledWith("week");
  });

  it("shows date input when filter=custom", () => {
    render(<FilterBar {...baseProps} filter="custom" />);
    const inputs = screen.getAllByDisplayValue(today);
    expect(inputs.length).toBeGreaterThan(0);
  });

  it("shows range inputs when filter=range", () => {
    render(<FilterBar {...baseProps} filter="range" />);
    const dateInputs = document.querySelectorAll('input[type="date"]');
    expect(dateInputs.length).toBeGreaterThan(0);
  });

  it("calls onDateChange when date input changes", () => {
    const onDateChange = vi.fn();
    render(<FilterBar {...baseProps} filter="custom" onDateChange={onDateChange} />);
    const dateInput = document.querySelector('input[type="date"]');
    fireEvent.change(dateInput, { target: { value: "2026-07-01" } });
    expect(onDateChange).toHaveBeenCalledWith("2026-07-01");
  });

  it("shows all filter options when open", () => {
    render(<FilterBar {...baseProps} />);
    fireEvent.click(screen.getByText("Hari Ini"));
    ["Hari Ini", "7 Hari", "Bulan Ini", "Tahun Ini"].forEach(label => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
  });
});
