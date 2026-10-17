import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProductCountSheet from "./ProductCountSheet";

const product = { kode: "K", nama: "Gamis A" };
const rows = [
  { id: "a", kode: "K", size: "Midi", warna: "HITAM", gudang: 2, cideng: 0, tegalgubug: 0 },
  { id: "b", kode: "K", size: "Midi", warna: "MERAH", gudang: 1, cideng: 0, tegalgubug: 0 },
];

function setup(extra = {}) {
  const onSubmit = vi.fn().mockResolvedValue();
  const onClose = vi.fn();
  render(
    <ProductCountSheet product={product} rows={rows} loc="gudang" onSubmit={onSubmit} onClose={onClose} {...extra} />,
  );
  return { onSubmit, onClose };
}

describe("ProductCountSheet", () => {
  it("langkah isi → periksa → simpan mengirim perubahan khusus lokasi terpilih", async () => {
    const { onSubmit } = setup();
    expect(screen.getByText(/Langkah 1\/2/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("HITAM, ukuran Midi"), { target: { value: "5" } });
    fireEvent.click(screen.getByText("Periksa"));
    expect(screen.getByText(/Langkah 2\/2/)).toBeInTheDocument();
    expect(screen.getByTestId("diff-list")).toHaveTextContent("2 → 5");
    expect(screen.getByText(/\+3 pcs/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ changed: { a: { gudang: 5 } }, selisih: 3, next: false }),
    );
  });

  it("langkah periksa membandingkan total semua lokasi dengan buku potongan", () => {
    const buku = { rows: {}, sizes: {}, kodes: { K: { expected: 6, sold: 0, seharusnya: 6 } } };
    setup({ buku });
    fireEvent.change(screen.getByLabelText("HITAM, ukuran Midi"), { target: { value: "5" } });
    fireEvent.click(screen.getByText("Periksa"));
    expect(screen.getByTestId("buku-compare")).toHaveTextContent(/Cocok dengan buku potongan/);
  });

  it("tanpa perubahan: tetap bisa disimpan (tandai sudah dihitung)", async () => {
    const { onSubmit } = setup();
    fireEvent.click(screen.getByText("Periksa"));
    expect(screen.getByText(/Tidak ada perubahan/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ changed: {}, selisih: 0, next: false }));
  });

  it("Simpan & berikutnya hanya ada kalau ada produk berikutnya", async () => {
    const { onSubmit } = setup({ hasNext: true });
    fireEvent.click(screen.getByText("Periksa"));
    fireEvent.click(screen.getByText("Simpan & berikutnya"));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ next: true })));
  });

  it("tombol Periksa nonaktif kalau jumlah warna melebihi total", () => {
    setup();
    fireEvent.change(screen.getByLabelText("Total dihitung Midi"), { target: { value: "1" } });
    expect(screen.getByText("Periksa")).toBeDisabled();
  });

  it("menutup saat ada isian meminta konfirmasi (bukan window.confirm)", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByLabelText("Tutup"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("isian belum disimpan → konfirmasi Tutup tanpa simpan", () => {
    const { onClose } = setup();
    fireEvent.change(screen.getByLabelText("HITAM, ukuran Midi"), { target: { value: "9" } });
    fireEvent.click(screen.getByLabelText("Tutup"));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("belum disimpan");
    fireEvent.click(screen.getByText("Tutup tanpa simpan"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Enter pindah ke kolom berikutnya", () => {
    setup();
    const first = screen.getByLabelText("Total dihitung Midi");
    const second = screen.getByLabelText("HITAM, ukuran Midi");
    first.focus();
    fireEvent.keyDown(first, { key: "Enter" });
    expect(document.activeElement).toBe(second);
  });

  it("tombol − dan + mengubah angka per warna", () => {
    setup();
    const input = screen.getByLabelText("HITAM, ukuran Midi");
    fireEvent.change(input, { target: { value: "5" } });
    fireEvent.click(screen.getByLabelText("Tambah HITAM, ukuran Midi"));
    expect(input).toHaveValue(6);
    fireEvent.click(screen.getByLabelText("Kurangi HITAM, ukuran Midi"));
    fireEvent.click(screen.getByLabelText("Kurangi HITAM, ukuran Midi"));
    expect(input).toHaveValue(4);
  });

  it("tombol + pada kolom kosong mulai dari stok sekarang", () => {
    setup();
    const input = screen.getByLabelText("HITAM, ukuran Midi");
    expect(input).toHaveValue(null);
    fireEvent.click(screen.getByLabelText("Tambah HITAM, ukuran Midi"));
    expect(Number(input.value)).toBeGreaterThanOrEqual(1);
  });
});
