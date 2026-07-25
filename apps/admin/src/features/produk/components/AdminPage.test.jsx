import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const navigateMock = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => navigateMock };
});

const useProductsMock = vi.fn();
const invalidateProductsMock = vi.fn();
vi.mock("@deera/shared/features/products/hooks", () => ({
  useProducts: (...a) => useProductsMock(...a),
  useInvalidateProducts: () => invalidateProductsMock,
}));

// Realtime channel mock — expose handler so tests can trigger it
const realtimeState = { handler: null };
const channelOnMock = vi.fn();
const channelSubscribeMock = vi.fn();
const channelObj = {
  on: (event, filter, callback) => {
    channelOnMock(event, filter, callback);
    realtimeState.handler = callback;
    return channelObj;
  },
  subscribe: (...a) => { channelSubscribeMock(...a); return channelObj; },
};
const channelMock = vi.fn(() => channelObj);
const removeChannelMock = vi.fn();
vi.mock("@deera/shared/lib/supabase", () => ({
  supabase: {
    channel: (...a) => channelMock(...a),
    removeChannel: (...a) => removeChannelMock(...a),
  },
}));

const signOutMock = vi.fn();
const authState = { user: null };
vi.mock("@deera/shared/features/auth/hooks", () => ({
  signOut: (...a) => signOutMock(...a),
  useAuth: () => authState,
}));

const themeState = { isDark: false, toggleTheme: vi.fn() };
vi.mock("@deera/shared/features/theme/hooks", () => ({
  useTheme: () => themeState,
}));

vi.mock("@deera/shared/components/ThemeToggle", () => ({
  default: ({ isDark, onToggle }) => (
    <button data-testid="theme-toggle" onClick={onToggle}>theme:{String(isDark)}</button>
  ),
}));

vi.mock("@deera/shared/components/BackToTop", () => ({
  default: () => <div data-testid="back-to-top" />,
}));

const generateWATextMock = vi.fn(() => "teks WA");
vi.mock("@deera/shared/lib/waFormat", () => ({
  generateWAText: (...a) => generateWATextMock(...a),
}));

const shareProductViaWAMock = vi.fn().mockResolvedValue(undefined);
vi.mock("../utils", () => ({
  shareProductViaWA: (...a) => shareProductViaWAMock(...a),
}));

vi.mock("@deera/shared/lib/marketDay", () => ({
  LOCATION_LABELS: { gudang: "Gudang", cideng: "Cideng", tegalgubug: "Tegalgubug" },
}));

vi.mock("@deera/shared/components/ToastContainer", () => ({
  default: () => <div data-testid="toast-container" />,
}));

const toastMock = { success: vi.fn(), error: vi.fn() };
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: toastMock }));

const logHistoryMock = vi.fn();
vi.mock("../../history/hooks", () => ({
  logHistory: (...a) => logHistoryMock(...a),
}));

const reloadStokMock = vi.fn();
const deleteProductCascadeMock = vi.fn();
vi.mock("../hooks", () => ({
  useStokMap: () => ({ stokMap: {}, reload: reloadStokMock }),
  useDeleteProductCascade: () => deleteProductCascadeMock,
  usePushNotification: vi.fn(),
}));

vi.mock("../../../shared/components/AdminBottomNav", () => ({
  default: () => <div data-testid="bottom-nav" />,
}));

