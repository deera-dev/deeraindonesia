import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const useProductsMock = vi.fn();
vi.mock("@deera/shared/features/products/hooks", () => ({ useProducts: (...a) => useProductsMock(...a) }));
const toastMock = { success: vi.fn(), error: vi.fn() };
vi.mock("@deera/shared/features/toast/hooks", () => ({ toast: toastMock }));
vi.mock("@deera/shared/components/BackToTop", () => ({ default: () => null }));
vi.mock("../../../shared/components/AdminBottomNav", () => ({ default: () => <div /> }));
vi.mock("../../../shared/components/AdminSidebar", () => ({ default: () => <div /> }));

const stokState = { stokRows: [], loading: false };
const bukuState = { map: {} };
const saveFn = vi.fn();
const session = {
  loc: null,
  counted: {},
  guideDismissed: true,
  setLoc: vi.fn(),
  markCounted: vi.fn(),
  resetCounted: vi.fn(),
  dismissGuide: vi.fn(),
  showGuide: vi.fn(),
};
vi.mock("../hooks", () => ({
  useStokWarnaAll: () => stokState,
  useJahitDikerjakan: () => ({ rows: [], loading: false }),
  useSaveStokOpname: () => saveFn,
  useStokOpnameSession: () => session,
  useBukuPotonganInfo: () => bukuState.map,
}));

const { default: StokOpnamePage } = await import("./StokOpnamePage");

const PRODUCTS = [
  { kode: "D-02-OSK", nama: "Gamis B", created_at: "2026-01-01", variants: [{ size: "Midi" }], warna: ["HITAM", "MERAH"] },
  { kode: "D-01-OSK", nama: "Gamis A", created_at: "2026-03-01", variants: [{ size: "Midi" }], warna: ["HITAM"] },
];
const STOK = [
  { id: "r1", kode: "D-01-OSK", size: "Midi", warna: "HITAM", gudang: 5, cideng: 0, tegalgubug: 0 },
  { id: "r2", kode: "D-02-OSK", size: "Midi", warna: "HITAM", gudang: 2, cideng: 0, tegalgubug: 0 },
  { id: "r3", kode: "D-02-OSK", size: "Midi", warna: "MERAH", gudang: 1, cideng: 0, tegalgubug: 0 },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <StokOpnamePage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  useProductsMock.mockReturnValue({ products: PRODUCTS, loading: false });
  stokState.stokRows = STOK;
  stokState.loading = false;
  Object.assign(session, { loc: null, counted: {}, guideDismissed: true });
  saveFn.mockResolvedValue({ count: 1 });
});

