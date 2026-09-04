import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const salesState = { sales: [], loading: false };
vi.mock("../../penjualan", () => ({
  useSalesReport: vi.fn(() => salesState),
}));

let lastReturModalProps = null;
vi.mock("../../laporan", () => ({
  ReturModal: (props) => {
    lastReturModalProps = props;
    return (
      <div data-testid="retur-modal">
        <span>{props.sale.buyer_name}</span>
        <button onClick={() => props.onConfirm([{ kode: "D-01", size: "Midi", harga: 100000, qty: 1 }], 100000)}>
          ReturConfirm
        </button>
        <button onClick={props.onClose}>ReturClose</button>
      </div>
    );
  },
}));

const { default: TukarTambahModal } = await import("./TukarTambahModal");

function makeSale(overrides = {}) {
  return {
    id: "s1",
    type: "sale",
    buyer_name: "SITI",
    location: "gudang",
    total: 200000,
    created_at: "2026-09-01T10:00:00.000Z",
    items: [{ kode: "D-01", size: "Midi", harga: 200000, qty: 1 }],
    ...overrides,
  };
}

beforeEach(() => {
  salesState.sales = [];
  salesState.loading = false;
  lastReturModalProps = null;
});

describe("TukarTambahModal", () => {
  it("menampilkan pesan loading", () => {
    salesState.loading = true;
    render(<TukarTambahModal onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/memuat transaksi/i)).toBeInTheDocument();
  });

  it("menampilkan pesan kosong saat tidak ada transaksi", () => {
    render(<TukarTambahModal onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText(/tidak ada transaksi ditemukan/i)).toBeInTheDocument();
  });

  it("menampilkan daftar transaksi type=sale saja (retur di-exclude)", () => {
    salesState.sales = [makeSale({ id: "s1", buyer_name: "SITI" }), makeSale({ id: "s2", type: "retur", buyer_name: "BUDI" })];
    render(<TukarTambahModal onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText("SITI")).toBeInTheDocument();
    expect(screen.queryByText("BUDI")).not.toBeInTheDocument();
  });

  it("transaksi tanpa nama pembeli tetap tampil sbg 'Tanpa nama'", () => {
    salesState.sales = [makeSale({ buyer_name: null })];
    render(<TukarTambahModal onClose={vi.fn()} onConfirm={vi.fn()} />);
    expect(screen.getByText("Tanpa nama")).toBeInTheDocument();
  });

  it("search memfilter by nama pembeli", async () => {
    salesState.sales = [makeSale({ id: "s1", buyer_name: "SITI" }), makeSale({ id: "s2", buyer_name: "BUDI" })];
    render(<TukarTambahModal onClose={vi.fn()} onConfirm={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/cari nama pembeli/i), "SITI");
    expect(screen.getByText("SITI")).toBeInTheDocument();
    expect(screen.queryByText("BUDI")).not.toBeInTheDocument();
  });

  it("search memfilter by kode barang", async () => {
    salesState.sales = [
      makeSale({ id: "s1", buyer_name: "SITI", items: [{ kode: "D-01", size: "Midi", harga: 1, qty: 1 }] }),
      makeSale({ id: "s2", buyer_name: "BUDI", items: [{ kode: "D-99", size: "Midi", harga: 1, qty: 1 }] }),
    ];
    render(<TukarTambahModal onClose={vi.fn()} onConfirm={vi.fn()} />);
    await userEvent.type(screen.getByPlaceholderText(/cari nama pembeli/i), "D-99");
    expect(screen.getByText("BUDI")).toBeInTheDocument();
    expect(screen.queryByText("SITI")).not.toBeInTheDocument();
  });

  it("klik transaksi membuka ReturModal (langkah 2) dengan sale yang dipilih", async () => {
    salesState.sales = [makeSale({ buyer_name: "SITI" })];
    render(<TukarTambahModal onClose={vi.fn()} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByText("SITI"));
    expect(screen.getByTestId("retur-modal")).toBeInTheDocument();
    expect(lastReturModalProps.sale.buyer_name).toBe("SITI");
  });

  it("ReturClose kembali ke langkah 1 (daftar transaksi)", async () => {
    salesState.sales = [makeSale({ buyer_name: "SITI" })];
    render(<TukarTambahModal onClose={vi.fn()} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByText("SITI"));
    await userEvent.click(screen.getByText("ReturClose"));
    expect(screen.queryByTestId("retur-modal")).not.toBeInTheDocument();
    expect(screen.getByText("SITI")).toBeInTheDocument(); // balik ke daftar
  });

  it("ReturConfirm memanggil onConfirm dgn { originalSale, items, total }", async () => {
    const sale = makeSale({ buyer_name: "SITI" });
    salesState.sales = [sale];
    const onConfirm = vi.fn();
    render(<TukarTambahModal onClose={vi.fn()} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByText("SITI"));
    await userEvent.click(screen.getByText("ReturConfirm"));
    expect(onConfirm).toHaveBeenCalledWith({
      originalSale: sale,
      items: [{ kode: "D-01", size: "Midi", harga: 100000, qty: 1 }],
      total: 100000,
    });
  });

  it("klik tombol tutup memanggil onClose", async () => {
    const onClose = vi.fn();
    render(<TukarTambahModal onClose={onClose} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByLabelText("Tutup"));
    expect(onClose).toHaveBeenCalled();
  });

  it("klik backdrop memanggil onClose", async () => {
    const onClose = vi.fn();
    const { container } = render(<TukarTambahModal onClose={onClose} onConfirm={vi.fn()} />);
    await userEvent.click(container.querySelector(".absolute.inset-0"));
    expect(onClose).toHaveBeenCalled();
  });

  it("preset tanggal default 'week', bisa diganti ke 'today'/'month'", async () => {
    render(<TukarTambahModal onClose={vi.fn()} onConfirm={vi.fn()} />);
    await userEvent.click(screen.getByText("Hari Ini"));
    await userEvent.click(screen.getByText("30 Hari"));
    // Tidak crash & tetap menampilkan UI daftar — cukup smoke test preset switch.
    expect(screen.getByText(/tidak ada transaksi ditemukan/i)).toBeInTheDocument();
  });
});
