import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProductOpnameCard from "./ProductOpnameCard";

const product = { kode: "D-01-OSK", nama: "Gamis Aisyah" };
const rows = [
  { id: "r1", kode: "D-01-OSK", size: "Midi", warna: "HITAM", gudang: 5, cideng: 2, tegalgubug: 1 },
  { id: "r2", kode: "D-01-OSK", size: "Gamis", warna: "MERAH", gudang: 3, cideng: 0, tegalgubug: 0 },
];
const getValue = (row, loc) => row[loc] ?? 0;

function renderCard(overrides = {}) {
  return render(
    <ProductOpnameCard
      product={product}
      rows={rows}
      isOpen={false}
      onToggle={vi.fn()}
      changed={{}}
      getValue={getValue}
      onChangeRow={vi.fn()}
      {...overrides}
    />
  );
}

describe("ProductOpnameCard", () => {
  it("menampilkan kode dan nama produk di header", () => {
    renderCard();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("Gamis Aisyah")).toBeInTheDocument();
  });

  it("menampilkan total stok dan breakdown G/C/T di header", () => {
    renderCard();
    // Total: (5+2+1) + (3+0+0) = 11
    expect(screen.getByText("11 pcs")).toBeInTheDocument();
    // Breakdown gudang: 5+3=8, cideng: 2+0=2, tegalgubug: 1+0=1
    expect(screen.getByText("G8")).toBeInTheDocument();
    expect(screen.getByText("C2")).toBeInTheDocument();
    expect(screen.getByText("T1")).toBeInTheDocument();
  });

  it("menampilkan ▼ saat closed dan ▲ saat open", () => {
    const { rerender } = renderCard({ isOpen: false });
    expect(screen.getByText("▼")).toBeInTheDocument();

    rerender(
      <ProductOpnameCard
        product={product} rows={rows} isOpen={true} onToggle={vi.fn()}
        changed={{}} getValue={getValue} onChangeRow={vi.fn()}
      />
    );
    expect(screen.getByText("▲")).toBeInTheDocument();
  });

  it("klik header memanggil onToggle dengan kode produk", () => {
    const onToggle = vi.fn();
    renderCard({ onToggle });
    fireEvent.click(screen.getByText("D-01-OSK").closest("button"));
    expect(onToggle).toHaveBeenCalledWith("D-01-OSK");
  });

  it("menampilkan badge 'diubah' saat ada changed untuk row produk", () => {
    renderCard({ changed: { r1: { gudang: 10 } } });
    expect(screen.getByText("diubah")).toBeInTheDocument();
  });

  it("tidak menampilkan badge 'diubah' saat tidak ada changed", () => {
    renderCard({ changed: {} });
    expect(screen.queryByText("diubah")).toBeNull();
  });

  it("body tersembunyi saat isOpen=false", () => {
    renderCard({ isOpen: false });
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("body terlihat saat isOpen=true: menampilkan input stok per row", () => {
    renderCard({ isOpen: true });
    const inputs = screen.getAllByRole("spinbutton");
    // 2 rows × 3 lokasi = 6 input
    expect(inputs.length).toBe(6);
  });

  it("saat isOpen=true, menampilkan size dan warna setiap row", () => {
    renderCard({ isOpen: true });
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("HITAM")).toBeInTheDocument();
    expect(screen.getByText("MERAH")).toBeInTheDocument();
  });

  it("perubahan input memanggil onChangeRow dengan row, loc, val", () => {
    const onChangeRow = vi.fn();
    renderCard({ isOpen: true, onChangeRow });
    const inputs = screen.getAllByRole("spinbutton");
    fireEvent.change(inputs[0], { target: { value: "10" } });
    expect(onChangeRow).toHaveBeenCalled();
  });

  it("rows kosong + isOpen=true: menampilkan pesan 'Belum ada data stok'", () => {
    renderCard({ rows: [], isOpen: true });
    expect(screen.getByText(/Belum ada data stok/)).toBeInTheDocument();
  });

  it("total stok 0 → '0 pcs' ditampilkan", () => {
    const emptyRows = [{ id: "e1", kode: "D-01-OSK", size: "Midi", warna: "_", gudang: 0, cideng: 0, tegalgubug: 0 }];
    renderCard({ rows: emptyRows });
    expect(screen.getByText("0 pcs")).toBeInTheDocument();
  });
});
