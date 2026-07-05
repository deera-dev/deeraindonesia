import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import GrandTotalStrip from "./GrandTotalStrip";

const stokRows = [
  { id: "r1", kode: "A" },
  { id: "r2", kode: "B" },
];
// getValue returns 3 for each (loc) = gudang 6, cideng 6, tegalgubug 6 for 2 rows
const getValue = vi.fn((row, loc) => 3);

function renderStrip(overrides = {}) {
  return render(
    <GrandTotalStrip
      stokRows={stokRows}
      getValue={getValue}
      locFilter={null}
      onToggleLocFilter={vi.fn()}
      {...overrides}
    />
  );
}

describe("GrandTotalStrip", () => {
  it("menampilkan 3 tombol untuk 3 lokasi", () => {
    renderStrip();
    expect(screen.getByTitle(/Filter produk dengan stok Gudang/)).toBeInTheDocument();
    expect(screen.getByTitle(/Filter produk dengan stok Cideng/)).toBeInTheDocument();
    expect(screen.getByTitle(/Filter produk dengan stok Tegal/)).toBeInTheDocument();
  });

  it("menampilkan grand total per lokasi (sum getValue)", () => {
    renderStrip();
    // 2 rows × getValue=3 per lokasi = 6 setiap lokasi
    const totals = screen.getAllByText("6");
    expect(totals.length).toBeGreaterThanOrEqual(3);
  });

  it("menampilkan label singkat (GD, CD, TG) tanpa filter aktif", () => {
    renderStrip({ locFilter: null });
    expect(screen.getByText(/^GD$/)).toBeInTheDocument();
    expect(screen.getByText(/^CD$/)).toBeInTheDocument();
    expect(screen.getByText(/^TG$/)).toBeInTheDocument();
  });

  it("tombol lokasi aktif menampilkan tanda ✕ pada label", () => {
    renderStrip({ locFilter: "gudang" });
    expect(screen.getByText(/GD ✕/)).toBeInTheDocument();
  });

  it("klik tombol memanggil onToggleLocFilter dengan key lokasi", () => {
    const onToggle = vi.fn();
    renderStrip({ onToggleLocFilter: onToggle });
    fireEvent.click(screen.getByTitle(/Filter produk dengan stok Cideng/));
    expect(onToggle).toHaveBeenCalledWith("cideng");
  });

  it("klik lokasi aktif memanggil onToggleLocFilter (hapus filter)", () => {
    const onToggle = vi.fn();
    renderStrip({ locFilter: "gudang", onToggleLocFilter: onToggle });
    fireEvent.click(screen.getByTitle(/Hapus filter Gudang/));
    expect(onToggle).toHaveBeenCalledWith("gudang");
  });

  it("stokRows kosong → semua grand total = 0", () => {
    renderStrip({ stokRows: [] });
    const zeros = screen.getAllByText("0");
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });
});
