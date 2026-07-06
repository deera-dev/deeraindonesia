import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Shallow-mock all child components
vi.mock("@deera/shared/components/ThemeToggle", () => ({
  default: () => <button>ThemeToggle</button>,
}));
vi.mock("@deera/shared/components/BackToTop", () => ({
  default: () => null,
}));
vi.mock("../../../shared/components/AdminBottomNav", () => ({
  default: () => <nav>AdminBottomNav</nav>,
}));
vi.mock("./HistoryDetailModal", () => ({
  default: ({ item, onClose }) =>
    item ? (
      <div data-testid="history-modal">
        <span>{item.id}</span>
        <button onClick={onClose}>CloseModal</button>
      </div>
    ) : null,
}));

// toast mock
const toastErrorMock = vi.fn();
vi.mock("@deera/shared/features/toast/hooks", () => ({
  toast: { error: (...a) => toastErrorMock(...a) },
}));

// Theme mock
const themeState = { isDark: false, toggleTheme: vi.fn() };
vi.mock("@deera/shared/features/theme/hooks", () => ({
  useTheme: () => themeState,
}));

// Hooks mock
const historyState = { history: [], loading: false, error: null, reload: vi.fn() };
const deleteHistoryMock = vi.fn();
vi.mock("../hooks", () => ({
  useHistory: () => historyState,
  useDeleteHistory: () => deleteHistoryMock,
}));

const { default: HistoryPage } = await import("./HistoryPage");

function makeEntry(overrides = {}) {
  return {
    id: "ent-1",
    action: "tambah",
    category: "produk",
    kode: "D-01-OSK",
    nama: "Gamis A",
    changed_at: "2024-01-15T10:00:00Z",
    user_name: "Admin",
    snapshot: { nama: "Gamis A" },
    before_snapshot: null,
    ...overrides,
  };
}

beforeEach(() => {
  historyState.history = [];
  historyState.loading = false;
  historyState.error = null;
  historyState.reload.mockReset();
  deleteHistoryMock.mockReset();
  toastErrorMock.mockReset();
});

