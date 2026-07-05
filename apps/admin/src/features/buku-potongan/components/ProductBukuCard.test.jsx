import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductBukuCard from "./ProductBukuCard";

const product = { kode: "D-01-OSK", nama: "Gamis Aisyah" };
// rows: kode, size, warna
const rows = [
  { kode: "D-01-OSK", size: "Midi", warna: "HITAM" },
  { kode: "D-01-OSK", size: "Gamis", warna: "MERAH" },
];
// rowKey format: "kode__size__warna"
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
    />
  );
}

describe("ProductBukuCard", () => {
  it("menampilkan kode dan nama produk", () => {
    renderCard();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("Gamis Aisyah")).toBeInTheDocument();
  });

  it("menampilkan ringkasan E (expected) & S (aktual) di header", () => {
    renderCard();
    // totalExpected=15, totalActual=14 → selisih=-1
    expect(screen.getByText(/E:15 · S:14/)).toBeInTheDocument();
  });

  it("menampilkan badge selisih (merah) saat totalActual < totalExpected", () => {
    renderCard();
    // selisih = 14 - 15 = -1 → selisihLabel(-1) = "-1"
    expect(screen.getByText("-1")).toBeInTheDocument();
  });

  it("tidak menampilkan badge selisih saat totalActual === totalExpected", () => {
    const exactActual = {
      "D-01-OSK__Midi__HITAM": 10,
      "D-01-OSK__Gamis__MERAH": 5,
    };
    renderCard({ actualMap: exactActual });
    expect(screen.queryByText("✓")).toBeNull(); // badge tidak muncul kalau selisih=0
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
      <ProductBukuCard product={product} rows={rows} isOpen={true} onToggle={vi.fn()}
        changed={{}} expectedMap={expectedMap} actualMap={actualMap} onChangeExpected={vi.fn()} />
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
    expect(inputs[0]).toHaveValue(12); // dari changed
  });

  it("isOpen=true: nilai input dari expectedMap jika tidak ada changed", () => {
    renderCard({ isOpen: true });
    const inputs = screen.getAllByRole("spinbutton");
    expect(inputs[0]).toHaveValue(10); // dari expectedMap
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
    expect(screen.getByText(/E:0 · S:0/)).toBeInTheDocument();
  });
});
