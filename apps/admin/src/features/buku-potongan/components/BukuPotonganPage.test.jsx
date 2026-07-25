import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const useProductsMock = vi.fn();
vi.mock("@deera/shared/features/products/hooks", () => ({
  useProducts: (...a) => useProductsMock(...a),
}));

vi.mock("@deera/shared/components/BackToTop", () => ({ default: () => null }));

const toastMock = { success: vi.fn(), error: vi.fn() };
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: toastMock }));

vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => <div data-testid="bottom-nav" /> }));
vi.mock("../../../shared/components/AdminSidebar", () => ({ default: () => <div data-testid="sidebar" /> }));

const useBukuPotonganDataMock = vi.fn();
const useSaveExpectedStokMock = vi.fn();
vi.mock("../hooks", () => ({
  useBukuPotonganData: (...a) => useBukuPotonganDataMock(...a),
  useSaveExpectedStok: (...a) => useSaveExpectedStokMock(...a),
}));

vi.mock("./ProductBukuCard", () => ({
  default: ({ product, isOpen, onToggle, onChangeExpected }) => (
    <div data-testid={`card-${product.kode}`}>
      <button onClick={() => onToggle(product.kode)}>toggle-{product.kode}</button>
      {isOpen && (
        <button onClick={() => onChangeExpected(product.kode, "Midi", "_", "20")}>
          change-{product.kode}
        </button>
      )}
    </div>
  ),
}));

const { default: BukuPotonganPage } = await import("./BukuPotonganPage");

const PRODUCTS = [
  { kode: "D-02-OSK", nama: "Gamis B" },
  { kode: "D-01-OSK", nama: "Gamis A" },
];
const STOK_ROWS = [{ kode: "D-01-OSK", size: "Midi", warna: "_", gudang: 10, cideng: 0, tegalgubug: 0 }];
const EXPECTED_ROWS = [{ kode: "D-01-OSK", size: "Midi", warna: "_", expected_qty: 15 }];

const saveExpectedStokFn = vi.fn();
const reloadFn = vi.fn();

beforeEach(() => {
  useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false });
  useBukuPotonganDataMock.mockReturnValue({
    stokRows: STOK_ROWS, expectedRows: EXPECTED_ROWS, soldMap: {}, tableError: false,
    loading: false, reload: reloadFn,
  });
  useSaveExpectedStokMock.mockReturnValue({ saveExpectedStok: saveExpectedStokFn, saving: false });
  saveExpectedStokFn.mockReset();
  reloadFn.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

function renderPage() {
  return render(<MemoryRouter><BukuPotonganPage /></MemoryRouter>);
}

