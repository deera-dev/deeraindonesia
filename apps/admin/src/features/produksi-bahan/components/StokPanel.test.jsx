import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../hooks", () => ({
  useStokBahan: vi.fn(),
}));

import StokPanel from "./StokPanel";
import { useStokBahan } from "../hooks";

describe("StokPanel", () => {
  it("shows loading text while loading", () => {
    useStokBahan.mockReturnValue({ data: [], loading: true });
    render(<StokPanel />);
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows empty message when no data", () => {
    useStokBahan.mockReturnValue({ data: [], loading: false });
    render(<StokPanel />);
    expect(screen.getByText("Belum ada data bahan.")).toBeInTheDocument();
  });

  it("renders stok rows with nama_bahan and satuan", () => {
    useStokBahan.mockReturnValue({
      loading: false,
      data: [
        { nama_bahan: "Wolfis", satuan: "yard", stok_sisa: 10.5, total_masuk: 20, total_keluar: 9.5 },
        { nama_bahan: "Sifon",  satuan: "meter", stok_sisa: 0, total_masuk: 5, total_keluar: 5 },
      ],
    });
    render(<StokPanel />);
    expect(screen.getByText("Wolfis")).toBeInTheDocument();
    expect(screen.getByText("Sifon")).toBeInTheDocument();
    expect(screen.getByText("yard")).toBeInTheDocument();
  });

  it("shows stok_sisa with 2 decimal places", () => {
    useStokBahan.mockReturnValue({
      loading: false,
      // stok_sisa=7, total_masuk=12, total_keluar=5 -- all three values differ
      data: [{ nama_bahan: "X", satuan: "yard", stok_sisa: 7, total_masuk: 12, total_keluar: 5 }],
    });
    render(<StokPanel />);
    expect(screen.getByText("7.00")).toBeInTheDocument();
  });

  it("applies red color class for negative stok", () => {
    useStokBahan.mockReturnValue({
      loading: false,
      data: [{ nama_bahan: "X", satuan: "yard", stok_sisa: -2, total_masuk: 0, total_keluar: 2 }],
    });
    render(<StokPanel />);
    const sisa = screen.getByText("-2.00");
    expect(sisa.className).toContain("red");
  });

  it("applies amber color class for zero stok", () => {
    useStokBahan.mockReturnValue({
      loading: false,
      data: [{ nama_bahan: "X", satuan: "yard", stok_sisa: 0, total_masuk: 5, total_keluar: 5 }],
    });
    render(<StokPanel />);
    const sisa = screen.getByText("0.00");
    expect(sisa.className).toContain("amber");
  });

  it("shows Masuk and Keluar values", () => {
    useStokBahan.mockReturnValue({
      loading: false,
      // stok_sisa=3, total_masuk=10, total_keluar=7 -- all three values differ
      data: [{ nama_bahan: "X", satuan: "yard", stok_sisa: 3, total_masuk: 10, total_keluar: 7 }],
    });
    render(<StokPanel />);
    expect(screen.getByText("10.00")).toBeInTheDocument();
    expect(screen.getByText("7.00")).toBeInTheDocument();
  });
});
