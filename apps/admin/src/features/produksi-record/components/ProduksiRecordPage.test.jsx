import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("../../../shared/components/ProduksiLayout", () => ({
  default: ({ children, title, headerAction }) => (
    <div>
      <h1>{title}</h1>
      {headerAction}
      {children}
    </div>
  ),
}));
vi.mock("@deera/shared/features/products/hooks", () => ({
  useInvalidateProducts: () => vi.fn(),
}));
vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockDeleteBatch = vi.fn();
const mockResyncBahanDipakai = vi.fn();
const mockOpenModal = vi.fn();
const mockCloseModal = vi.fn();
const mockSetDraft = vi.fn();
const mockApplyDraft = vi.fn();
const mockResetAll = vi.fn();
vi.mock("../hooks", () => ({
  useBatches: vi.fn(),
  useDeleteBatch: () => mockDeleteBatch,
  useResyncBahanDipakai: () => mockResyncBahanDipakai,
  fetchHppTemplate: vi.fn().mockResolvedValue(null),
  useBatchFilter: vi.fn(),
}));

const mockInvalidateStokBahan = vi.fn();
vi.mock("../../produksi-bahan/hooks", () => ({
  useInvalidateStokBahan: () => mockInvalidateStokBahan,
}));

vi.mock("./BatchCard", () => ({
  default: ({ batch, onEdit, onDelete, onSync }) => (
    <div data-testid="batch-card">
      <span>{batch.kode_produk}</span>
      <button onClick={() => onEdit(batch)}>Edit</button>
      <button onClick={() => onDelete(batch)}>Delete</button>
      <button onClick={() => onSync(batch)}>Sync</button>
    </div>
  ),
}));

vi.mock("./BatchForm", () => ({
  default: ({ onSave, onCancel }) => (
    <div>
      <span>BatchForm</span>
      <button onClick={onSave}>SaveBatch</button>
      <button onClick={onCancel}>CancelBatch</button>
    </div>
  ),
}));

vi.mock("./BatchFilterModal", () => ({
  default: ({ onApply, onReset, onClose, previewCount }) => (
    <div data-testid="batch-filter-modal">
      <span>Preview: {previewCount}</span>
      <button onClick={onApply}>ApplyFilter</button>
      <button onClick={onReset}>ResetFilter</button>
      <button onClick={onClose}>CloseFilter</button>
    </div>
  ),
}));

import ProduksiRecordPage from "./ProduksiRecordPage";
import { useBatches, useBatchFilter } from "../hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { DEFAULT_BATCH_FILTER } from "../store";

const fakeBatches = [
  { id: "b1", kode_produk: "D-07-OSK", nama_produk: "Gamis OSK", batch_no: "PROD-001" },
  { id: "b2", kode_produk: "D-82-SFN", nama_produk: "Gamis SFN", batch_no: "PROD-002" },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockDeleteBatch.mockResolvedValue(undefined);
  mockResyncBahanDipakai.mockResolvedValue([]);
  useBatches.mockReturnValue({ batches: fakeBatches, loading: false });
  useBatchFilter.mockReturnValue({
    applied: { ...DEFAULT_BATCH_FILTER },
    draft: { ...DEFAULT_BATCH_FILTER },
    isModalOpen: false,
    openModal: mockOpenModal,
    closeModal: mockCloseModal,
    setDraft: mockSetDraft,
    applyDraft: mockApplyDraft,
    resetAll: mockResetAll,
    hasActiveFilter: false,
  });
});