describe("BukuPotonganPage", () => {
  it("menampilkan 'Memuat data...' saat loading", () => {
    useBukuPotonganDataMock.mockReturnValue({ stokRows: [], expectedRows: [], soldMap: {}, tableError: false, loading: true, reload: vi.fn() });
    renderPage();
    expect(screen.getByText("Memuat data...")).toBeInTheDocument();
  });

  it("menampilkan pesan error tableError saat tabel belum ada", () => {
    useBukuPotonganDataMock.mockReturnValue({ stokRows: [], expectedRows: [], soldMap: {}, tableError: true, loading: false, reload: vi.fn() });
    renderPage();
    expect(screen.getByText(/expected_stok/)).toBeInTheDocument();
  });

  it("menampilkan legenda formula selisih yang benar (Sisa Stok + Terjual - Expected)", () => {
    renderPage();
    expect(screen.getByText(/Sisa Stok \+ Terjual.*Expected/)).toBeInTheDocument();
  });

  it("menampilkan daftar produk terurut desc by kodeNum", () => {
    renderPage();
    const cards = screen.getAllByTestId(/^card-/);
    expect(cards[0]).toHaveAttribute("data-testid", "card-D-02-OSK");
  });

  it("filter pencarian berdasarkan kode", () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Cari/), { target: { value: "D-01" } });
    expect(screen.getByTestId("card-D-01-OSK")).toBeInTheDocument();
    expect(screen.queryByTestId("card-D-02-OSK")).toBeNull();
  });

  it("klik 'Buka Semua' expand semua", () => {
    renderPage();
    fireEvent.click(screen.getByText("Buka Semua"));
    expect(screen.getByText("change-D-01-OSK")).toBeInTheDocument();
  });

  it("klik 'Tutup Semua' collapse semua", () => {
    renderPage();
    fireEvent.click(screen.getByText("Buka Semua"));
    fireEvent.click(screen.getByText("Tutup Semua"));
    expect(screen.queryByText("change-D-01-OSK")).toBeNull();
  });

  it("klik toggle kartu membuka/menutup accordion", () => {
    renderPage();
    fireEvent.click(screen.getByText("toggle-D-01-OSK"));
    expect(screen.getByText("change-D-01-OSK")).toBeInTheDocument();
  });

  it("tombol Simpan disabled saat tidak ada changed", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "Simpan" })).toBeDisabled();
  });

  it("onChangeExpected → changed count muncul di tombol Simpan", () => {
    renderPage();
    fireEvent.click(screen.getByText("toggle-D-01-OSK"));
    fireEvent.click(screen.getByText("change-D-01-OSK")); // changes D-01-OSK Midi _ to 20
    expect(screen.getByRole("button", { name: /Simpan \(1\)/ })).not.toBeDisabled();
  });

  it("handleSave sukses: toast.success, setChanged reset, reload dipanggil", async () => {
    saveExpectedStokFn.mockResolvedValue([]);
    renderPage();
    fireEvent.click(screen.getByText("toggle-D-01-OSK"));
    fireEvent.click(screen.getByText("change-D-01-OSK"));
    fireEvent.click(screen.getByRole("button", { name: /Simpan/ }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalled());
    expect(reloadFn).toHaveBeenCalled();
    // Setelah save, changed reset → Simpan kembali disabled
    expect(screen.getByRole("button", { name: "Simpan" })).toBeDisabled();
  });

  it("handleSave gagal: toast.error", async () => {
    saveExpectedStokFn.mockRejectedValue(new Error("network error"));
    renderPage();
    fireEvent.click(screen.getByText("toggle-D-01-OSK"));
    fireEvent.click(screen.getByText("change-D-01-OSK"));
    fireEvent.click(screen.getByRole("button", { name: /Simpan/ }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Gagal simpan: network error"));
  });

  it("Hanya Selisih toggle: hanya tampilkan produk dengan selisih (tanpa data terjual, stok tersisa != expected)", () => {
    // D-01: actual=10, expected=15, soldMap kosong -> accounted=10 != 15 -> ada selisih.
    // D-02 tidak ada di stok/expected -> accounted=0=expected -> tidak ada selisih.
    renderPage();
    fireEvent.click(screen.getByText("Hanya Selisih"));
    expect(screen.getByTestId("card-D-01-OSK")).toBeInTheDocument();
    expect(screen.queryByTestId("card-D-02-OSK")).toBeNull();
  });

  it("Hanya Selisih toggle: produk terjual+sisa sudah COCOK dengan expected TIDAK dianggap selisih (bugfix rekonsiliasi)", () => {
    // D-01: actual=10 (sisa), expected=15, TAPI sekarang ada soldMap terjual=5 bersih
    // -> accounted = 10 + 5 = 15 = expected -> selisih = 0 -> harus HILANG dari "Hanya Selisih".
    // Ini persis kasus yang dilaporkan Denny: sebelum fix, produk ini akan SELALU
    // muncul sbg "selisih" begitu ada penjualan, walau sebenarnya sudah sesuai.
    useBukuPotonganDataMock.mockReturnValue({
      stokRows: STOK_ROWS,
      expectedRows: EXPECTED_ROWS,
      soldMap: { "D-01-OSK": { Midi: { _: 5 } } },
      tableError: false,
      loading: false,
      reload: reloadFn,
    });
    renderPage();
    fireEvent.click(screen.getByText("Hanya Selisih"));
    expect(screen.queryByTestId("card-D-01-OSK")).toBeNull();
    expect(screen.queryByTestId("card-D-02-OSK")).toBeNull();
  });
});
