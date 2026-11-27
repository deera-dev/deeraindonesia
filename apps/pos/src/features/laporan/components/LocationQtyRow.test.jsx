import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LocationQtyRow from "./LocationQtyRow";

describe("LocationQtyRow", () => {
  it("menampilkan 3 lokasi dengan batas & qty masing-masing", () => {
    render(
      <LocationQtyRow
        breakdown={[{ location: "gudang", qty: 2 }]}
        maxByLoc={{ gudang: 5, cideng: 3, tegalgubug: 0 }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("GD · 5 pcs")).toBeInTheDocument();
    expect(screen.getByText("CD · 3 pcs")).toBeInTheDocument();
    expect(screen.getByText("TG · 0 pcs")).toBeInTheDocument();
  });

  it("tombol Tambah nonaktif begitu qty mencapai batas lokasi itu", () => {
    render(
      <LocationQtyRow
        breakdown={[{ location: "gudang", qty: 5 }]}
        maxByLoc={{ gudang: 5, cideng: 3, tegalgubug: 0 }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Tambah GD" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Tambah CD" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Tambah TG" })).toBeDisabled();
  });

  it("tombol Kurangi nonaktif begitu qty lokasi itu sudah 0", () => {
    render(
      <LocationQtyRow
        breakdown={[{ location: "gudang", qty: 1 }]}
        maxByLoc={{ gudang: 5, cideng: 3, tegalgubug: 0 }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Kurangi GD" })).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Kurangi CD" })).toBeDisabled();
  });

  it("klik Tambah memanggil onChange dgn lokasi & qty+1", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <LocationQtyRow
        breakdown={[{ location: "gudang", qty: 2 }, { location: "cideng", qty: 1 }]}
        maxByLoc={{ gudang: 5, cideng: 3, tegalgubug: 0 }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Tambah CD" }));
    expect(onChange).toHaveBeenCalledWith("cideng", 2);
  });

  it("klik Kurangi memanggil onChange dgn lokasi & qty-1, tidak pernah di bawah 0", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <LocationQtyRow
        breakdown={[{ location: "gudang", qty: 2 }]}
        maxByLoc={{ gudang: 5, cideng: 3, tegalgubug: 0 }}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Kurangi GD" }));
    expect(onChange).toHaveBeenCalledWith("gudang", 1);
  });

  it("lokasi yg tidak ada di breakdown dianggap qty 0", () => {
    render(
      <LocationQtyRow
        breakdown={[{ location: "gudang", qty: 2 }]}
        maxByLoc={{ gudang: 5, cideng: 3, tegalgubug: 0 }}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Kurangi CD" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Kurangi TG" })).toBeDisabled();
  });
});
