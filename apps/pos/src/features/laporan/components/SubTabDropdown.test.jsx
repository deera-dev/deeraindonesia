import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SubTabDropdown from "./SubTabDropdown";

describe("SubTabDropdown", () => {
  it("shows active tab label", () => {
    render(<SubTabDropdown subTab="ringkasan" setSubTab={vi.fn()} />);
    expect(screen.getByText("Laporan")).toBeInTheDocument();
  });

  it("shows active tab for transaksi", () => {
    render(<SubTabDropdown subTab="transaksi" setSubTab={vi.fn()} />);
    expect(screen.getByText("Transaksi")).toBeInTheDocument();
  });

  it("opens dropdown on button click", () => {
    render(<SubTabDropdown subTab="ringkasan" setSubTab={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText("Keuangan")).toBeInTheDocument();
  });

  it("calls setSubTab when option selected", () => {
    const setSubTab = vi.fn();
    render(<SubTabDropdown subTab="ringkasan" setSubTab={setSubTab} />);
    fireEvent.click(screen.getByRole("button"));
    fireEvent.click(screen.getByText("Keuangan"));
    expect(setSubTab).toHaveBeenCalledWith("keuangan");
  });

  it("shows all 7 sub-tabs when open", () => {
    render(<SubTabDropdown subTab="ringkasan" setSubTab={vi.fn()} />);
    fireEvent.click(screen.getByRole("button"));
    ["Laporan", "Transaksi", "Keuangan", "Stok", "Pembeli", "Pasar", "BEP"].forEach(label => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
  });
});
