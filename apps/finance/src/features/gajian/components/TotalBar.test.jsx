import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("../../../shared/lib/format", () => ({
  fmtRp: vi.fn((v) => `Rp${v}`),
}));

import TotalBar from "./TotalBar";

describe("TotalBar", () => {
  it("renders label", () => {
    render(<TotalBar label="Total Tim Potong" value={500000} />);
    expect(screen.getByText("Total Tim Potong")).toBeInTheDocument();
  });

  it("renders value via fmtRp", () => {
    render(<TotalBar label="L" value={750000} />);
    expect(screen.getByText("Rp750000")).toBeInTheDocument();
  });
});
