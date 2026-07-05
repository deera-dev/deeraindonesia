import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StatCard from "./StatCard";

describe("StatCard", () => {
  it("renders label and value", () => {
    render(<StatCard label="Total Batch" value="5" />);
    expect(screen.getByText("Total Batch")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders sub text", () => {
    render(<StatCard label="Total Baju" value="100" sub="potong diproduksi" />);
    expect(screen.getByText("potong diproduksi")).toBeInTheDocument();
  });

  it("applies accent class when accent=true", () => {
    render(<StatCard label="Label" value="99" accent />);
    expect(screen.getByText("99").className).toContain("CAB170");
  });

  it("applies warn class when warn=true", () => {
    render(<StatCard label="Modal" value="1000000" warn />);
    expect(screen.getByText("1000000").className).toContain("amber");
  });

  it("does not render sub if not provided", () => {
    render(<StatCard label="X" value="0" />);
    // only label and value text nodes
    expect(screen.queryByText("undefined")).not.toBeInTheDocument();
  });
});
