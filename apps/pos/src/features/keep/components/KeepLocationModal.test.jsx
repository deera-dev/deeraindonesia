import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATIONS: ["gudang", "cideng", "tegalgubug"],
  LOCATION_LABELS: { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" },
}));

import KeepLocationModal from "./KeepLocationModal";

describe("KeepLocationModal", () => {
  it("menampilkan 3 lokasi, menandai lokasi saat ini", () => {
    render(<KeepLocationModal currentLocation="cideng" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText(/Gudang/)).toBeInTheDocument();
    expect(screen.getByText(/Cideng \(saat ini\)/)).toBeInTheDocument();
    expect(screen.getByText(/Tegalgubug/)).toBeInTheDocument();
  });

  it("klik salah satu lokasi -> onConfirm dgn lokasi itu (satu tap, bukan 2 langkah)", () => {
    const onConfirm = vi.fn();
    render(<KeepLocationModal currentLocation="cideng" onConfirm={onConfirm} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByText(/Tegalgubug/));
    expect(onConfirm).toHaveBeenCalledWith("tegalgubug");
  });

  it("klik Batal, ✕, atau backdrop -> onCancel, TIDAK memanggil onConfirm", () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const { container } = render(<KeepLocationModal currentLocation="gudang" onConfirm={onConfirm} onCancel={onCancel} />);
    fireEvent.click(screen.getByText("Batal"));
    fireEvent.click(screen.getByText("✕"));
    fireEvent.click(container.querySelector(".absolute.inset-0"));
    expect(onCancel).toHaveBeenCalledTimes(3);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
