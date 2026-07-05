import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SectionHeader from "./SectionHeader";

describe("SectionHeader", () => {
  it("renders children text", () => {
    render(<SectionHeader>Kas Bulan Ini</SectionHeader>);
    expect(screen.getByText("Kas Bulan Ini")).toBeInTheDocument();
  });

  it("renders as a paragraph element", () => {
    render(<SectionHeader>Label</SectionHeader>);
    expect(screen.getByText("Label").tagName).toBe("P");
  });
});
