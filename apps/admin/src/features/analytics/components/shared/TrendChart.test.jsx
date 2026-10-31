import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("recharts", async () => {
  const actual = await vi.importActual("recharts");
  return {
    ...actual,
    ResponsiveContainer: ({ children, width = 600, height = 300 }) => (
      <div style={{ width, height }}>{React.cloneElement(children, { width, height })}</div>
    ),
  };
});

import TrendChart from "./TrendChart";

const DATA = [
  { label: "1 Jan", revenue: 100000, profit: 20000, qty: 2 },
  { label: "2 Jan", revenue: 200000, profit: 40000, qty: 4 },
  { label: "3 Jan", revenue: 150000, profit: 30000, qty: 3 },
];

const SERIES = [
  { dataKey: "revenue", label: "Revenue", color: "#CAB170", yAxisId: "left" },
  { dataKey: "profit", label: "Profit", color: "#4C9A6A", yAxisId: "left" },
  { dataKey: "qty", label: "Qty Terjual", color: "#5B8DEF", yAxisId: "right" },
];

describe("TrendChart", () => {
  it("shows empty-state message when data kosong", () => {
    render(<TrendChart data={[]} series={SERIES} />);
    expect(screen.getByText(/Belum ada data/)).toBeInTheDocument();
  });

  it("shows empty-state message when series kosong", () => {
    render(<TrendChart data={DATA} series={[]} />);
    expect(screen.getByText(/Belum ada data/)).toBeInTheDocument();
  });

  it("renders svg chart with one line per series", () => {
    const { container } = render(<TrendChart data={DATA} series={SERIES} />);
    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(3);
  });

  it("renders legend labels for each series", () => {
    render(<TrendChart data={DATA} series={SERIES} />);
    expect(screen.getByText("Revenue")).toBeInTheDocument();
    expect(screen.getByText("Profit")).toBeInTheDocument();
    expect(screen.getByText("Qty Terjual")).toBeInTheDocument();
  });

  it("clicking a legend item hides that series' line (toggle)", () => {
    const { container } = render(<TrendChart data={DATA} series={SERIES} />);
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(3);

    fireEvent.click(screen.getByText("Qty Terjual"));
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(2);

    fireEvent.click(screen.getByText("Qty Terjual"));
    expect(container.querySelectorAll(".recharts-line")).toHaveLength(3);
  });

  it("renders dual Y-axis when ada series di kedua yAxisId (left & right)", () => {
    const { container } = render(<TrendChart data={DATA} series={SERIES} />);
    expect(container.querySelectorAll(".recharts-yAxis")).toHaveLength(2);
  });

  it("renders single Y-axis (left saja) kalau tidak ada series yAxisId=right", () => {
    const { container } = render(
      <TrendChart
        data={DATA}
        series={[{ dataKey: "revenue", label: "Revenue", color: "#CAB170" }]}
      />,
    );
    expect(container.querySelectorAll(".recharts-yAxis")).toHaveLength(1);
  });

  it("does not crash with a single data point", () => {
    const { container } = render(
      <TrendChart
        data={[{ label: "1 Jan", revenue: 100000 }]}
        series={[{ dataKey: "revenue", label: "Revenue", color: "#CAB170" }]}
      />,
    );
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("respects custom height prop", () => {
    const { container } = render(<TrendChart data={DATA} series={SERIES} height={180} />);
    const wrapper = container.firstChild;
    expect(wrapper.style.height).toBe("180px");
  });
});
