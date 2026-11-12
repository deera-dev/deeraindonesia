import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AllLocCountSheet from "./AllLocCountSheet";

const rows = [{ id: "r1", kode: "D-1", size: "Midi", warna: "KREM", gudang: 20, cideng: 2, tegalgubug: 2 }];
const product = { kode: "D-1", nama: "Gamis" };

describe("AllLocCountSheet", () => {
  it("simpan mengirim hanya lokasi yang berubah", async () => {
    const onSubmit = vi.fn().mockResolvedValue();
    const onCheck = vi.fn().mockResolvedValue({ over: [] });
    render(<AllLocCountSheet product={product} rows={rows} onClose={() => {}} onSubmit={onSubmit} onCheck={onCheck} />);
    expect(screen.getByText("Simpan")).toBeDisabled();
    fireEvent.change(screen.getByLabelText("KREM, Midi, Cideng"), { target: { value: "5" } });
    expect(screen.getByTestId("all-summary").textContent).toContain("Cideng +3");
    // BUG FIX (November 2026) — tombol Simpan ditahan ("Memeriksa…") sampai
    // hasil cek server utk perubahan TERBARU ini benar2 kembali, supaya
    // tidak bisa diklik dgn status "over" yang basi dari ketikan sebelumnya.
    await waitFor(() => expect(screen.getByText("Simpan")).not.toBeDisabled());
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ changed: { r1: { cideng: 5 } } }));
  });
});

describe("AllLocCountSheet - cegah race condition (November 2026)", () => {
  it("tombol Simpan 'Memeriksa…' & disabled selagi menunggu hasil cek server utk perubahan terbaru", async () => {
    let resolveCheck;
    const onCheck = vi.fn(() => new Promise((resolve) => { resolveCheck = resolve; }));
    render(<AllLocCountSheet product={product} rows={rows} onClose={() => {}} onSubmit={vi.fn()} onCheck={onCheck} />);

    fireEvent.change(screen.getByLabelText("KREM, Midi, Cideng"), { target: { value: "5" } });

    expect(screen.getByText("Memeriksa…")).toBeDisabled();

    resolveCheck({ over: [] });
    await waitFor(() => expect(screen.getByText("Simpan")).not.toBeDisabled());
  });
});

describe("AllLocCountSheet blokir", () => {
  it("menonaktifkan Simpan bila stok naik dan melebihi produksi", async () => {
    const onCheck = vi.fn().mockResolvedValue({ over: [{ size: "Midi", produced: 5, sold: 2, total_after: 9, excess: 6 }] });
    render(<AllLocCountSheet product={product} rows={rows} onClose={() => {}} onSubmit={vi.fn()} onCheck={onCheck} />);
    fireEvent.change(screen.getByLabelText("KREM, Midi, Cideng"), { target: { value: "5" } });
    await waitFor(() => expect(screen.getByTestId("all-blocked")).toBeInTheDocument());
    expect(screen.getByText("Simpan")).toBeDisabled();
  });
});

describe("AllLocCountSheet foto produk", () => {
  it("menampilkan placeholder kalau produk tidak ada foto", () => {
    render(<AllLocCountSheet product={product} rows={rows} onClose={() => {}} onSubmit={vi.fn()} onCheck={vi.fn()} />);
    expect(screen.queryByRole("img", { name: "D-1" })).not.toBeInTheDocument();
    expect(screen.getByText("Belum ada foto")).toBeInTheDocument();
  });

  it("menampilkan foto produk via cldUrl kalau product.image ada", () => {
    render(
      <AllLocCountSheet
        product={{ ...product, image: "https://res.cloudinary.com/demo/image/upload/foo.jpg" }}
        rows={rows}
        onClose={() => {}}
        onSubmit={vi.fn()}
        onCheck={vi.fn()}
      />,
    );
    expect(screen.getByRole("img", { name: "D-1" })).toHaveAttribute("src", expect.stringContaining("res.cloudinary.com"));
  });
});
