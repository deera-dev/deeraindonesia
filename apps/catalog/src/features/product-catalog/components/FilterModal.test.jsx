import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FilterModal from "./FilterModal";

const products = [
  { kode: "A", bahan: "Ceruti", variants: [{ size: "Midi" }] },
  { kode: "B", bahan: "Sifon", variants: [{ size: "Gamis Jumbo" }] },
];

function renderModal(props) {
  return render(
    <FilterModal
      open
      products={products}
      bahan={null}
      ukuran={null}
      resultCount={2}
      onSetBahan={vi.fn()}
      onSetUkuran={vi.fn()}
      onReset={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  );
}

describe("FilterModal", () => {
  it("tidak render apa pun saat open=false", () => {
    const { container } = render(
      <FilterModal
        open={false}
        products={products}
        bahan={null}
        ukuran={null}
        resultCount={0}
        onSetBahan={vi.fn()}
        onSetUkuran={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("render chip bahan & ukuran dari getFilterOptions(products)", () => {
    renderModal();
    expect(screen.getByText("Ceruti")).toBeInTheDocument();
    expect(screen.getByText("Sifon")).toBeInTheDocument();
    expect(screen.getByText("Midi")).toBeInTheDocument();
    expect(screen.getByText("Gamis Jumbo")).toBeInTheDocument();
  });

  it("klik chip bahan memanggil onSetBahan", () => {
    const onSetBahan = vi.fn();
    renderModal({ onSetBahan });
    fireEvent.click(screen.getByText("Ceruti"));
    expect(onSetBahan).toHaveBeenCalledWith("Ceruti");
  });

  it("klik chip ukuran memanggil onSetUkuran", () => {
    const onSetUkuran = vi.fn();
    renderModal({ onSetUkuran });
    fireEvent.click(screen.getByText("Midi"));
    expect(onSetUkuran).toHaveBeenCalledWith("Midi");
  });

  it("menampilkan jumlah hasil", () => {
    renderModal({ resultCount: 5 });
    expect(screen.getByText("5 produk cocok")).toBeInTheDocument();
  });

  it("tombol Reset hanya muncul saat ada filter aktif", () => {
    const { rerender } = renderModal({ bahan: null, ukuran: null });
    expect(screen.queryByText("Reset")).toBeNull();

    rerender(
      <FilterModal
        open
        products={products}
        bahan="Ceruti"
        ukuran={null}
        resultCount={1}
        onSetBahan={vi.fn()}
        onSetUkuran={vi.fn()}
        onReset={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(screen.getByText("Reset")).toBeInTheDocument();
  });

  it("klik Reset memanggil onReset", () => {
    const onReset = vi.fn();
    renderModal({ bahan: "Ceruti", onReset });
    fireEvent.click(screen.getByText("Reset"));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("klik Terapkan / tombol tutup memanggil onClose", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByText("Terapkan"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Tutup filter" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("menampilkan pesan saat belum ada data filter (bahan & ukuran kosong)", () => {
    renderModal({ products: [] });
    expect(screen.getByText("BELUM ADA DATA FILTER")).toBeInTheDocument();
  });
});
