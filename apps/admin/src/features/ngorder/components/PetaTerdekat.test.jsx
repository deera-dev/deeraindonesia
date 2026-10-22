import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

vi.mock("../hooks", async () => ({ ...(await vi.importActual("../utils")) }));
import PetaTerdekat from "./PetaTerdekat";

const items = [
  { id: "a", nama: "Arafah Collection", distanceKm: 2.8, durationMin: 10 },
  { id: "b", nama: "Alisha Fancy Shop", distanceKm: 8.4, durationMin: 19 },
];

describe("PetaTerdekat", () => {
  it("mode rencana: urutan kunjungan dari toko rencana, tap = lihat di peta, tanpa Pilih semua", () => {
    const onFocus = vi.fn();
    const onToggle = vi.fn();
    render(<PetaTerdekat items={items} mode="rencana" total={23} selected={new Set()} onToggle={onToggle} onFocus={onFocus} onClose={vi.fn()} />);
    expect(screen.getByText(/Rencana terdekat \(2 dari 23\)/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Pilih semua" })).toBeNull();
    expect(screen.getByText("2.8 km · 10 mnt")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Alisha Fancy Shop"));
    expect(onFocus).toHaveBeenCalledWith(items[1]);
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("mode semua: centang untuk memasukkan ke rencana", () => {
    const onToggle = vi.fn();
    const onSelectAll = vi.fn();
    render(<PetaTerdekat items={items} mode="semua" selected={new Set(["a"])} onToggle={onToggle} onSelectAll={onSelectAll} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("1. Arafah Collection"));
    expect(onToggle).toHaveBeenCalledWith(items[0]);
    fireEvent.click(screen.getByRole("button", { name: "Pilih semua" }));
    expect(onSelectAll).toHaveBeenCalled();
  });
});