describe("StokOpnamePage (hitung per produk)", () => {
  it("tanpa lokasi: minta pilih lokasi dan tidak menampilkan daftar produk", () => {
    renderPage();
    expect(screen.getByText(/Pilih lokasi di atas dulu/)).toBeInTheDocument();
    expect(screen.queryByText("D-01-OSK")).not.toBeInTheDocument();
  });

  it("memilih lokasi memanggil setLoc", () => {
    renderPage();
    fireEvent.click(screen.getByText("Cideng"));
    expect(session.setLoc).toHaveBeenCalledWith("cideng");
  });

  it("dengan lokasi: daftar produk terbaru dulu, total di lokasi itu, status belum", () => {
    session.loc = "gudang";
    renderPage();
    const items = screen.getAllByRole("listitem");
    expect(items[0]).toHaveTextContent("D-01-OSK");
    expect(items[0]).toHaveTextContent("stok 5 pcs");
    expect(items[1]).toHaveTextContent("D-02-OSK");
    expect(items[1]).toHaveTextContent("stok 3 pcs");
    expect(items[0]).toHaveTextContent("Belum dihitung");
    expect(screen.getByText(/0\/2 produk dihitung/)).toBeInTheDocument();
  });

  it("status sudah / selisih dan filter", () => {
    session.loc = "gudang";
    session.counted = { gudang: { "D-01-OSK": { selisih: 0 }, "D-02-OSK": { selisih: -2 } } };
    renderPage();
    expect(screen.getByText("✓ Sudah dihitung")).toBeInTheDocument();
    expect(screen.getByText(/⚠ Selisih -2/)).toBeInTheDocument();
    fireEvent.click(screen.getByText("Selisih"));
    expect(screen.queryByText("D-01-OSK")).not.toBeInTheDocument();
    expect(screen.getByText("D-02-OSK")).toBeInTheDocument();
  });

  it("menampilkan info buku potongan per produk", () => {
    session.loc = "gudang";
    bukuState.map = { "D-01-OSK__Midi__HITAM": { expected: 12, sold: 5, seharusnya: 7 } };
    renderPage();
    expect(screen.getByText(/Buku potongan: seharusnya 7 pcs/)).toBeInTheDocument();
    bukuState.map = {};
  });

  it("pencarian kode", () => {
    session.loc = "gudang";
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Cari kode/), { target: { value: "D-02" } });
    expect(screen.queryByText("D-01-OSK")).not.toBeInTheDocument();
    expect(screen.getByText("D-02-OSK")).toBeInTheDocument();
  });

  it("produk baru tanpa stok tetap tampil di lokasi apa pun", () => {
    session.loc = "tegalgubug";
    renderPage();
    expect(screen.getByText("D-01-OSK")).toBeInTheDocument();
    expect(screen.getByText("D-02-OSK")).toBeInTheDocument();
  });

  it("tap produk → isi → periksa → simpan menyimpan & menandai sudah dihitung", async () => {
    session.loc = "gudang";
    renderPage();
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.change(screen.getByLabelText("HITAM, ukuran Midi"), { target: { value: "7" } });
    fireEvent.click(screen.getByText("Periksa"));
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() => expect(saveFn).toHaveBeenCalled());
    const arg = saveFn.mock.calls[0][0];
    expect(arg.changed).toEqual({ r1: { gudang: 7 } });
    expect(session.markCounted).toHaveBeenCalledWith("gudang", "D-01-OSK", 2);
    expect(toastMock.success).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText(/Langkah 2\/2/)).not.toBeInTheDocument());
  });

  it("tanpa perubahan: tidak memanggil simpan ke database, tetap menandai sudah", async () => {
    session.loc = "gudang";
    renderPage();
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.click(screen.getByText("Periksa"));
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() => expect(session.markCounted).toHaveBeenCalledWith("gudang", "D-01-OSK", 0));
    expect(saveFn).not.toHaveBeenCalled();
  });

  it("gagal simpan → toast error, produk tidak ditandai", async () => {
    session.loc = "gudang";
    saveFn.mockRejectedValue(new Error("boom"));
    renderPage();
    fireEvent.click(screen.getByText("D-01-OSK"));
    fireEvent.change(screen.getByLabelText("HITAM, ukuran Midi"), { target: { value: "7" } });
    fireEvent.click(screen.getByText("Periksa"));
    fireEvent.click(screen.getByText("Simpan"));
    await waitFor(() => expect(toastMock.error).toHaveBeenCalledWith("Gagal simpan: boom"));
    expect(session.markCounted).not.toHaveBeenCalled();
  });

  it("panduan tampil sampai ditutup; tombol Cara pakai memunculkannya lagi", () => {
    session.guideDismissed = false;
    const { unmount } = renderPage();
    fireEvent.click(screen.getByText("Mengerti, tutup"));
    expect(session.dismissGuide).toHaveBeenCalled();
    unmount();
    session.guideDismissed = true;
    renderPage();
    fireEvent.click(screen.getByText("Cara pakai"));
    expect(session.showGuide).toHaveBeenCalled();
  });

  it("Mulai sesi baru meminta konfirmasi lalu reset penanda lokasi itu", () => {
    session.loc = "gudang";
    session.counted = { gudang: { "D-01-OSK": { selisih: 0 } } };
    renderPage();
    fireEvent.click(screen.getByText("Mulai sesi baru"));
    fireEvent.click(within(screen.getByText(/Reset penanda/).parentElement).getByText("Ya"));
    expect(session.resetCounted).toHaveBeenCalledWith("gudang");
  });

  it("penanda belum masukin warna muncul di baris produk", () => {
    session.loc = "gudang";
    stokState.stokRows = [
      ...STOK,
      { id: "p9", kode: "D-02-OSK", size: "Midi", warna: "_", gudang: 4, cideng: 0, tegalgubug: 0 },
    ];
    renderPage();
    expect(screen.getByText("⚠ 4 pcs belum masukin warna")).toBeInTheDocument();
  });
});
