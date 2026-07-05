import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { WhatsApp } from "./WhatsApp";

describe("WhatsApp", () => {
  it("renders an SVG element", () => {
    const { container } = render(<WhatsApp className="w-6 h-6" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
  });

  it("applies className to svg", () => {
    const { container } = render(<WhatsApp className="text-green-500" />);
    const svg = container.querySelector("svg");
    expect(svg.getAttribute("class")).toBe("text-green-500");
  });
});
