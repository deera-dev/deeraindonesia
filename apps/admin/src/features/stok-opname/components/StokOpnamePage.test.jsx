import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const useProductsMock = vi.fn();
vi.mock("@deera/shared/features/products/hooks", () => ({
  useProducts: (...a) => useProductsMock(...a),
}));

const toastMock = { success: vi.fn(), error: vi.fn() };
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: toastMock }));

vi.mock("@deera/shared/components/BackToTop", () => ({ default: () => null }));
vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => <div data-testid="bottom-nav" /> }));
vi.mock("../../../shared/components/AdminSidebar", () => ({ default: () => <div data-testid="sidebar" /> }));

const useStokWarnaAllMock = vi.fn();
const useJahitDikerjakanMock = vi.fn();
const useSaveStokOpnameMock = vi.fn();
const useStokOpnameDraftMock = vi.fn();
const hasPersistedDraftMock = vi.fn();
vi.mock("../hooks", () => ({
  useStokWarnaAll: (...a) => useStokWarnaAllMock(...a),
  useJahitDikerjakan: (...a) => useJahitDikerjakanMock(...a),
  useSaveStokOpname: (...a) => useSaveStokOpnameMock(...a),
  useStokOpnameDraft: (...a) => useStokOpnameDraftMock(...a),
  hasPersistedDraft: (...a) => hasPersistedDraftMock(...a),
}));

vi.mock("./GrandTotalStrip", () => ({
  default: ({ onToggleLocFilter }) => (
    <div data-testid="grand-total-strip">
      <button onClick={() => onToggleLocFilter("gudang")}>toggle-gudang</button>
    </div>
  ),
}));


vi.mock("./ProductOpnameCard", () => ({
  default: ({ product, rows, isOpen, onToggle, onChangeRow, locFilter, dikerjakanMap, inputMode }) => (
    <div
      data-testid={`card-${product.kode}`}
      data-locfilter={locFilter ?? ""}
      data-dikerjakanmap={JSON.stringify(dikerjakanMap ?? {})}
      data-rows={rows?.length ?? 0}
      data-inputmode={inputMode ?? ""}
    >
      <button onClick={() => onToggle(product.kode)}>toggle-{product.kode}</button>
      {isOpen && (
        <button onClick={() => onChangeRow({ id: "r1", kode: product.kode }, "gudang", "10")}>
          change-{product.kode}
        </button>
      )}
    </div>
  ),
}));

const { default: StokOpnamePage } = await import("./StokOpnamePage");

const PRODUCTS = [
  { kode: "D-02-OSK", nama: "Gamis B", created_at: "2026-01-01" },
  { kode: "D-01-OSK", nama: "Gamis A", created_at: "2026-03-01" },
];
const STOK_ROWS = [
  { id: "r1", kode: "D-01-OSK", size: "Midi", warna: "_", gudang: 5, cideng: 0, tegalgubug: 0 },
];

const saveFn = vi.fn();
const setValueFn = vi.fn();
const clearFn = vi.fn();

beforeEach(() => {
  useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false });
  useStokWarnaAllMock.mockReturnValue({ stokRows: STOK_ROWS, loading: false });
  useJahitDikerjakanMock.mockReturnValue({ rows: [], loading: false });
  useSaveStokOpnameMock.mockReturnValue(saveFn);
  useStokOpnameDraftMock.mockReturnValue({ changed: {}, setValue: setValueFn, clear: clearFn });
  hasPersistedDraftMock.mockReturnValue(false);
  saveFn.mockReset();
  setValueFn.mockReset();
  clearFn.mockReset();
  toastMock.success.mockReset();
  toastMock.error.mockReset();
});

function renderPage() {
  return render(<MemoryRouter><StokOpnamePage /></MemoryRouter>);
}

