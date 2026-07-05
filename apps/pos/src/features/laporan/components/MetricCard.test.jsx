import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MetricCard from "./MetricCard";

describe("MetricCard", () => {
  it("renders label and value", () => {
    render(<MetricCard label="Omset" value="Rp 100.000" />);
    expect(screen.getByText("Omset")).toBeInTheDocument();
    expect(screen.getByText("Rp 100.000")).toBeInTheDocument();
  });

  it("renders sub text when provided", () => {
    render(<MetricCard label="Omset" value="Rp 100.000" sub="7 transaksi" />);
    expect(screen.getByText("7 transaksi")).toBeInTheDocument();
  });

  it("does not render sub when omitted", () => {
    const { container } = render(<MetricCard label="Omset" value="Rp 100.000" />);
    expect(container.querySelectorAll("p")).toHaveLength(2); // label + value only
  });

  it("applies gold color by default", () => {
    render(<MetricCard label="X" value="Y" />);
    expect(screen.getByText("Y").className).toContain("CAB170");
  });

  it("applies green color", () => {
    render(<MetricCard label="X" value="Y" color="green" />);
    expect(screen.getByText("Y").className).toContain("green");
  });

  it("applies red color", () => {
    render(<MetricCard label="X" value="Y" color="red" />);
    expect(screen.getByText("Y").className).toContain("red");
  });
});
