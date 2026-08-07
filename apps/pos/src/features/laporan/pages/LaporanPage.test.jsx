import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";

vi.mock("../../penjualan", () => ({
  useSalesReport: vi.fn(() => ({ sales: [], loading: false, reload: vi.fn() })),
  useCreateRetur: vi.fn(() => vi.fn().mockResolvedValue(1)),
  useDeleteSale: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
  useUpdateSale: vi.fn(() => vi.fn().mockResolvedValue(undefined)),
}));
vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock("@deera/shared/components/BackToTop", () => ({
  default: () => null,
}));
vi.mock("../components/FilterBar", () => ({
  default: ({ onFilter }) => (
    <div data-testid="filter-bar">
      <button onClick={() => onFilter("week")} data-testid="week-btn">7 Hari</button>
    </div>
  ),
}));
vi.mock("../components/SubTabDropdown", () => ({
  default: ({ setSubTab }) => (
    <div data-testid="subtab-dropdown">
      <button onClick={() => setSubTab("transaksi")} data-testid="transaksi-btn">Transaksi</button>
      <button onClick={() => setSubTab("keuangan")} data-testid="keuangan-btn">Keuangan</button>
    </div>
  ),
}));
vi.mock("../components/TabTransaksi", () => ({
  default: ({ onDelete, onRetur, onEdit, onBuyerClick }) => (
    <div data-testid="tab-transaksi">
      <button onClick={() => onDelete({ id: "s1" })} data-testid="del-btn">hapus</button>
      <button onClick={() => onRetur({ id: "s1" })} data-testid="retur-btn">retur</button>
      <button onClick={() => onEdit({ id: "s1" })} data-testid="edit-btn">edit</button>
      <button
        onClick={() => onBuyerClick({ id: "s2", buyer_name: "BUDI", buyer_hp: "081", pelanggan_id: "p1" })}
        data-testid="buyer-registered-btn"
      >
        buyer terdaftar
      </button>
      <button
        onClick={() => onBuyerClick({ id: "s3", buyer_name: "HJ MIMI TEGAL", buyer_hp: null, pelanggan_id: null })}
        data-testid="buyer-unregistered-btn"
      >
        buyer belum terdaftar
      </button>
    </div>
  ),
}));
vi.mock("../components/DetailModal", () => ({ default: () => null }));
vi.mock("../../pelanggan", () => ({
  PelangganRiwayatModal: ({ pelanggan, onClose }) => (
    <div data-testid="riwayat-modal">
      <span data-testid="riwayat-id">{pelanggan?.id ?? "none"}</span>
      <span data-testid="riwayat-nama">{pelanggan?.nama}</span>
      <button onClick={onClose} data-testid="close-riwayat">Tutup</button>
    </div>
  ),
}));
vi.mock("../components/ReturModal", () => ({
  default: ({ onConfirm, onClose }) => (
    <div data-testid="retur-modal">
      <button onClick={() => onConfirm([], 0)} data-testid="confirm-retur">Konfirmasi</button>
      <button onClick={onClose} data-testid="close-retur">Tutup</button>
    </div>
  ),
}));
vi.mock("../components/DeleteConfirm", () => ({
  default: ({ onConfirm, onClose }) => (
    <div data-testid="delete-confirm">
      <button onClick={onConfirm} data-testid="confirm-del">Hapus</button>
      <button onClick={onClose} data-testid="close-del">Batal</button>
    </div>
  ),
}));
vi.mock("../components/EditSaleModal", () => ({
  default: ({ onSave, onClose }) => (
    <div data-testid="edit-modal">
      <button onClick={() => onSave({ id: "s1" })} data-testid="save-edit">Simpan</button>
      <button onClick={onClose} data-testid="close-edit">Batal</button>
    </div>
  ),
}));
vi.mock("../../../shared/components/Struk", () => ({
  default: ({ onClose }) => (
    <div data-testid="struk"><button onClick={onClose}>Tutup</button></div>
  ),
}));
vi.mock("../components/LaporanRingkasan", () => ({
  default: () => <div data-testid="ringkasan" />,
}));
vi.mock("../components/LaporanKeuangan", () => ({
  default: () => <div data-testid="keuangan" />,
}));
vi.mock("../components/LaporanStok", () => ({
  default: () => <div data-testid="stok" />,
}));
vi.mock("../components/LaporanPembeli", () => ({
  default: () => <div data-testid="pembeli" />,
}));
vi.mock("../components/LaporanPasar", () => ({
  default: () => <div data-testid="pasar" />,
}));
vi.mock("../components/LaporanBep", () => ({
  default: () => <div data-testid="bep" />,
}));

import LaporanPage from "./LaporanPage";
import { useSalesReport, useDeleteSale, useCreateRetur, useUpdateSale } from "../../penjualan";
import { toast } from "@deera/shared/features/toast/hooks";

beforeEach(() => {
  vi.clearAllMocks();
  useSalesReport.mockReturnValue({ sales: [], loading: false, reload: vi.fn() });
  useDeleteSale.mockReturnValue(vi.fn().mockResolvedValue(undefined));
  useCreateRetur.mockReturnValue(vi.fn().mockResolvedValue(1));
  useUpdateSale.mockReturnValue(vi.fn().mockResolvedValue(undefined));
});

