import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
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
