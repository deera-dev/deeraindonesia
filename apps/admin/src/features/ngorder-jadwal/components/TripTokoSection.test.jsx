import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import TripTokoSection from "./TripTokoSection";

const trip = {
  daerah: [],
  toko: [
    { toko_id: "a", nama: "Toko Rendah", daerah: "BOGOR", dikunjungi: false },
    { toko_id: "b", nama: "Toko Tinggi", daerah: "BOGOR", dikunjungi: true },
  ],
};
const tokoList = [{ id: "a", skor: 55, prioritas: "B" }, { id: "b", skor: 90, prioritas: "A" }];

describe("TripTokoSection", () => {
  it("menampilkan grup daerah, peringkat, dan prioritas", () => {
    render(<TripTokoSection trip={trip} tokoList={tokoList} save={vi.fn()} />);
    expect(screen.getByText("BOGOR")).toBeInTheDocument();
    expect(screen.getByText("1/2 ▴")).toBeInTheDocument();
    const names = screen.getAllByText(/^Toko /).map((n) => n.textContent);
    expect(names.slice(0, 2)).toEqual(["Toko Tinggi", "Toko Rendah"]);
    expect(screen.getByLabelText("Prioritas A")).toBeInTheDocument();
  });
  it("grup bisa diciutkan", () => {
    render(<TripTokoSection trip={trip} tokoList={tokoList} save={vi.fn()} />);
    fireEvent.click(screen.getByText("BOGOR"));
    expect(screen.queryByText("Toko Tinggi")).not.toBeInTheDocument();
  });
});
