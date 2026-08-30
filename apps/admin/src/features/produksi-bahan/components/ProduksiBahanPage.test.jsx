import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("@deera/shared/features/auth/hooks", () => ({ useAuth: vi.fn() }));
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@deera/shared/features/theme/hooks", () => ({ useTheme: () => ({ isDark: false, toggleTheme: vi.fn() }) }));
vi.mock("@deera/shared/components/ThemeToggle", () => ({ default: () => null }));
vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => null }));
vi.mock("../../../shared/components/ProduksiLayout", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("../hooks", () => ({
  useBahanItems: vi.fn(),
  useSaveBahan: vi.fn(),
  useToggleLunas: vi.fn(),
  useDeleteBahan: vi.fn(),
  detectDupes: vi.fn(),
  useMergeDupes: vi.fn(),
}));
vi.mock("./BahanCard", () => ({
  default: ({ item, onEdit, onDelete, onToggleLunas, onSuratJalan, isPinjam }) => (
    <div data-testid="bahan-card">
      <span>{item.nama_bahan}</span>
      <button onClick={() => onEdit(item)}>Edit</button>
      <button onClick={() => onDelete(item)}>Delete</button>
      <button onClick={() => onToggleLunas(item)}>Toggle</button>
      {isPinjam && <button onClick={() => onSuratJalan(item)}>SJ</button>}
    </div>
  ),
}));
vi.mock("./StokPanel", () => ({ default: () => <div>StokPanel</div> }));
vi.mock("./Modal", () => ({
  default: ({ title, onClose, children }) => (
    <div data-testid="modal">
      <span>{title}</span>
      <button onClick={onClose}>CloseModal</button>
      {children}
    </div>
  ),
}));
vi.mock("./BahanForm", () => ({
  default: ({ onSave, onCancel }) => (
    <div>
      <button onClick={() => onSave({ nama_bahan: "Edit Result" })}>SaveForm</button>
      <button onClick={onCancel}>CancelForm</button>
    </div>
  ),
}));
vi.mock("./PembelianBulkForm", () => ({
  default: ({ onSave, onCancel }) => (
    <div>
      <button onClick={() => onSave([{ nama_bahan: "Wolfis Bulk" }])}>SaveBulk</button>
      <button onClick={onCancel}>CancelBulk</button>
    </div>
  ),
}));
vi.mock("./PinjamBulkForm", () => ({
  default: ({ onSave, onCancel }) => (
    <div>
      <button onClick={() => onSave([{ nama_bahan: "Sifon Bulk" }])}>SavePinjam</button>
      <button onClick={onCancel}>CancelPinjam</button>
    </div>
  ),
}));
vi.mock("./SuratJalanPinjamModal", () => ({
  default: ({ onClose }) => (
    <div data-testid="surat-jalan-modal">
      <button onClick={onClose}>CloseSJ</button>
    </div>
  ),
}));
vi.mock("./MergeDupeModal", () => ({
  default: ({ onClose }) => (
    <div data-testid="merge-modal">
      <button onClick={onClose}>CloseMerge</button>
    </div>
  ),
}));
vi.mock("./TagihanBulanPanel", () => ({
  default: ({ status }) => <div data-testid={`tagihan-panel-${status}`}>{status}</div>,
}));

import ProduksiBahanPage from "./ProduksiBahanPage";
import { useAuth } from "@deera/shared/features/auth/hooks";
import { toast } from "@deera/shared/features/toast/hooks";
import { useBahanItems, useSaveBahan, useToggleLunas, useDeleteBahan } from "../hooks";

const mockUser = { email: "admin@deera.id", user_metadata: { full_name: "Admin" } };

const pembelianItems = [
  { id: "1", nama_bahan: "Wolfis", kode_bahan: "WLF", status_bayar: "belum", total_harga: 50000, jumlah: 5, satuan: "yard" },
  { id: "2", nama_bahan: "Sifon",  kode_bahan: "SFN", status_bayar: "lunas", total_harga: 30000, jumlah: 3, satuan: "yard" },
];

let saveBahanFn, toggleLunasFn, deleteBahanFn;

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({ user: mockUser });
  saveBahanFn = vi.fn().mockResolvedValue(undefined);
  toggleLunasFn = vi.fn().mockResolvedValue(undefined);
  deleteBahanFn = vi.fn().mockResolvedValue(undefined);
  useBahanItems.mockReturnValue({ items: pembelianItems, loading: false });
  useSaveBahan.mockReturnValue(saveBahanFn);
  useToggleLunas.mockReturnValue(toggleLunasFn);
  useDeleteBahan.mockReturnValue(deleteBahanFn);
});

function renderPage() {
  return render(<MemoryRouter initialEntries={["/produksi/bahan"]}><ProduksiBahanPage /></MemoryRouter>);
}

