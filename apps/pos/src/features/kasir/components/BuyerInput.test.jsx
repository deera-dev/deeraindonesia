import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../../pelanggan", () => ({
  searchPelanggan: vi.fn().mockResolvedValue([]),
  addPelanggan: vi.fn().mockResolvedValue({ id: "np1", nama: "BUDI" }),
}));

import { searchPelanggan, addPelanggan } from "../../pelanggan";
import BuyerInput from "./BuyerInput";

beforeEach(() => {
  vi.clearAllMocks();
  searchPelanggan.mockResolvedValue([]);
});

describe("BuyerInput", () => {
  it("renders input with placeholder", () => {
    render(<BuyerInput value="" onChange={vi.fn()} onSelect={vi.fn()} disabled={false} />);
    expect(screen.getByPlaceholderText("Nama pembeli (opsional)")).toBeInTheDocument();
  });

  it("calls onChange with uppercase when user types", () => {
    const onChange = vi.fn();
    render(<BuyerInput value="" onChange={onChange} onSelect={vi.fn()} disabled={false} />);
    fireEvent.change(screen.getByPlaceholderText("Nama pembeli (opsional)"), { target: { value: "budi" } });
    expect(onChange).toHaveBeenCalledWith("BUDI");
  });

  it("shows suggestions when searchPelanggan returns results", async () => {
    searchPelanggan.mockResolvedValue([{ id: "p1", nama: "BUDI", no_hp: "081" }]);
    render(<BuyerInput value="BU" onChange={vi.fn()} onSelect={vi.fn()} disabled={false} />);
    await waitFor(() => expect(screen.getByText("BUDI")).toBeInTheDocument());
  });

  it("shows HP when suggestion has no_hp", async () => {
    searchPelanggan.mockResolvedValue([{ id: "p1", nama: "BUDI", no_hp: "08111" }]);
    render(<BuyerInput value="BU" onChange={vi.fn()} onSelect={vi.fn()} disabled={false} />);
    await waitFor(() => expect(screen.getByText("08111")).toBeInTheDocument());
  });

  it("calls onSelect and closes dropdown on suggestion click", async () => {
    const onSelect = vi.fn();
    searchPelanggan.mockResolvedValue([{ id: "p1", nama: "BUDI", no_hp: "081" }]);
    render(<BuyerInput value="BU" onChange={vi.fn()} onSelect={onSelect} disabled={false} />);
    await waitFor(() => screen.getByText("BUDI"));
    fireEvent.click(screen.getByText("BUDI"));
    expect(onSelect).toHaveBeenCalledWith({ id: "p1", nama: "BUDI", no_hp: "081" });
  });

  it("shows add-new option when value doesn't exactly match suggestions", async () => {
    searchPelanggan.mockResolvedValue([{ id: "p1", nama: "BUDIMAN", no_hp: "" }]);
    render(<BuyerInput value="BUDI" onChange={vi.fn()} onSelect={vi.fn()} disabled={false} />);
    await waitFor(() => expect(screen.getByText(/Simpan/)).toBeInTheDocument());
  });

  it("does NOT show add-new when exact match exists", async () => {
    searchPelanggan.mockResolvedValue([{ id: "p1", nama: "BUDI", no_hp: "" }]);
    render(<BuyerInput value="BUDI" onChange={vi.fn()} onSelect={vi.fn()} disabled={false} />);
    await waitFor(() => screen.getByText("BUDI"));
    expect(screen.queryByText(/Simpan/)).not.toBeInTheDocument();
  });

  it("add-new button calls addPelanggan and onSelect", async () => {
    const onSelect = vi.fn();
    searchPelanggan.mockResolvedValue([{ id: "p1", nama: "BUDIMAN", no_hp: "" }]);
    addPelanggan.mockResolvedValue({ id: "np1", nama: "BUDI" });
    render(<BuyerInput value="BUDI" onChange={vi.fn()} onSelect={onSelect} disabled={false} />);
    await waitFor(() => screen.getByText(/Simpan/));
    fireEvent.click(screen.getByText(/Simpan/));
    await waitFor(() => expect(onSelect).toHaveBeenCalledWith({ id: "np1", nama: "BUDI" }));
  });

  it("no suggestions shown when value is empty", async () => {
    render(<BuyerInput value="" onChange={vi.fn()} onSelect={vi.fn()} disabled={false} />);
    await waitFor(() => expect(searchPelanggan).not.toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: /BUDI/ })).not.toBeInTheDocument();
  });

  it("is disabled when disabled=true", () => {
    render(<BuyerInput value="" onChange={vi.fn()} onSelect={vi.fn()} disabled={true} />);
    expect(screen.getByPlaceholderText("Nama pembeli (opsional)")).toBeDisabled();
  });
});
