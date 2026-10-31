import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import ProductBukuCard from "./ProductBukuCard";

const product = { kode: "D-01-OSK", nama: "Gamis Aisyah" };
const rows = [
  { kode: "D-01-OSK", size: "Midi", warna: "HITAM" },
  { kode: "D-01-OSK", size: "Gamis", warna: "MERAH" },
];
const expectedMap = {
  "D-01-OSK__Midi__HITAM": 10,
  "D-01-OSK__Gamis__MERAH": 5,
};
const actualMap = {
  "D-01-OSK__Midi__HITAM": 8,
  "D-01-OSK__Gamis__MERAH": 6,
};

function renderCard(overrides = {}) {
  return render(
    <ProductBukuCard
      product={product}
      rows={rows}
      isOpen={false}
      onToggle={vi.fn()}
      changed={{}}
      expectedMap={expectedMap}
      actualMap={actualMap}
      onChangeExpected={vi.fn()}
      {...overrides}
    />,
  );
}

describe("ProductBukuCard", () => {
  it("menampilkan kode dan nama produk", () => {
    renderCard();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("Gamis Aisyah")).toBeInTheDocument();
  });

  it("menampilkan ringkasan E (expected) · T (terjual) · S (sisa) di header — tanpa soldMap, T=0", () => {
    renderCard();
    expect(screen.getByText(/E:15 · T:0 · S:14/)).toBeInTheDocument();
  });

  it("badge selisih (merah) memakai (sisa + terjual) - expected, BUKAN sisa saja", () => {
    renderCard();
    expect(screen.getByText("-1")).toBeInTheDocument();
  });

  it("terjual (soldMap) mengurangi selisih negatif — kasus bugfix rekonsiliasi utama", () => {
    const soldMap = { "D-01-OSK__Midi__HITAM": 1 };
    renderCard({ soldMap });
    expect(screen.getByText(/E:15 · T:1 · S:14/)).toBeInTheDocument();
    expect(screen.queryByText("-1")).toBeNull();
  });

  it("tidak menampilkan badge selisih saat (sisa + terjual) === expected", () => {
    const exactActual = {
      "D-01-OSK__Midi__HITAM": 10,
      "D-01-OSK__Gamis__MERAH": 5,
    };
    renderCard({ actualMap: exactActual });
    expect(screen.queryByText("✓")).toBeNull();
    expect(screen.queryByText("-1")).toBeNull();
  });

  it("badge 'diubah' muncul saat ada changed untuk row produk", () => {
    renderCard({ changed: { "D-01-OSK__Midi__HITAM": 12 } });
    expect(screen.getByText("diubah")).toBeInTheDocument();
  });

  it("klik header memanggil onToggle dengan kode", () => {
    const onToggle = vi.fn();
    renderCard({ onToggle });
    fireEvent.click(screen.getByText("D-01-OSK").closest("button"));
    expect(onToggle).toHaveBeenCalledWith("D-01-OSK");
  });

  it("▼ saat closed, ▲ saat open", () => {
    const { rerender } = renderCard();
    expect(screen.getByText("▼")).toBeInTheDocument();
    rerender(
      <ProductBukuCard
        product={product}
        rows={rows}
        isOpen={true}
        onToggle={vi.fn()}
        changed={{}}
        expectedMap={expectedMap}
        actualMap={actualMap}
        onChangeExpected={vi.fn()}
      />,
    );
    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  it("body tersembunyi saat isOpen=false", () => {
    renderCard();
    expect(screen.queryByRole("spinbutton")).toBeNull();
  });

  it("isOpen=true: menampilkan input expected per row", () => {
    renderCard({ isOpen: true });
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs.length).toBe(2);
  });

  it("isOpen=true: nilai input dari changed jika ada", () => {
    renderCard({ isOpen: true, changed: { "D-01-OSK__Midi__HITAM": 12 } });
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[0]).toHaveValue(12);
  });

  it("isOpen=true: nilai input dari expectedMap jika tidak ada changed", () => {
    renderCard({ isOpen: true });
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[0]).toHaveValue(10);
  });

  it("isOpen=true: kolom 'Terjual' menampilkan nilai dari soldMap per row", () => {
    const soldMap = { "D-01-OSK__Midi__HITAM": 3, "D-01-OSK__Gamis__MERAH": 0 };
    renderCard({ isOpen: true, soldMap });
    expect(screen.getAllByText("Terjual").length).toBeGreaterThan(0);
    expect(screen.getAllByText("3").length).toBeGreaterThan(0);
  });

  it("isOpen=true: kolom 'Sisa Stok' (dulu 'Stok Saat Ini') tetap menampilkan actualMap apa adanya", () => {
    renderCard({ isOpen: true });
    expect(screen.getAllByText("Sisa Stok").length).toBeGreaterThan(0);
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });

  it("perubahan input memanggil onChangeExpected dengan kode, size, warna, val", () => {
    const onChangeExpected = vi.fn();
    renderCard({ isOpen: true, onChangeExpected });
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "15" } });
    expect(onChangeExpected).toHaveBeenCalledWith("D-01-OSK", "Midi", "HITAM", "15");
  });

  it("rows kosong: header tetap tampil tanpa crash", () => {
    renderCard({ rows: [] });
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText(/E:0 · T:0 · S:0/)).toBeInTheDocument();
  });

  it("soldMap tidak diberikan sama sekali: default ke {} tanpa crash", () => {
    expect(() => renderCard({ soldMap: undefined })).not.toThrow();
  });
});
