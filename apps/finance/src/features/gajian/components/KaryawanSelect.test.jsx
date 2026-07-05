import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../../karyawan", () => ({
  timLabel: vi.fn((t) => `Tim ${t}`),
}));
vi.mock("../../../shared/lib/format", () => ({
  inputCls: "",
}));

import KaryawanSelect from "./KaryawanSelect";

const list = [
  { id: "k1", nama: "BUDI", tim: "jahit" },
  { id: "k2", nama: "ANI", tim: "potong" },
  { id: "k3", nama: "SARI", tim: "jahit" },
];

describe("KaryawanSelect", () => {
  it("renders placeholder option", () => {
    render(<KaryawanSelect value="" onChange={vi.fn()} list={list} timFilter="jahit" />);
    expect(screen.getByText("Pilih karyawan...")).toBeInTheDocument();
  });

  it("renders only karyawan in timFilter", () => {
    render(<KaryawanSelect value="" onChange={vi.fn()} list={list} timFilter="jahit" />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
    expect(screen.getByText("SARI")).toBeInTheDocument();
    expect(screen.queryByText("ANI")).toBeNull();
  });

  it("falls back to all list when no karyawan in timFilter", () => {
    render(<KaryawanSelect value="" onChange={vi.fn()} list={list} timFilter="qc" />);
    expect(screen.getByText(/BUDI/)).toBeInTheDocument();
    expect(screen.getByText(/ANI/)).toBeInTheDocument();
    expect(screen.getByText(/SARI/)).toBeInTheDocument();
  });

  it("shows timLabel for karyawan not in timFilter (fallback mode)", () => {
    render(<KaryawanSelect value="" onChange={vi.fn()} list={list} timFilter="qc" />);
    expect(screen.getAllByText(/Tim jahit/).length).toBeGreaterThan(0);
  });

  it("calls onChange when selection changes", () => {
    const onChange = vi.fn();
    render(<KaryawanSelect value="" onChange={onChange} list={list} timFilter="jahit" />);
    fireEvent.change(document.querySelector("select"), { target: { value: "k1" } });
    expect(onChange).toHaveBeenCalledWith("k1");
  });
});