describe("ProduksiBahanPage", () => {
  it("renders tab buttons", () => {
    renderPage();
    expect(screen.getByText("Pembelian")).toBeInTheDocument();
    expect(screen.getByText("Pinjam")).toBeInTheDocument();
    expect(screen.getByText("Stok Bahan")).toBeInTheDocument();
  });

  it("shows loading text while loading", () => {
    useBahanItems.mockReturnValue({ items: [], loading: true });
    renderPage();
    expect(screen.getByText("Memuat...")).toBeInTheDocument();
  });

  it("shows empty state when no items", () => {
    useBahanItems.mockReturnValue({ items: [], loading: false });
    renderPage();
    expect(screen.getByText(/Belum ada data/)).toBeInTheDocument();
  });

  it("renders BahanCard for each item", () => {
    renderPage();
    expect(screen.getAllByTestId("bahan-card")).toHaveLength(2);
  });

  it("shows 'Tidak ada data yang cocok' when filter hides all items", async () => {
    const user = userEvent.setup();
    renderPage();
    // Filter by status lunas
    await user.selectOptions(screen.getByRole("combobox"), "belum");
    expect(screen.getAllByTestId("bahan-card")).toHaveLength(1);
  });

  it("switches to Stok tab and shows StokPanel", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Stok Bahan"));
    expect(screen.getByText("StokPanel")).toBeInTheDocument();
  });

  it("opens Tambah form when + Tambah clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("+ Tambah"));
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByText("Tambah Pembelian Bahan")).toBeInTheDocument();
  });

  it("closes form when CloseModal clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("+ Tambah"));
    await user.click(screen.getByText("CloseModal"));
    expect(screen.queryByTestId("modal")).not.toBeInTheDocument();
  });

  it("calls saveBahan and shows toast on form save", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("+ Tambah"));
    await user.click(screen.getByText("SaveBulk"));
    await waitFor(() => expect(saveBahanFn).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it("opens edit form (BahanForm) when Edit clicked on card", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByText("Edit")[0]);
    expect(screen.getByTestId("modal")).toBeInTheDocument();
    expect(screen.getByText(/Edit Pembelian Bahan/)).toBeInTheDocument();
  });

  it("shows delete confirmation modal when Delete clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByText("Delete")[0]);
    expect(screen.getByText("Hapus Data")).toBeInTheDocument();
  });

  it("calls deleteBahan and toast on Hapus confirm", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByText("Delete")[0]);
    await user.click(screen.getByText("Hapus"));
    await waitFor(() => expect(deleteBahanFn).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalled();
  });

  it("cancels delete when Batal clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getAllByText("Delete")[0]);
    await user.click(screen.getByText("Batal"));
    expect(screen.queryByText("Hapus Data")).not.toBeInTheDocument();
  });

  it("opens MergeDupeModal when Gabung clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Gabung"));
    expect(screen.getByTestId("merge-modal")).toBeInTheDocument();
  });

  it("closes MergeDupeModal when CloseMerge clicked", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Gabung"));
    await user.click(screen.getByText("CloseMerge"));
    expect(screen.queryByTestId("merge-modal")).not.toBeInTheDocument();
  });

  it("shows Belum Lunas total when items have belum status", () => {
    renderPage();
    // item id=1 has total_harga=50000 and status_bayar=belum
    expect(screen.getAllByText(/Belum Lunas/).length).toBeGreaterThan(0);
    expect(screen.getByText(/50\.000/)).toBeInTheDocument();
  });

  it("switches to Pinjam tab and shows pinjam empty state", async () => {
    const user = userEvent.setup();
    useBahanItems.mockReturnValue({ items: [], loading: false });
    renderPage();
    await user.click(screen.getByText("Pinjam"));
    expect(screen.getByText(/Belum ada data bahan pinjam/)).toBeInTheDocument();
  });

  it("shows SuratJalanPinjamModal when SJ button clicked (pinjam tab)", async () => {
    const user = userEvent.setup();
    useBahanItems.mockReturnValue({
      items: [{ id: "3", nama_bahan: "Kain X", status_bayar: "belum", total_harga: 0, jumlah: 1, satuan: "yard", nama_pemberi: "A", tanggal: "2024-01-01" }],
      loading: false,
    });
    renderPage();
    await user.click(screen.getByText("Pinjam"));
    await user.click(screen.getByText("SJ"));
    expect(screen.getByTestId("surat-jalan-modal")).toBeInTheDocument();
  });

  it("closes SuratJalanPinjamModal when CloseSJ clicked", async () => {
    const user = userEvent.setup();
    useBahanItems.mockReturnValue({
      items: [{ id: "3", nama_bahan: "Kain X", status_bayar: "belum", total_harga: 0, jumlah: 1, satuan: "yard", nama_pemberi: "A", tanggal: "2024-01-01" }],
      loading: false,
    });
    renderPage();
    await user.click(screen.getByText("Pinjam"));
    await user.click(screen.getByText("SJ"));
    await user.click(screen.getByText("CloseSJ"));
    expect(screen.queryByTestId("surat-jalan-modal")).not.toBeInTheDocument();
  });

  it("searches items by name", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/Cari nama bahan/), "wolfis");
    expect(screen.getAllByTestId("bahan-card")).toHaveLength(1);
  });

  it("resets search when tab changed", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByPlaceholderText(/Cari nama bahan/), "wolfis");
    // switch to pinjam tab
    await user.click(screen.getByText("Pinjam"));
    expect(screen.getByPlaceholderText(/Cari nama bahan/).value).toBe("");
  });

  // ── TagihanBulanPanel wiring: belum + lunas, tab Pembelian & Pinjam ───────
  // (permintaan Denny 2026-08: "buat bahan pinjam juga belum ada sharenya
  // seperti di pembelian" + "bahan yang udh lunas, lihat tagihannya dimana
  // ya? ga ada tempat buat lihat tagihan sebelumnya, yang sudah lunas")

  it("renders both TagihanBulanPanel (belum + lunas) on tab Pembelian", () => {
    renderPage();
    expect(screen.getByTestId("tagihan-panel-belum")).toBeInTheDocument();
    expect(screen.getByTestId("tagihan-panel-lunas")).toBeInTheDocument();
  });

  it("renders both TagihanBulanPanel (belum + lunas) on tab Pinjam juga", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Pinjam"));
    expect(screen.getByTestId("tagihan-panel-belum")).toBeInTheDocument();
    expect(screen.getByTestId("tagihan-panel-lunas")).toBeInTheDocument();
  });

  it("tidak render TagihanBulanPanel di tab Stok", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText("Stok Bahan"));
    expect(screen.queryByTestId("tagihan-panel-belum")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tagihan-panel-lunas")).not.toBeInTheDocument();
  });
});