describe("ProduksiRecordPage", () => {
  it("renders page title", () => {
    render(<ProduksiRecordPage />);
    expect(screen.getByText("Catatan Produksi")).toBeInTheDocument();
  });

  it("shows BatchCard for each batch", () => {
    render(<ProduksiRecordPage />);
    expect(screen.getAllByTestId("batch-card")).toHaveLength(2);
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
  });

  it("shows loading state", () => {
    useBatches.mockReturnValue({ batches: [], loading: true });
    render(<ProduksiRecordPage />);
    expect(screen.getByText(/Memuat/)).toBeInTheDocument();
  });

  it("shows empty state when no batches", () => {
    useBatches.mockReturnValue({ batches: [], loading: false });
    render(<ProduksiRecordPage />);
    expect(screen.getByText(/Belum ada catatan produksi/)).toBeInTheDocument();
  });

  it("opens form modal on + Tambah Produk click", async () => {
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getByText("+ Produk Baru"));
    expect(screen.getByText("BatchForm")).toBeInTheDocument();
  });

  it("closes form modal on CancelBatch", async () => {
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getByText("+ Produk Baru"));
    await user.click(screen.getByText("CancelBatch"));
    expect(screen.queryByText("BatchForm")).not.toBeInTheDocument();
  });

  it("opens edit modal when Edit clicked on BatchCard", async () => {
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getAllByText("Edit")[0]);
    expect(screen.getByText("BatchForm")).toBeInTheDocument();
    expect(screen.getByText(/Edit Batch/)).toBeInTheDocument();
  });

  it("shows delete confirm modal when Delete clicked", async () => {
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getAllByText("Delete")[0]);
    expect(screen.getByText(/Hapus Batch & Produk/i)).toBeInTheDocument();
    expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
  });

  it("cancels delete modal on Batal", async () => {
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getAllByText("Delete")[0]);
    await user.click(screen.getByText("Batal"));
    expect(screen.queryByText(/Hapus Batch & Produk/i)).not.toBeInTheDocument();
  });

  it("confirms delete and calls deleteBatch", async () => {
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getAllByText("Delete")[0]);
    await user.click(screen.getByText("Hapus Semua"));
    await waitFor(() => expect(mockDeleteBatch).toHaveBeenCalledWith(fakeBatches[0]));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("invalidates Stok Bahan cache after delete succeeds", async () => {
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getAllByText("Delete")[0]);
    await user.click(screen.getByText("Hapus Semua"));
    await waitFor(() => expect(mockInvalidateStokBahan).toHaveBeenCalled());
  });

  it("does NOT invalidate Stok Bahan cache when delete fails", async () => {
    mockDeleteBatch.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getAllByText("Delete")[0]);
    await user.click(screen.getByText("Hapus Semua"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    expect(mockInvalidateStokBahan).not.toHaveBeenCalled();
  });

  it("calls resyncBahanDipakai + invalidates Stok Bahan + toasts on Sync click", async () => {
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getAllByText("Sync")[0]);
    await waitFor(() => expect(mockResyncBahanDipakai).toHaveBeenCalledWith(fakeBatches[0]));
    await waitFor(() => expect(mockInvalidateStokBahan).toHaveBeenCalled());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("invalidates Stok Bahan cache after add-batch save", async () => {
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getByText("+ Produk Baru"));
    await user.click(screen.getByText("SaveBatch"));
    await waitFor(() => expect(mockInvalidateStokBahan).toHaveBeenCalled());
  });

  it("shows toast.error on delete failure", async () => {
    mockDeleteBatch.mockRejectedValue(new Error("fail"));
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getAllByText("Delete")[0]);
    await user.click(screen.getByText("Hapus Semua"));
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("shows success toast after edit save", async () => {
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getAllByText("Edit")[0]);
    await user.click(screen.getByText("SaveBatch"));
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
  });

  it("invalidates Stok Bahan cache after edit save", async () => {
    const user = userEvent.setup();
    render(<ProduksiRecordPage />);
    await user.click(screen.getAllByText("Edit")[0]);
    await user.click(screen.getByText("SaveBatch"));
    await waitFor(() => expect(mockInvalidateStokBahan).toHaveBeenCalled());
  });

  describe("Search & Filter", () => {
    it("menampilkan search box dan tombol Filter saat ada batch", () => {
      render(<ProduksiRecordPage />);
      expect(
        screen.getByPlaceholderText("Cari kode, nama, bahan, no. batch, catatan..."),
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    });

    it("TIDAK menampilkan search box saat belum ada batch", () => {
      useBatches.mockReturnValue({ batches: [], loading: false });
      render(<ProduksiRecordPage />);
      expect(
        screen.queryByPlaceholderText("Cari kode, nama, bahan, no. batch, catatan..."),
      ).not.toBeInTheDocument();
    });

    it("mengetik di search box memfilter BatchCard yang tampil", async () => {
      const user = userEvent.setup();
      render(<ProduksiRecordPage />);
      await user.type(
        screen.getByPlaceholderText("Cari kode, nama, bahan, no. batch, catatan..."),
        "D-07",
      );
      expect(screen.getByText("D-07-OSK")).toBeInTheDocument();
      expect(screen.queryByText("D-82-SFN")).not.toBeInTheDocument();
    });

    it("search tanpa hasil menampilkan pesan 'tidak ada yang cocok'", async () => {
      const user = userEvent.setup();
      render(<ProduksiRecordPage />);
      await user.type(
        screen.getByPlaceholderText("Cari kode, nama, bahan, no. batch, catatan..."),
        "zzzz",
      );
      expect(screen.getByText(/Tidak ada catatan produksi yang cocok/)).toBeInTheDocument();
    });

    it("klik tombol Filter memanggil openModal", async () => {
      const user = userEvent.setup();
      render(<ProduksiRecordPage />);
      await user.click(screen.getByRole("button", { name: "Filter" }));
      expect(mockOpenModal).toHaveBeenCalled();
    });

    it("tombol Filter menampilkan badge count & 'Hapus Filter' saat hasActiveFilter true", () => {
      useBatchFilter.mockReturnValue({
        applied: { ...DEFAULT_BATCH_FILTER, bahanStatus: "belum" },
        draft: { ...DEFAULT_BATCH_FILTER },
        isModalOpen: false,
        openModal: mockOpenModal,
        closeModal: mockCloseModal,
        setDraft: mockSetDraft,
        applyDraft: mockApplyDraft,
        resetAll: mockResetAll,
        hasActiveFilter: true,
      });
      render(<ProduksiRecordPage />);
      expect(screen.getByText(/Filter \(\d+\)/)).toBeInTheDocument();
      expect(screen.getByText("Hapus Filter")).toBeInTheDocument();
    });

    it("klik 'Hapus Filter' memanggil resetAll", async () => {
      useBatchFilter.mockReturnValue({
        applied: { ...DEFAULT_BATCH_FILTER, bahanStatus: "belum" },
        draft: { ...DEFAULT_BATCH_FILTER },
        isModalOpen: false,
        openModal: mockOpenModal,
        closeModal: mockCloseModal,
        setDraft: mockSetDraft,
        applyDraft: mockApplyDraft,
        resetAll: mockResetAll,
        hasActiveFilter: true,
      });
      const user = userEvent.setup();
      render(<ProduksiRecordPage />);
      await user.click(screen.getByText("Hapus Filter"));
      expect(mockResetAll).toHaveBeenCalled();
    });

    it("menampilkan BatchFilterModal saat isModalOpen true", () => {
      useBatchFilter.mockReturnValue({
        applied: { ...DEFAULT_BATCH_FILTER },
        draft: { ...DEFAULT_BATCH_FILTER },
        isModalOpen: true,
        openModal: mockOpenModal,
        closeModal: mockCloseModal,
        setDraft: mockSetDraft,
        applyDraft: mockApplyDraft,
        resetAll: mockResetAll,
        hasActiveFilter: false,
      });
      render(<ProduksiRecordPage />);
      expect(screen.getByTestId("batch-filter-modal")).toBeInTheDocument();
    });

    it("TIDAK menampilkan BatchFilterModal saat isModalOpen false", () => {
      render(<ProduksiRecordPage />);
      expect(screen.queryByTestId("batch-filter-modal")).not.toBeInTheDocument();
    });
  });
});