vi.mock("../../../shared/components/AdminSidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));

vi.mock("./ProductCard", () => ({
  default: ({ product, stok, onTap, onCopyWA, isCopied }) => (
    <div data-testid={`card-${product.kode}`}>
      <span data-testid={`stok-${product.kode}`}>{JSON.stringify(stok)}</span>
      <button onClick={onTap}>tap-{product.kode}</button>
      <button onClick={onCopyWA}>copy-{product.kode}</button>
      {isCopied && <span>copied</span>}
    </div>
  ),
}));

vi.mock("./ProductDetailModal", () => ({
  default: ({ product, stok, onClose, onEdit }) => (
    <div data-testid="detail-modal">
      <span>detail-{product.kode}</span>
      <span data-testid="detail-stok">{JSON.stringify(stok)}</span>
      <button onClick={onClose}>close-detail</button>
      <button onClick={onEdit}>edit-{product.kode}</button>
    </div>
  ),
}));

vi.mock("./ProductForm", () => ({
  default: ({ product, onClose, onSaved, onDelete }) => (
    <div data-testid="product-form">
      <span>form-{product ? product.kode : "new"}</span>
      <button onClick={onClose}>close-form</button>
      <button onClick={() => onSaved("custom msg")}>save-form</button>
      <button onClick={() => onSaved()}>save-form-default</button>
      {onDelete && <button onClick={onDelete}>delete-from-form</button>}
    </div>
  ),
}));

const { default: AdminPage } = await import("./AdminPage");

const PRODUCTS = [
  { kode: "D-01-OSK", nama: "Gamis A", bahan: "Ceruti", created_at: "2026-01-01" },
  { kode: "D-02-OSK", nama: "Gamis B", bahan: "Katun", created_at: "2026-03-01" },
  { kode: "D-03-OSK", nama: "Mukena C", bahan: "Sutra", created_at: "2026-02-01" },
];

function renderPage() {
  return render(<MemoryRouter><AdminPage /></MemoryRouter>);
}

beforeEach(() => {
  navigateMock.mockReset();
  useProductsMock.mockReturnValue({ products: [], loading: false, error: null });
  invalidateProductsMock.mockReset();
  channelOnMock.mockReset();
  channelSubscribeMock.mockReset();
  channelMock.mockClear();
  removeChannelMock.mockReset();
  realtimeState.handler = null;
  signOutMock.mockReset();
  authState.user = null;
  themeState.isDark = false;
  themeState.toggleTheme = vi.fn();
  generateWATextMock.mockReset().mockReturnValue("teks WA");
  shareProductViaWAMock.mockReset().mockResolvedValue(undefined);
  toastMock.success.mockReset();
  toastMock.error.mockReset();
  logHistoryMock.mockReset();
  reloadStokMock.mockReset();
  deleteProductCascadeMock.mockReset();
});

afterEach(() => { vi.restoreAllMocks(); });

describe("AdminPage", () => {
  it("menampilkan 'Memuat produk...' saat loading=true", () => {
    useProductsMock.mockReturnValue({ products: undefined, loading: true, error: null });
    renderPage();
    expect(screen.getByText("Memuat produk...")).toBeInTheDocument();
  });

  it("menampilkan pesan error saat gagal load produk", () => {
    useProductsMock.mockReturnValue({ products: undefined, loading: false, error: new Error("fetch gagal") });
    renderPage();
    expect(screen.getByText("fetch gagal")).toBeInTheDocument();
  });

  it("menampilkan empty state saat products kosong", () => {
    useProductsMock.mockReturnValue({ products: [], loading: false, error: null });
    renderPage();
    expect(screen.getByText("Belum ada produk")).toBeInTheDocument();
  });

  it("menampilkan link ke /produksi/record pada empty state", () => {
    useProductsMock.mockReturnValue({ products: [], loading: false, error: null });
    renderPage();
    expect(screen.getByText("Tambah Produk Pertama").closest("a")).toHaveAttribute("href", "/produksi/record");
  });

  it("menampilkan produk terurut desc berdasarkan created_at & jumlah produk di header", () => {
    useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
    renderPage();
    expect(screen.getByText(/3 Produk/)).toBeInTheDocument();
    const cards = screen.getAllByTestId(/^card-/).map((el) => el.getAttribute("data-testid"));
    expect(cards).toEqual(["card-D-02-OSK", "card-D-03-OSK", "card-D-01-OSK"]);
  });

  it("menampilkan search input saat products.length > 0", () => {
    useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
    renderPage();
    expect(screen.getByPlaceholderText(/Cari kode, nama, bahan/)).toBeInTheDocument();
  });

  it("filter produk berdasarkan nama (case-insensitive)", () => {
    useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Cari kode, nama, bahan/), { target: { value: "katun" } });
    expect(screen.getByTestId("card-D-02-OSK")).toBeInTheDocument();
    expect(screen.queryByTestId("card-D-01-OSK")).toBeNull();
    expect(screen.getByText(/1 produk/)).toBeInTheDocument();
  });

  it("filter produk berdasarkan kode", () => {
    useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Cari kode, nama, bahan/), { target: { value: "D-03" } });
    expect(screen.getByTestId("card-D-03-OSK")).toBeInTheDocument();
    expect(screen.queryByTestId("card-D-01-OSK")).toBeNull();
  });

  it("menampilkan 'Tidak ada produk yang cocok' saat search tidak match", () => {
    useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Cari kode, nama, bahan/), { target: { value: "zzz" } });
    expect(screen.getByText("Tidak ada produk yang cocok")).toBeInTheDocument();
  });

  it("tidak menampilkan pesan hasil pencarian saat query kosong", () => {
    useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
    renderPage();
    expect(screen.queryByText(/produk ·/)).toBeNull();
  });

  it("produk tanpa nama/bahan tidak crash saat filter (fallback ke string kosong)", () => {
    const withNoNama = [...PRODUCTS, { kode: "D-04-OSK", created_at: "2026-04-01" }];
    useProductsMock.mockReturnValue({ products: withNoNama, loading: false, error: null });
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Cari kode, nama, bahan/), { target: { value: "D-04" } });
    expect(screen.getByTestId("card-D-04-OSK")).toBeInTheDocument();
  });

  it("produk tanpa created_at tidak crash di sort (fallback ke string kosong)", () => {
    const withNoDate = [{ kode: "D-05-OSK", nama: "X" }, ...PRODUCTS];
    useProductsMock.mockReturnValue({ products: withNoDate, loading: false, error: null });
    renderPage();
    // 4 kartu renderable tanpa crash
    expect(screen.getAllByTestId(/^card-/).length).toBe(4);
  });

  describe("displayName", () => {
    it("pakai full_name saat user.user_metadata.full_name tersedia", () => {
      authState.user = { email: "a@deera.id", user_metadata: { full_name: "Budi Santoso" } };
      useProductsMock.mockReturnValue({ products: [], loading: false, error: null });
      renderPage();
      expect(screen.getByText(/Budi Santoso/)).toBeInTheDocument();
    });

    it("fallback ke bagian email sebelum '@' saat tanpa full_name", () => {
      authState.user = { email: "kasir1@deera.id" };
      useProductsMock.mockReturnValue({ products: [], loading: false, error: null });
      renderPage();
      expect(screen.getByText(/kasir1/)).toBeInTheDocument();
    });

    it("fallback ke 'Admin' saat user null", () => {
      authState.user = null;
      useProductsMock.mockReturnValue({ products: [], loading: false, error: null });
      renderPage();
      expect(screen.getByText(/Admin/)).toBeInTheDocument();
    });
  });

  it("ThemeToggle terhubung ke isDark & toggleTheme", () => {
    themeState.isDark = true;
    renderPage();
    const btn = screen.getByTestId("theme-toggle");
    expect(btn.textContent).toContain("true");
    fireEvent.click(btn);
    expect(themeState.toggleTheme).toHaveBeenCalled();
  });

  it("klik Keluar memanggil signOut & navigate ke /login", async () => {
    signOutMock.mockResolvedValue(undefined);
    renderPage();
    fireEvent.click(screen.getByText("Keluar"));
    await waitFor(() => expect(navigateMock).toHaveBeenCalledWith("/login", { replace: true }));
    expect(signOutMock).toHaveBeenCalled();
  });

  it("subscribe ke channel realtime 'admin-transfer-notif' saat mount", () => {
    renderPage();
    expect(channelMock).toHaveBeenCalledWith("admin-transfer-notif");
    expect(channelOnMock).toHaveBeenCalledWith(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "transfers" },
      expect.any(Function)
    );
  });

  it("unmount memanggil removeChannel", () => {
    const { unmount } = renderPage();
    unmount();
    expect(removeChannelMock).toHaveBeenCalledWith(channelObj);
  });

  it("menampilkan notif transfer baru pending dari user lain", () => {
    authState.user = { email: "admin@deera.id" };
    renderPage();
    act(() => {
      realtimeState.handler({
        new: {
          status: "pending",
          created_by: "lain@deera.id",
          created_by_name: "Lain",
          from_location: "gudang",
          to_location: "cideng",
          items: [{ qty: 2 }, { qty: 3 }],
        },
      });
    });
    const notifTitle = screen.getByText("Transfer Baru");
    expect(notifTitle).toBeInTheDocument();
    expect(screen.getByText("Lain")).toBeInTheDocument();
    // Lokasi & pcs ada dalam satu <p> bersama dengan arrow/middot chars → toHaveTextContent
    const notifBox = notifTitle.closest("div");
    expect(notifBox).toHaveTextContent("Gudang");
    expect(notifBox).toHaveTextContent("Cideng");
    expect(notifBox).toHaveTextContent("5 pcs");
  });

  it("tidak menampilkan notif saat created_by === user.email (self)", () => {
    authState.user = { email: "admin@deera.id" };
    renderPage();
    act(() => {
      realtimeState.handler({ new: { status: "pending", created_by: "admin@deera.id" } });
    });
    expect(screen.queryByText("Transfer Baru")).toBeNull();
  });

  it("tidak menampilkan notif saat status bukan pending", () => {
    authState.user = { email: "admin@deera.id" };
    renderPage();
    act(() => {
      realtimeState.handler({ new: { status: "approved", created_by: "lain@deera.id" } });
    });
    expect(screen.queryByText("Transfer Baru")).toBeNull();
  });

  it("tombol X pada notif transfer menutup notif", () => {
    authState.user = { email: "admin@deera.id" };
    renderPage();
    act(() => {
      realtimeState.handler({ new: { status: "pending", created_by: "lain@deera.id", items: [] } });
    });
    fireEvent.click(screen.getByText("X"));
    expect(screen.queryByText("Transfer Baru")).toBeNull();
  });

  it("klik 'Lihat Transfer' menutup notif", () => {
    authState.user = { email: "admin@deera.id" };
    renderPage();
    act(() => {
      realtimeState.handler({ new: { status: "pending", created_by: "lain@deera.id", items: [] } });
    });
    fireEvent.click(screen.getByText("Lihat Transfer"));
    expect(screen.queryByText("Transfer Baru")).toBeNull();
  });

  it("auto-dismiss notif setelah 12 detik", () => {
    vi.useFakeTimers();
    authState.user = { email: "admin@deera.id" };
    renderPage();
    act(() => {
      realtimeState.handler({ new: { status: "pending", created_by: "lain@deera.id", items: [] } });
    });
    expect(screen.getByText("Transfer Baru")).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(12000); });
    expect(screen.queryByText("Transfer Baru")).toBeNull();
    vi.useRealTimers();
  });

  describe("ProductCard stok prop", () => {
    it("stok fallback ke default { gudang:0, cideng:0, tegalgubug:0 } saat kode tidak ada di stokMap", () => {
      // useStokMap dimock ke { stokMap: {} } — semua produk dapat fallback
      useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
      renderPage();
      const stokD02 = JSON.parse(screen.getByTestId("stok-D-02-OSK").textContent);
      expect(stokD02).toEqual({ gudang: 0, cideng: 0, tegalgubug: 0 });
    });
  });

  describe("tap ProductCard → detail modal → edit form", () => {
    it("tap ProductCard membuka ProductDetailModal", () => {
      useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
      renderPage();
      fireEvent.click(screen.getByText("tap-D-01-OSK"));
      expect(screen.getByTestId("detail-modal")).toBeInTheDocument();
      expect(screen.getByText("detail-D-01-OSK")).toBeInTheDocument();
    });

    it("close detail modal menutup modal", () => {
      useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
      renderPage();
      fireEvent.click(screen.getByText("tap-D-01-OSK"));
      fireEvent.click(screen.getByText("close-detail"));
      expect(screen.queryByTestId("detail-modal")).toBeNull();
    });

    it("edit dari detail modal membuka ProductForm dengan produk terkait", () => {
      useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
      renderPage();
      fireEvent.click(screen.getByText("tap-D-01-OSK"));
      fireEvent.click(screen.getByText("edit-D-01-OSK"));
      expect(screen.getByTestId("product-form")).toBeInTheDocument();
      expect(screen.getByText("form-D-01-OSK")).toBeInTheDocument();
    });

    it("close-form dari ProductForm menutup form", () => {
      useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
      renderPage();
      fireEvent.click(screen.getByText("tap-D-01-OSK"));
      fireEvent.click(screen.getByText("edit-D-01-OSK"));
      fireEvent.click(screen.getByText("close-form"));
      expect(screen.queryByTestId("product-form")).toBeNull();
    });

    it("detail modal stok fallback ke default saat tidak ada di stokMap", () => {
      useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
      renderPage();
      fireEvent.click(screen.getByText("tap-D-01-OSK"));
      const stok = JSON.parse(screen.getByTestId("detail-stok").textContent);
      // stokMap = {} → D-01-OSK tidak ada → fallback { gudang:0, cideng:0, tegalgubug:0 }
      expect(stok.gudang).toBe(0);
      expect(stok.cideng).toBe(0);
      expect(stok.tegalgubug).toBe(0);
    });
  });

  describe("onSaved dari ProductForm", () => {
    function openForm() {
      useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
      renderPage();
      fireEvent.click(screen.getByText("tap-D-01-OSK"));
      fireEvent.click(screen.getByText("edit-D-01-OSK"));
    }

    it("menutup form, invalidate, reload stok, & toast sukses (custom msg)", () => {
      openForm();
      fireEvent.click(screen.getByText("save-form"));
      expect(screen.queryByTestId("product-form")).toBeNull();
      expect(invalidateProductsMock).toHaveBeenCalled();
      expect(reloadStokMock).toHaveBeenCalled();
      expect(toastMock.success).toHaveBeenCalledWith("custom msg");
    });

    it("onSaved tanpa pesan → default toast", () => {
      openForm();
      fireEvent.click(screen.getByText("save-form-default"));
      expect(toastMock.success).toHaveBeenCalledWith("Produk berhasil disimpan.");
    });
  });

  describe("delete flow", () => {
    function openDeleteModal() {
      useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
      renderPage();
      fireEvent.click(screen.getByText("tap-D-01-OSK"));
      fireEvent.click(screen.getByText("edit-D-01-OSK"));
      fireEvent.click(screen.getByText("delete-from-form"));
    }

    it("delete-from-form membuka modal konfirmasi & menutup form", () => {
      openDeleteModal();
      expect(screen.queryByTestId("product-form")).toBeNull();
      const deleteTitle = screen.getByText("Hapus Produk");
      expect(deleteTitle).toBeInTheDocument();
      // Modal hapus berisi kode produk — pakai toHaveTextContent pada container
      // karena detail modal (jika masih di DOM) juga mengandung kode tsb.
      const deleteModal = deleteTitle.closest("div");
      expect(deleteModal).toHaveTextContent("D-01-OSK");
      expect(deleteModal).toHaveTextContent("Gamis A");
    });

    it("Batal pada modal hapus menutup modal tanpa delete", () => {
      openDeleteModal();
      fireEvent.click(screen.getByRole("button", { name: "Batal" }));
      expect(screen.queryByText("Hapus Produk")).toBeNull();
      expect(deleteProductCascadeMock).not.toHaveBeenCalled();
    });

    it("confirmDelete sukses: cascade, logHistory, invalidate, reload, toast, tutup modal", async () => {
      deleteProductCascadeMock.mockResolvedValue(undefined);
      logHistoryMock.mockResolvedValue(undefined);
      openDeleteModal();
      fireEvent.click(screen.getByRole("button", { name: "Hapus Semua" }));
      await waitFor(() => {
        expect(deleteProductCascadeMock).toHaveBeenCalledWith("D-01-OSK");
      });
      expect(logHistoryMock).toHaveBeenCalledWith(
        expect.objectContaining({ action: "hapus", category: "produk", kode: "D-01-OSK" })
      );
      expect(invalidateProductsMock).toHaveBeenCalled();
      expect(reloadStokMock).toHaveBeenCalled();
      expect(toastMock.success).toHaveBeenCalledWith("D-01-OSK berhasil dihapus.");
      expect(screen.queryByText("Hapus Produk")).toBeNull();
    });

    it("confirmDelete gagal: toast error & modal tetap terbuka", async () => {
      deleteProductCascadeMock.mockRejectedValue(new Error("network err"));
      openDeleteModal();
      fireEvent.click(screen.getByRole("button", { name: "Hapus Semua" }));
      await waitFor(() => {
        expect(toastMock.error).toHaveBeenCalledWith("Gagal hapus produk: network err");
      });
      expect(screen.getByText("Hapus Produk")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Hapus Semua" })).not.toBeDisabled();
    });
  });

  describe("handleShareWA", () => {
    it("memanggil shareProductViaWA & set copied state, clear setelah 3000ms", async () => {
      vi.useFakeTimers();
      useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
      renderPage();

      fireEvent.click(screen.getByText("copy-D-01-OSK"));
      // Flush microtasks so the async function begins
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      expect(shareProductViaWAMock).toHaveBeenCalledWith(
        expect.objectContaining({ kode: "D-01-OSK" })
      );
      expect(screen.getByTestId("card-D-01-OSK").textContent).toContain("copied");

      act(() => { vi.advanceTimersByTime(3000); });
      expect(screen.getByTestId("card-D-01-OSK").textContent).not.toContain("copied");

      vi.useRealTimers();
    });

    it("tidak crash saat shareProductViaWA melempar error", async () => {
      shareProductViaWAMock.mockRejectedValue(new Error("share error"));
      useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
      renderPage();

      fireEvent.click(screen.getByText("copy-D-01-OSK"));
      await act(async () => {
        await Promise.resolve();
        await Promise.resolve();
      });

      // Komponen tidak crash
      expect(screen.getByTestId("card-D-01-OSK")).toBeInTheDocument();
    });
  });

  // Redesign 2026-07: BackToTop SEBELUMNYA di-import tapi TIDAK PERNAH
  // dirender di halaman ini (bug nyata — mock "back-to-top" sudah ada
  // sejak lama tapi tidak ada test yang menegaskannya, jadi regresi lolos
  // tanpa terdeteksi). Test ini mengunci perilaku yang benar.
  it("renders BackToTop", () => {
    useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false, error: null });
    renderPage();
    expect(screen.getByTestId("back-to-top")).toBeInTheDocument();
  });
});
