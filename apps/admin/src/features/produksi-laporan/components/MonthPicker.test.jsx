import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MonthPicker from "./MonthPicker";
import { buildMonthOptions } from "../utils";

// buildMonthOptions generates options relative to now (-11 to +2 months).
// Always use a value from the actual generated options to avoid stale-value issues.
const opts = buildMonthOptions();
const VALID_VALUE = opts[6].value; // middle of the range

describe("MonthPicker", () => {
  it("renders a select element", () => {
    render(<MonthPicker value={VALID_VALUE} onChange={() => {}} />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
  });

  it("shows multiple month options", () => {
    render(<MonthPicker value={VALID_VALUE} onChange={() => {}} />);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(5);
  });

  it("calls onChange with new value when selection changes", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<MonthPicker value={VALID_VALUE} onChange={onChange} />);
    const select = screen.getByRole("combobox");
    const allOpts = select.querySelectorAll("option");
    // Pick an option different from VALID_VALUE
    const targetOpt = allOpts[0].value === VALID_VALUE ? allOpts[1] : allOpts[0];
    await user.selectOptions(select, [targetOpt.value]);
    expect(onChange).toHaveBeenCalledWith(targetOpt.value);
  });

  it("current selected value matches value prop", () => {
    render(<MonthPicker value={VALID_VALUE} onChange={() => {}} />);
    const select = screen.getByRole("combobox");
    expect(select.value).toBe(VALID_VALUE);
  });
});