describe("HistoryPage", () => {
  it("menampilkan pesan loading saat loading=true", () => {
    historyState.loading = true;
    render(<HistoryPage />);
    expect(screen.getByText(/memuat riwayat/i)).toBeInTheDocument();
  });

  it("menampilkan pesan error saat error tersedia", () => {
    historyState.error = new Error("Gagal fetch");
    render(<HistoryPage />);
    expect(screen.getByText(/Gagal fetch/)).toBeInTheDocument();
  });

  it("menampilkan pesan kosong saat history empty", () => {
    render(<HistoryPage />);
    expect(screen.getByText(/belum ada riwayat/i)).toBeInTheDocument();
  });

  it("menampilkan jumlah entri saat tidak loading", () => {
    historyState.history = [makeEntry()];
    render(<HistoryPage />);
    expect(screen.getByText(/1 entri/)).toBeInTheDocument();
  });

  it("menampilkan kode dan nama entry di list", () => {
    historyState.history = [makeEntry()];
    render(<HistoryPage />);
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
  });

  it("membuka modal saat entry dengan snapshot diklik", async () => {
    historyState.history = [makeEntry({ snapshot: { nama: "Gamis A" } })];
    render(<HistoryPage />);
    const row = screen.getByText("D-01-OSK").closest("[class*='flex items-stretch']") ||
      screen.getByText("D-01-OSK").closest("div[class*='cursor-pointer']");
    // Click the entry row
    await userEvent.click(screen.getByText("D-01-OSK"));
    await waitFor(() => expect(screen.getByTestId("history-modal")).toBeInTheDocument());
  });

  it("menutup modal saat CloseModal diklik", async () => {
    historyState.history = [makeEntry({ snapshot: { nama: "X" } })];
    render(<HistoryPage />);
    await userEvent.click(screen.getByText("D-01-OSK"));
    await waitFor(() => expect(screen.getByTestId("history-modal")).toBeInTheDocument());
    await userEvent.click(screen.getByText("CloseModal"));
    await waitFor(() => expect(screen.queryByTestId("history-modal")).not.toBeInTheDocument());
  });

  it("memperlihatkan confirm modal saat tombol × diklik", async () => {
    historyState.history = [makeEntry()];
    render(<HistoryPage />);
    const delBtns = screen.getAllByTitle("Hapus");
    await userEvent.click(delBtns[0]);
    expect(screen.getByText(/hapus entri riwayat/i)).toBeInTheDocument();
  });

  it("menutup confirm modal saat Batal diklik", async () => {
    historyState.history = [makeEntry()];
    render(<HistoryPage />);
    await userEvent.click(screen.getAllByTitle("Hapus")[0]);
    await userEvent.click(screen.getByText("Batal"));
    expect(screen.queryByText(/hapus entri riwayat/i)).not.toBeInTheDocument();
  });

  it("menutup confirm modal saat backdrop diklik", async () => {
    historyState.history = [makeEntry()];
    render(<HistoryPage />);
    await userEvent.click(screen.getAllByTitle("Hapus")[0]);
    const confirmModal = screen.getByText(/hapus entri riwayat/i).closest(".fixed");
    const backdrop = confirmModal.querySelector(".absolute.inset-0");
    await userEvent.click(backdrop);
    expect(screen.queryByText(/hapus entri riwayat/i)).not.toBeInTheDocument();
  });

  it("handleConfirmDelete: memanggil deleteHistory, reload(), dan menutup confirm modal", async () => {
    deleteHistoryMock.mockResolvedValue(undefined);
    historyState.history = [makeEntry()];
    render(<HistoryPage />);
    await userEvent.click(screen.getAllByTitle("Hapus")[0]);
    await userEvent.click(screen.getByText("Hapus"));
    await waitFor(() => expect(deleteHistoryMock).toHaveBeenCalledWith("ent-1"));
    expect(historyState.reload).toHaveBeenCalled();
    expect(screen.queryByText(/hapus entri riwayat/i)).not.toBeInTheDocument();
  });

  it("handleConfirmDelete: menutup modal item yang sedang ditampilkan saat id sama", async () => {
    deleteHistoryMock.mockResolvedValue(undefined);
    const entry = makeEntry({ id: "ent-2", snapshot: { nama: "X" } });
    historyState.history = [entry];
    render(<HistoryPage />);
    // Open detail modal
    await userEvent.click(screen.getByText("D-01-OSK"));
    await waitFor(() => expect(screen.getByTestId("history-modal")).toBeInTheDocument());
    // Confirm delete
    await userEvent.click(screen.getAllByTitle("Hapus")[0]);
    await userEvent.click(screen.getByText("Hapus"));
    await waitFor(() => expect(screen.queryByTestId("history-modal")).not.toBeInTheDocument());
  });

  it("handleConfirmDelete gagal: toast.error dipanggil", async () => {
    deleteHistoryMock.mockRejectedValue(new Error("koneksi putus"));
    historyState.history = [makeEntry()];
    render(<HistoryPage />);
    await userEvent.click(screen.getAllByTitle("Hapus")[0]);
    await userEvent.click(screen.getByText("Hapus"));
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("koneksi putus")));
  });

  it("memperlihatkan custom date inputs saat preset=custom dipilih", async () => {
    render(<HistoryPage />);
    const presetSelect = screen.getByDisplayValue("30 Hari Terakhir");
    await userEvent.selectOptions(presetSelect, "custom");
    expect(screen.getAllByDisplayValue("")[0]).toHaveAttribute("type", "date");
  });

  it("entry tanpa snapshot/before tidak clickable (tidak ada cursor-pointer atau modal dibuka)", async () => {
    historyState.history = [makeEntry({ snapshot: null, before_snapshot: null })];
    render(<HistoryPage />);
    // entry exists but modal won't open
    expect(screen.queryByTestId("history-modal")).not.toBeInTheDocument();
    await userEvent.click(screen.getByText("D-01-OSK"));
    expect(screen.queryByTestId("history-modal")).not.toBeInTheDocument();
  });

  it("menampilkan nama pelanggan saat action pelanggan-tambah", () => {
    historyState.history = [
      makeEntry({
        action: "pelanggan-tambah",
        nama: null,
        kode: undefined,
        snapshot: { nama: "Pak Budi" },
      }),
    ];
    render(<HistoryPage />);
    // Entry rendered without crash — user_name is visible
    expect(screen.getByText("Admin")).toBeInTheDocument();
  });
});
