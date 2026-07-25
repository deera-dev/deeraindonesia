import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SearchModal from "./SearchModal";

const products = [
  { kode: "D-07-OSK", nama: "Gamis Dewi", image: "gamis-dewi.jpg" },
  { kode: "D-08-SFN", nama: "Mukena Aisyah", image: "mukena-aisyah.jpg" },
];

function renderModal(props) {
  return render(
    <SearchModal
      open
      query=""
      products={products}
      soldOutSet={new Set()}
      onSetQuery={vi.fn()}
      onSelect={vi.fn()}
      onClose={vi.fn()}
      {...props}
    />
  );
}

describe("SearchModal", () => {
  it("tidak render apa pun saat open=false", () => {
    const { container } = render(
      <SearchModal
        open={false}
        query=""
        products={products}
        soldOutSet={new Set()}
        onSetQuery={vi.fn()}
        onSelect={vi.fn()}
        onClose={vi.fn()}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it("menampilkan pesan KETIK KODE ATAU NAMA saat query kosong", () => {
    renderModal({ query: "" });
    expect(screen.getByText("KETIK KODE ATAU NAMA PRODUK")).toBeInTheDocument();
  });

  it("menampilkan TIDAK DITEMUKAN saat query tidak cocok", () => {
    renderModal({ query: "zzz" });
    expect(screen.getByText("TIDAK DITEMUKAN")).toBeInTheDocument();
  });

  it("menampilkan hasil filter by kode", () => {
    renderModal({ query: "D-07" });
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
    expect(screen.queryByText("D-08-SFN")).toBeNull();
  });

  it("menampilkan hasil filter by nama", () => {
    renderModal({ query: "aisyah" });
    expect(screen.getByText("D-08-SFN")).toBeInTheDocument();
  });

  it("menandai SOLD OUT pada hasil yang ada di soldOutSet", () => {
    renderModal({ query: "gamis", soldOutSet: new Set(["D-07-OSK"]) });
    expect(screen.getByText("Sold out")).toBeInTheDocument();
  });

  it("mengetik di input memanggil onSetQuery", () => {
    const onSetQuery = vi.fn();
    renderModal({ onSetQuery });
    fireEvent.change(screen.getByPlaceholderText("Cari kode atau nama produk..."), {
      target: { value: "gamis" },
    });
    expect(onSetQuery).toHaveBeenCalledWith("gamis");
  });

  it("klik hasil memanggil onSelect dengan kode produk", () => {
    const onSelect = vi.fn();
    renderModal({ query: "D-07", onSelect });
    fireEvent.click(screen.getByText("D-07-OSK"));
    expect(onSelect).toHaveBeenCalledWith("D-07-OSK");
  });

  it("klik tombol tutup / overlay memanggil onClose", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    fireEvent.click(screen.getByRole("button", { name: "Tutup pencarian" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
