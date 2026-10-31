import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";
import { WhatsApp } from "./WhatsApp";

describe("WhatsApp", () => {
  it("renders an svg element", () => {
    const { container } = render(<WhatsApp />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("applies className prop", () => {
    const { container } = render(<WhatsApp className="custom-cls" />);
    expect(container.querySelector("svg")).toHaveClass("custom-cls");
  });

  it("has currentColor fill", () => {
    const { container } = render(<WhatsApp />);
    const svg = container.querySelector("svg");
    expect(svg.getAttribute("fill")).toBe("currentColor");
  });
});