describe("StokOpnamePage", () => {
  it("menampilkan 'Memuat data...' saat loading", () => {
    useProductsMock.mockReturnValue({ products: [], loading: true });
    renderPage();
    expect(screen.getByText("Memuat data...")).toBeInTheDocument();
  });

  it("menampilkan kartu produk terurut sama seperti halaman Produk: terbaru dulu, lalu nama A-Z", () => {
    // D-01-OSK created_at 2026-03-01 (lebih baru) -> tampil duluan,
    // walau kodeNum-nya lebih kecil dari D-02-OSK (permintaan Denny 2026-08:
    // samakan urutan Stok Opname dgn halaman Produk).
    renderPage();
    const cards = screen.getAllByTestId(/^card-/);
    expect(cards[0]).toHaveAttribute("data-testid", "card-D-01-OSK");
    expect(cards[1]).toHaveAttribute("data-testid", "card-D-02-OSK");
  });

  it("filter pencarian berdasarkan kode produk", () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Cari kode atau nama/), { target: { value: "D-01" } });
    expect(screen.getByTestId("card-D-01-OSK")).toBeInTheDocument();
    expect(screen.queryByTestId("card-D-02-OSK")).toBeNull();
  });

  it("klik 'Hanya Perubahan' toggle filter changed-only", () => {
    useStokOpnameDraftMock.mockReturnValue({
      changed: { r1: { gudang: 10 } }, setValue: setValueFn, clear: clearFn,
    });
    renderPage();
    fireEvent.click(screen.getByText("Hanya Perubahan"));
    // Hanya D-01-OSK punya row r1 yang berubah
    expect(screen.getByTestId("card-D-01-OSK")).toBeInTheDocument();
    expect(screen.queryByTestId("card-D-02-OSK")).toBeNull();
  });

  it("klik 'Buka Semua' expand semua produk", () => {
    renderPage();
    fireEvent.click(screen.getByText("Buka Semua"));
    // Setelah expand, tombol 'change-' muncul di setiap card
    expect(screen.getByText("change-D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("change-D-02-OSK")).toBeInTheDocument();
  });

  it("klik 'Tutup Semua' collapse semua produk setelah buka", () => {
    renderPage();
    fireEvent.click(screen.getByText("Buka Semua"));
    fireEvent.click(screen.getByText("Tutup Semua"));
    expect(screen.queryByText("change-D-01-OSK")).toBeNull();
  });

  it("klik toggle kartu membuka/menutup accordion", () => {
    renderPage();
    fireEvent.click(screen.getByText("toggle-D-01-OSK"));
    expect(screen.getByText("change-D-01-OSK")).toBeInTheDocument();
    fireEvent.click(screen.getByText("toggle-D-01-OSK"));
    expect(screen.queryByText("change-D-01-OSK")).toBeNull();
  });

  it("tombol Simpan disabled saat tidak ada changed", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "Simpan" })).toBeDisabled();
  });

  it("tombol Simpan aktif & tampilkan count saat ada changed", () => {
    useStokOpnameDraftMock.mockReturnValue({
      changed: { r1: { gudang: 5 } }, setValue: setValueFn, clear: clearFn,
    });
    renderPage();
    expect(screen.getByRole("button", { name: /Simpan \(1\)/ })).not.toBeDisabled();
  });

  it("klik Batal memanggil clear() (tanpa save)", () => {
    useStokOpnameDraftMock.mockReturnValue({
      changed: { r1: { gudang: 5 } }, setValue: setValueFn, clear: clearFn,
    });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(clearFn).toHaveBeenCalled();
    expect(saveFn).not.toHaveBeenCalled();
  });

  it("handleSave sukses: clear, toast.success", async () => {
    useStokOpnameDraftMock.mockReturnValue({
      changed: { r1: { gudang: 10 } }, setValue: setValueFn, clear: clearFn,
    });
    saveFn.mockResolvedValue({ count: 1 });
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Simpan/ }));
    await waitFor(() => expect(toastMock.success).toHaveBeenCalledWith("1 baris stok berhasil diperbarui."));
    expect(clearFn).toHaveBeenCalled();
  });

  it("handleSave gagal: toast.error", async () => {
    useStokOpnameDraftMock.mockReturnValue({
      changed: { r1: { gudang: 10 } }, setValue: setValueFn, clear: clearFn,
    });
    saveFn.mockRejectedValue(new Error("db error"));
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Simpan/ }));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Gagal simpan: db error"));
  });

  it("menampilkan pesan draft dipulihkan saat hasPersistedDraft=true & ada changed", () => {
    hasPersistedDraftMock.mockReturnValue(true);
    useStokOpnameDraftMock.mockReturnValue({
      changed: { r1: { gudang: 5 } }, setValue: setValueFn, clear: clearFn,
    });
    renderPage();
    expect(screen.getByText(/Draft dipulihkan/)).toBeInTheDocument();
  });

  it("menampilkan pesan '✏ N baris diubah' saat hasPersistedDraft=false & ada changed", () => {
    hasPersistedDraftMock.mockReturnValue(false);
    useStokOpnameDraftMock.mockReturnValue({
      changed: { r1: { gudang: 5 } }, setValue: setValueFn, clear: clearFn,
    });
    renderPage();
    expect(screen.getByText(/1 baris diubah/)).toBeInTheDocument();
  });

  it("menampilkan GrandTotalStrip saat ada stokRows", () => {
    renderPage();
    expect(screen.getByTestId("grand-total-strip")).toBeInTheDocument();
  });

  it("tidak menampilkan GrandTotalStrip saat stokRows kosong", () => {
    useStokWarnaAllMock.mockReturnValue({ stokRows: [], loading: false });
    renderPage();
    expect(screen.queryByTestId("grand-total-strip")).toBeNull();
  });

  it("pesan 'Belum ada produk' saat products kosong", () => {
    useProductsMock.mockReturnValue({ products: [], loading: false });
    useStokWarnaAllMock.mockReturnValue({ stokRows: [], loading: false });
    renderPage();
    expect(screen.getByText("Belum ada produk")).toBeInTheDocument();
  });

  it("pesan 'Belum ada perubahan' saat changed kosong", () => {
    // beforeEach sudah set changed: {} (tidak ada perubahan)
    renderPage();
    expect(screen.getByText(/belum ada perubahan/i)).toBeInTheDocument();
  });

  describe("locFilter diteruskan ke ProductOpnameCard (mode fokus)", () => {
    it("locFilter null secara default: prop diteruskan sbg kosong ke tiap kartu", () => {
      renderPage();
      expect(screen.getByTestId("card-D-01-OSK")).toHaveAttribute("data-locfilter", "");
    });

    it("klik toggle lokasi di GrandTotalStrip meneruskan locFilter yang sama ke kartu produk", () => {
      renderPage();
      fireEvent.click(screen.getByText("toggle-gudang"));
      // Catatan: D-02-OSK tidak punya baris stok sama sekali di fixture ini,
      // jadi ikut TERSARING dari daftar (perilaku filter produk yang SUDAH
      // ADA sebelumnya, tidak diubah) — yang diverifikasi di sini murni
      // bagian BARU: prop locFilter diteruskan ke kartu yang MASIH tampil.
      expect(screen.getByTestId("card-D-01-OSK")).toHaveAttribute("data-locfilter", "gudang");
      expect(screen.queryByTestId("card-D-02-OSK")).toBeNull();
    });

    it("menampilkan pesan 'Mode fokus aktif' saat locFilter aktif", () => {
      renderPage();
      expect(screen.queryByText(/Mode fokus aktif/)).toBeNull();
      fireEvent.click(screen.getByText("toggle-gudang"));
      expect(screen.getByText(/Mode fokus aktif/)).toBeInTheDocument();
      expect(screen.getByText(/Gudang/)).toBeInTheDocument();
    });

    it("tidak menampilkan pesan 'Mode fokus aktif' saat locFilter tidak aktif", () => {
      renderPage();
      expect(screen.queryByText(/Mode fokus aktif/)).toBeNull();
    });
  });

  describe("dikerjakanMap diteruskan ke ProductOpnameCard (info 'sudah dikerjakan' Tim Jahit)", () => {
    it("dikerjakanMap kosong saat useJahitDikerjakan tidak punya rows", () => {
      renderPage();
      const card = screen.getByTestId("card-D-01-OSK");
      expect(JSON.parse(card.getAttribute("data-dikerjakanmap"))).toEqual({});
    });

    it("membangun dikerjakanMap dari rows useJahitDikerjakan, diindeks kode|size (semua warna digabung)", () => {
      useJahitDikerjakanMock.mockReturnValue({
        rows: [
          { kode: "D-01-OSK", size: "Midi", total_dikerjakan: 9 },
          { kode: "D-02-OSK", size: "Gamis", total_dikerjakan: 4 },
        ],
        loading: false,
      });
      renderPage();
      const card1 = screen.getByTestId("card-D-01-OSK");
      expect(JSON.parse(card1.getAttribute("data-dikerjakanmap"))).toMatchObject({
        "D-01-OSK|Midi": 9,
        "D-02-OSK|Gamis": 4,
      });
    });
  });

  // ── Cara input Total vs +/− (permintaan Denny 2026-09: "bikin 2 cara
  // untuk stok opname ... cara kedua adalah dengan menambah button + dan -
  // seperti yang ada di transfer stok") ─────────────────────────────────
  describe("toggle cara input (Total vs +/-)", () => {
    it("default inputMode='total', diteruskan ke ProductOpnameCard", () => {
      renderPage();
      expect(screen.getByTestId("card-D-01-OSK")).toHaveAttribute("data-inputmode", "total");
    });

    it("klik '+ / −' mengubah inputMode jadi 'delta' & diteruskan ke kartu", () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "+ / −" }));
      expect(screen.getByTestId("card-D-01-OSK")).toHaveAttribute("data-inputmode", "delta");
    });

    it("klik 'Input Total' setelah delta mengembalikan ke 'total'", () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: "+ / −" }));
      fireEvent.click(screen.getByRole("button", { name: "Input Total" }));
      expect(screen.getByTestId("card-D-01-OSK")).toHaveAttribute("data-inputmode", "total");
    });

    it("pesan 'Mode +/− aktif' hanya muncul saat inputMode='delta'", () => {
      renderPage();
      expect(screen.queryByText(/Mode \+\/− aktif/)).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "+ / −" }));
      expect(screen.getByText(/Mode \+\/− aktif/)).toBeInTheDocument();
    });
  });

  // ── fillMissingStokRows wiring (fix bug 2026-09, laporan Denny: "tidak
  // bisa menambahkan stok di produk tertentu ... belum ada data stok
  // untuk produk ini, padahal data warnanya sudah ada juga") ─────────────
  describe("sintesis baris placeholder utk produk yg belum tersinkron ke stok_warna", () => {
    it("produk dgn variants+warna tapi TANPA baris stok_warna nyata tetap dapat baris (placeholder)", () => {
      useProductsMock.mockReturnValue({
        products: [
          { kode: "D-33-POL", nama: "Polkadot", created_at: "2026-05-01", warna: ["HITAM"], variants: [{ size: "Midi" }] },
        ],
        loading: false,
      });
      useStokWarnaAllMock.mockReturnValue({ stokRows: [], loading: false });
      renderPage();
      // Sebelum fix: kartu ini akan dapat rows=0 ("Belum ada data stok").
      // Sesudah fix: 1 baris placeholder (1 ukuran x 1 warna) disisipkan.
      expect(screen.getByTestId("card-D-33-POL")).toHaveAttribute("data-rows", "1");
    });

    it("produk tanpa variants sama sekali tetap rows=0 (tidak ada yg bisa disintesis)", () => {
      useProductsMock.mockReturnValue({
        products: [{ kode: "D-40-XXX", nama: "Belum Ada Ukuran", created_at: "2026-05-01", warna: [], variants: [] }],
        loading: false,
      });
      useStokWarnaAllMock.mockReturnValue({ stokRows: [], loading: false });
      renderPage();
      expect(screen.getByTestId("card-D-40-XXX")).toHaveAttribute("data-rows", "0");
    });

    it("handleSave mengirim baris GABUNGAN (nyata + placeholder) ke saveStokOpname, bukan stokRows mentah", async () => {
      useProductsMock.mockReturnValue({
        products: [
          { kode: "D-33-POL", nama: "Polkadot", created_at: "2026-05-01", warna: ["HITAM"], variants: [{ size: "Midi" }] },
        ],
        loading: false,
      });
      useStokWarnaAllMock.mockReturnValue({ stokRows: [], loading: false });
      useStokOpnameDraftMock.mockReturnValue({
        changed: { "new__D-33-POL__Midi__HITAM": { gudang: 7 } },
        setValue: setValueFn,
        clear: clearFn,
      });
      saveFn.mockResolvedValue({ count: 1 });
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Simpan/ }));
      await waitFor(() => expect(saveFn).toHaveBeenCalled());
      const arg = saveFn.mock.calls[0][0];
      expect(arg.stokRows.some((r) => r.id === "new__D-33-POL__Midi__HITAM")).toBe(true);
    });
  });
});
