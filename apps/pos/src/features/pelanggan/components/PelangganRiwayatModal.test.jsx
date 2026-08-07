import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("../hooks", () => ({
  useSalesByPelanggan: vi.fn(),
  useSalesByBuyerName: vi.fn(() => ({ sales: [], loading: false, error: null, reload: vi.fn() })),
}));
vi.mock("../../penjualan", () => ({
  useCreateRetur: vi.fn(() => vi.fn().mockResolvedValue(1)),
}));
vi.mock("../../laporan", () => ({
  ReturModal: ({ onConfirm, onClose }) => (
    <div data-testid="retur-modal">
      <button onClick={() => onConfirm([{ kode: "D-01", qty: 1 }], 50000)} data-testid="confirm-retur">
        Konfirmasi
      </button>
      <button onClick={onClose} data-testid="close-retur">Tutup</button>
    </div>
  ),
}));
vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("../../../shared/components/Struk", () => ({
  default: ({ sale, onClose }) =>
    sale ? (
      <div data-testid="struk-modal">
        <button onClick={onClose} data-testid="close-struk">Tutup Struk</button>
      </div>
    ) : null,
}));

import { useSalesByPelanggan, useSalesByBuyerName } from "../hooks";
import { useCreateRetur } from "../../penjualan";
import { toast } from "@deera/shared/features/toast/hooks";
import PelangganRiwayatModal from "./PelangganRiwayatModal";

const pelanggan = { id: "p1", nama: "BUDI", no_hp: "081234" };

const sale1 = {
  id: "s1",
  date: "2026-08-01",
  created_at: "2026-08-01T10:00:00Z",
  type: "sale",
  location: "gudang",
  total: 150000,
  discount: 0,
  buyer_name: "BUDI",
  buyer_hp: "081234",
  created_by_name: "KASIR1",
  items: [{ kode: "D-07-OSK", size: "Midi", harga: 150000, hpp: 80000, qty: 1 }],
  stok_adjustments: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  useSalesByPelanggan.mockReturnValue({
    sales: [sale1],
    loading: false,
    error: null,
    reload: vi.fn(),
  });
});

describe("PelangganRiwayatModal", () => {
  it("shows loading state", () => {
    useSalesByPelanggan.mockReturnValue({ sales: [], loading: true, error: null, reload: vi.fn() });
    render(<PelangganRiwayatModal pelanggan={pelanggan} onClose={vi.fn()} />);
    expect(screen.getByText("Memuat riwayat...")).toBeInTheDocument();
  });

  it("shows error state", () => {
    useSalesByPelanggan.mockReturnValue({ sales: [], loading: false, error: new Error("fail"), reload: vi.fn() });
    render(<PelangganRiwayatModal pelanggan={pelanggan} onClose={vi.fn()} />);
    expect(screen.getByText(/Gagal memuat riwayat/)).toBeInTheDocument();
  });

  it("shows empty state when no sales", () => {
    useSalesByPelanggan.mockReturnValue({ sales: [], loading: false, error: null, reload: vi.fn() });
    render(<PelangganRiwayatModal pelanggan={pelanggan} onClose={vi.fn()} />);
    expect(screen.getByText(/Belum ada riwayat pembelian/)).toBeInTheDocument();
  });

  it("renders customer name and sale rows", () => {
    render(<PelangganRiwayatModal pelanggan={pelanggan} onClose={vi.fn()} />);
    expect(screen.getByText("BUDI")).toBeInTheDocument();
    expect(screen.getByText("D-07-OSK · Midi")).toBeInTheDocument();
  });

  it("does not show Retur button for a retur-type sale", () => {
    useSalesByPelanggan.mockReturnValue({
      sales: [{ ...sale1, type: "retur" }],
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<PelangganRiwayatModal pelanggan={pelanggan} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Retur" })).not.toBeInTheDocument();
    expect(screen.getByText("Lihat Struk")).toBeInTheDocument();
  });

  it("opens Struk modal on 'Lihat Struk' click", () => {
    render(<PelangganRiwayatModal pelanggan={pelanggan} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Lihat Struk"));
    expect(screen.getByTestId("struk-modal")).toBeInTheDocument();
  });

  it("opens ReturModal on 'Retur' click and confirms successfully", async () => {
    const reload = vi.fn();
    useSalesByPelanggan.mockReturnValue({ sales: [sale1], loading: false, error: null, reload });
    render(<PelangganRiwayatModal pelanggan={pelanggan} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("Retur"));
    expect(screen.getByTestId("retur-modal")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("confirm-retur"));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(reload).toHaveBeenCalled();
    expect(screen.queryByTestId("retur-modal")).not.toBeInTheDocument();
  });

  it("shows error toast when retur confirm fails", async () => {
    useCreateRetur.mockReturnValue(vi.fn().mockRejectedValue(new Error("stok gagal")));
    render(<PelangganRiwayatModal pelanggan={pelanggan} onClose={vi.fn()} />);

    fireEvent.click(screen.getByText("Retur"));
    fireEvent.click(screen.getByTestId("confirm-retur"));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("stok gagal")));
  });

  it("calls onClose when close button clicked", () => {
    const onClose = vi.fn();
    render(<PelangganRiwayatModal pelanggan={pelanggan} onClose={onClose} />);
    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalled();
  });
});

describe("PelangganRiwayatModal — buyer belum terdaftar (tanpa id)", () => {
  const buyer = { nama: "HJ MIMI TEGAL" };

  it("uses useSalesByBuyerName (not useSalesByPelanggan) when pelanggan has no id", () => {
    render(<PelangganRiwayatModal pelanggan={buyer} onClose={vi.fn()} />);
    expect(useSalesByBuyerName).toHaveBeenCalledWith("HJ MIMI TEGAL");
    expect(useSalesByPelanggan).toHaveBeenCalledWith(null);
  });

  it("shows a 'belum terdaftar' badge", () => {
    render(<PelangganRiwayatModal pelanggan={buyer} onClose={vi.fn()} />);
    expect(screen.getByText(/Belum terdaftar sebagai pelanggan/)).toBeInTheDocument();
  });

  it("does not show the badge for a registered pelanggan", () => {
    render(<PelangganRiwayatModal pelanggan={pelanggan} onClose={vi.fn()} />);
    expect(screen.queryByText(/Belum terdaftar sebagai pelanggan/)).not.toBeInTheDocument();
  });

  it("renders sales returned by useSalesByBuyerName", () => {
    useSalesByBuyerName.mockReturnValue({
      sales: [{ ...sale1, id: "s9", buyer_name: "HJ MIMI TEGAL" }],
      loading: false,
      error: null,
      reload: vi.fn(),
    });
    render(<PelangganRiwayatModal pelanggan={buyer} onClose={vi.fn()} />);
    expect(screen.getByText("HJ MIMI TEGAL")).toBeInTheDocument();
    expect(screen.getByText("D-07-OSK · Midi")).toBeInTheDocument();
  });
});