describe("LaporanPage", () => {
  it("renders FilterBar and SubTabDropdown", () => {
    render(<LaporanPage location="gudang" />);
    expect(screen.getByTestId("filter-bar")).toBeInTheDocument();
    expect(screen.getByTestId("subtab-dropdown")).toBeInTheDocument();
  });

  it("shows ringkasan tab by default", () => {
    render(<LaporanPage location="gudang" />);
    expect(screen.getByTestId("ringkasan")).toBeInTheDocument();
  });

  it("switches to transaksi tab", () => {
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("transaksi-btn"));
    expect(screen.getByTestId("tab-transaksi")).toBeInTheDocument();
  });

  it("switches to keuangan tab", () => {
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("keuangan-btn"));
    expect(screen.getByTestId("keuangan")).toBeInTheDocument();
  });

  it("opens delete confirm when onDelete called", () => {
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("transaksi-btn"));
    fireEvent.click(screen.getByTestId("del-btn"));
    expect(screen.getByTestId("delete-confirm")).toBeInTheDocument();
  });

  it("calls deleteSale and reloads on confirm delete", async () => {
    const mockDelete = vi.fn().mockResolvedValue(undefined);
    const mockReload = vi.fn();
    useDeleteSale.mockReturnValue(mockDelete);
    useSalesReport.mockReturnValue({ sales: [], loading: false, reload: mockReload });
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("transaksi-btn"));
    fireEvent.click(screen.getByTestId("del-btn"));
    await act(async () => { fireEvent.click(screen.getByTestId("confirm-del")); });
    expect(mockDelete).toHaveBeenCalled();
    expect(mockReload).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Transaksi dihapus.");
  });

  it("shows error toast when delete fails", async () => {
    useDeleteSale.mockReturnValue(vi.fn().mockRejectedValue(new Error("network")));
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("transaksi-btn"));
    fireEvent.click(screen.getByTestId("del-btn"));
    await act(async () => { fireEvent.click(screen.getByTestId("confirm-del")); });
    expect(toast.error).toHaveBeenCalledWith(expect.stringContaining("Gagal hapus"));
  });

  it("opens retur modal when onRetur called", () => {
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("transaksi-btn"));
    fireEvent.click(screen.getByTestId("retur-btn"));
    expect(screen.getByTestId("retur-modal")).toBeInTheDocument();
  });

  it("calls createRetur and reloads on confirm retur", async () => {
    const mockRetur = vi.fn().mockResolvedValue(1);
    const mockReload = vi.fn();
    useCreateRetur.mockReturnValue(mockRetur);
    useSalesReport.mockReturnValue({ sales: [], loading: false, reload: mockReload });
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("transaksi-btn"));
    fireEvent.click(screen.getByTestId("retur-btn"));
    await act(async () => { fireEvent.click(screen.getByTestId("confirm-retur")); });
    expect(mockRetur).toHaveBeenCalled();
    expect(mockReload).toHaveBeenCalled();
  });

  it("opens edit modal when onEdit called", () => {
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("transaksi-btn"));
    fireEvent.click(screen.getByTestId("edit-btn"));
    expect(screen.getByTestId("edit-modal")).toBeInTheDocument();
  });

  it("calls updateSale and reloads on save edit", async () => {
    const mockUpdate = vi.fn().mockResolvedValue(undefined);
    const mockReload = vi.fn();
    useUpdateSale.mockReturnValue(mockUpdate);
    useSalesReport.mockReturnValue({ sales: [], loading: false, reload: mockReload });
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("transaksi-btn"));
    fireEvent.click(screen.getByTestId("edit-btn"));
    await act(async () => { fireEvent.click(screen.getByTestId("save-edit")); });
    expect(mockUpdate).toHaveBeenCalled();
    expect(mockReload).toHaveBeenCalled();
  });

  it("opens riwayat modal with registered identity ({id,nama,no_hp}) when buyer has pelanggan_id", () => {
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("transaksi-btn"));
    fireEvent.click(screen.getByTestId("buyer-registered-btn"));
    expect(screen.getByTestId("riwayat-modal")).toBeInTheDocument();
    expect(screen.getByTestId("riwayat-id")).toHaveTextContent("p1");
    expect(screen.getByTestId("riwayat-nama")).toHaveTextContent("BUDI");
  });

  it("opens riwayat modal with name-only identity when buyer has no pelanggan_id", () => {
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("transaksi-btn"));
    fireEvent.click(screen.getByTestId("buyer-unregistered-btn"));
    expect(screen.getByTestId("riwayat-modal")).toBeInTheDocument();
    expect(screen.getByTestId("riwayat-id")).toHaveTextContent("none");
    expect(screen.getByTestId("riwayat-nama")).toHaveTextContent("HJ MIMI TEGAL");
  });

  it("closes riwayat modal on close", () => {
    render(<LaporanPage location="gudang" />);
    fireEvent.click(screen.getByTestId("transaksi-btn"));
    fireEvent.click(screen.getByTestId("buyer-registered-btn"));
    fireEvent.click(screen.getByTestId("close-riwayat"));
    expect(screen.queryByTestId("riwayat-modal")).not.toBeInTheDocument();
  });
});
